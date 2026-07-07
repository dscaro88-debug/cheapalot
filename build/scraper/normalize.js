/**
 * CheapALot — 数据归一化器
 * 将爬取的原始产品数据 → products.json 格式
 *
 * 如果有 OPENAI_API_KEY, 使用 GPT-4 自动翻译 EN/ES/AR
 * 否则用规则翻译(基础关键词映射)
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// 基础翻译映射表 (无 GPT-4 时的 fallback)
const BASE_TRANSLATIONS = {
  // Spanish
  es: {
    'per unit': 'por unidad',
    'per pallet': 'por paleta',
    'per set': 'por set',
    'pcs': 'piezas',
    'Pallet': 'Paleta',
    'in stock': 'en stock',
    'limited': 'limitado',
    'Mixed': 'Mixto',
    'Household': 'Hogar',
    'Apparel': 'Ropa',
    'Electrical': 'Eléctrico',
    'Toys': 'Juguetes',
    'Sports': 'Deportes',
    'Furniture': 'Muebles',
    'DIY': 'DIY',
    'per joblot': 'por lote',
  },
  // Arabic
  ar: {
    'per unit': 'للقطعة',
    'per pallet': 'للمنصة',
    'per set': 'للمجموعة',
    'pcs': 'قطعة',
    'Pallet': 'منصة',
    'in stock': 'متوفر',
    'limited': 'محدود',
    'Mixed': 'مختلط',
    'Household': 'منزلي',
    'Apparel': 'ملابس',
    'Electrical': 'كهربائيات',
    'Toys': 'ألعاب',
    'Sports': 'رياضة',
    'Furniture': 'أثاث',
    'DIY': 'ديكور',
    'per joblot': 'للدفعة',
  },
};

// 分类显示名映射
const CATEGORY_DISPLAY = {
  household: { en: 'Household', es: 'Hogar', ar: 'منزلي' },
  electrical: { en: 'Electrical', es: 'Eléctrico', ar: 'كهربائيات' },
  apparel: { en: 'Apparel', es: 'Ropa', ar: 'ملابس' },
  diy: { en: 'DIY & Auto', es: 'DIY y Auto', ar: 'ديكور وسيارات' },
  furniture: { en: 'Furniture', es: 'Muebles', ar: 'أثاث' },
  toys: { en: 'Toys & Nursery', es: 'Juguetes y Bebé', ar: 'ألعاب وطفولة' },
  sports: { en: 'Sports & Leisure', es: 'Deportes y Ocio', ar: 'رياضة وترفيه' },
  mixed: { en: 'Mixed Household', es: 'Hogar Mixto', ar: 'سلع منزلية مختلطة' },
};

// 标签自动分配规则
function determineTag(product) {
  const rrp = parseInt(product.rrp) || 0;
  if (rrp >= 80) return '70_off';
  if (rrp >= 60) return 'clearance';
  if (rrp >= 40) return 'hot';
  if (product.price > 0 && product.price < 1) return 'best_seller';
  return 'new';
}

// 价格显示格式
function formatPrice(price) {
  if (price >= 1000) {
    return '£' + price.toLocaleString('en-GB');
  }
  return '£' + price.toFixed(2);
}

// 简单翻译 (无 GPT-4 时)
function simpleTranslate(text, lang) {
  if (!text) return '';
  const map = BASE_TRANSLATIONS[lang];
  if (!map) return text;
  let result = text;
  for (const [en, translation] of Object.entries(map)) {
    result = result.replace(new RegExp(en, 'gi'), translation);
  }
  return result;
}

// GPT-4 翻译
async function gptTranslate(text, targetLang, apiKey) {
  if (!apiKey || !text) return simpleTranslate(text, targetLang);

  const langNames = { es: 'Spanish', ar: 'Arabic' };
  const langName = langNames[targetLang];
  if (!langName) return text;

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a product translator for a B2B wholesale website. Translate the following product title/description to ${langName}. Keep brand names, product codes, and numbers as-is. Return only the translation, nothing else.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 300,
  };

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      throw new Error(`GPT-4 HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const translation = data.choices?.[0]?.message?.content?.trim();
    return translation || simpleTranslate(text, targetLang);
  } catch (err) {
    throw new Error(`GPT-4 unavailable: ${err.message}`);
  }
}

/**
 * 将爬取的产品转换为 products.json 格式
 */
async function normalizeProducts(scrapedProducts, options = {}) {
  const apiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  const useGPT = !!(apiKey && apiKey.startsWith('sk-'));
  console.log(`\n[normalize] Converting ${scrapedProducts.length} products...`);
  console.log(`[normalize] Translation mode: ${useGPT ? 'GPT-4' : 'simple (no valid API key)'}`);

  let gptFailed = false; // 首次 GPT 失败后, 后续全部用简单翻译
  const normalized = [];

  for (let i = 0; i < scrapedProducts.length; i++) {
    const p = scrapedProducts[i];
    const tag = determineTag(p);
    const price = p.price || p.joblotPrice || 0;
    const priceDisplay = p.priceDisplay || formatPrice(price);
    const category = p.category || 'mixed';
    const categoryDisp = CATEGORY_DISPLAY[category] || CATEGORY_DISPLAY.mixed;

    // 确定价格单位和 MOQ
    let priceUnit = 'per unit';
    let moq = p.moq || '1 Pallet';
    if (p.joblotPrice > 0 && price === p.joblotPrice) {
      priceUnit = 'per joblot';
    }
    if (price >= 100) {
      priceUnit = 'per pallet';
    }

    // 图片路径
    const image = p.localImage || 'images/products/placeholder.jpg';

    // 翻译产品名
    let nameES = '', nameAR = '';
    if (useGPT && !gptFailed) {
      console.log(`  [translate] (${i + 1}/${scrapedProducts.length}) ${p.title.substring(0, 50)}...`);
      try {
        [nameES, nameAR] = await Promise.all([
          gptTranslate(p.title, 'es', apiKey),
          gptTranslate(p.title, 'ar', apiKey),
        ]);
      } catch (err) {
        console.log(`  [translate] GPT-4 unavailable, switching to simple mode for remaining products`);
        gptFailed = true;
        nameES = simpleTranslate(p.title, 'es');
        nameAR = simpleTranslate(p.title, 'ar');
      }
    } else {
      nameES = simpleTranslate(p.title, 'es');
      nameAR = simpleTranslate(p.title, 'ar');
    }

    const product = {
      id: p.id,
      image: image,
      tag: tag,
      category: category,
      price: price,
      price_display: priceDisplay,
      stock_status: 'in_stock',
      name: {
        en: p.title,
        es: nameES || p.title,
        ar: nameAR || p.title,
      },
      category_display: {
        en: categoryDisp.en,
        es: categoryDisp.es,
        ar: categoryDisp.ar,
      },
      price_unit: {
        en: priceUnit,
        es: simpleTranslate(priceUnit, 'es') || priceUnit,
        ar: simpleTranslate(priceUnit, 'ar') || priceUnit,
      },
      min_order: {
        en: moq,
        es: moq,
        ar: moq.replace(/pcs/i, 'قطعة'),
      },
      source: p.source || 'scraped',
      source_url: p.productUrl || '',
      original_price: p.priceDisplay || '',
      rrp_discount: p.rrp || '',
    };

    normalized.push(product);
  }

  console.log(`[normalize] Done. ${normalized.length} products ready for products.json`);
  return normalized;
}

module.exports = {
  normalizeProducts,
  formatPrice,
  determineTag,
  simpleTranslate,
  gptTranslate,
  CATEGORY_DISPLAY,
};
