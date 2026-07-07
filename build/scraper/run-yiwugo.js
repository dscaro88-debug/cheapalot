/**
 * 义乌购爬虫主控脚本
 * 
 * 流程:
 *   1. 爬取 yiwugo.com 产品 (Playwright)
 *   2. 下载产品图片
 *   3. 翻译产品名 (GPT-4 优先, 失败降级到关键词翻译)
 *   4. 人民币转英镑 (固定汇率 1 GBP = 9.3 CNY)
 *   5. 合并到 data/products.json (替换旧的英国爬虫数据)
 *   6. 构建三语 HTML
 *   7. 保存供应商资料到 ~/Desktop/cheapalot/
 *   8. (可选) git push 部署
 * 
 * 用法:
 *   NODE_PATH=... node build/scraper/run-yiwugo.js                    # 全量爬取
 *   NODE_PATH=... node build/scraper/run-yiwugo.js --max-pages=1      # 测试模式
 *   NODE_PATH=... node build/scraper/run-yiwugo.js --no-push          # 不推送
 *   NODE_PATH=... node build/scraper/run-yiwugo.js --categories=toys  # 只爬玩具
 */

const fs = require('fs');
const path = require('path');
const { scrapeYiwugo } = require('./yiwugo-scraper');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SUPPLIER_DIR = path.join(require('os').homedir(), 'Desktop', 'cheapalot');

// CNY → GBP 汇率 (固定, 可手动调整)
const CNY_TO_GBP = 0.1075; // 1 CNY ≈ £0.1075

// ===== 翻译模块 =====

// 关键词翻译表 (GPT-4 不可用时的降级方案)
const TRANSLATION_MAP = {
  '玩具': 'Toys', '减压': 'Stress Relief', '捏捏乐': 'Squishy', '慢回弹': 'Slow Rising',
  '仿真': 'Simulation', '挂件': 'Pendant', '批发': 'Wholesale', '饰品': 'Accessories',
  '首饰': 'Jewelry', '项链': 'Necklace', '手链': 'Bracelet', '耳环': 'Earrings',
  '戒指': 'Ring', '头饰': 'Hair Accessories', '发卡': 'Hair Clip', '发箍': 'Headband',
  '花': 'Flower', '仿真花': 'Artificial Flower', '花瓶': 'Vase',
  '喜庆': 'Festive', '圣诞': 'Christmas', '生日': 'Birthday', '派对': 'Party',
  '装饰': 'Decorative', '工艺品': 'Crafts', '相框': 'Photo Frame',
  '瓷器': 'Porcelain', '水晶': 'Crystal', '玻璃': 'Glass',
  '创意': 'Creative', '礼品': 'Gift', '促销': 'Promotional',
  '硅胶': 'Silicone', '塑料': 'Plastic', '不锈钢': 'Stainless Steel',
  '收纳': 'Storage', '厨房': 'Kitchen', '家居': 'Home', '日用品': 'Daily Use',
  '文具': 'Stationery', '笔': 'Pen', '笔记本': 'Notebook', '贴纸': 'Sticker',
  '手机壳': 'Phone Case', '充电器': 'Charger', '数据线': 'Cable',
  ' LED': ' LED', '灯': 'Light', '灯串': 'Light String',
  '毛绒': 'Plush', '布艺': 'Fabric', '皮革': 'Leather',
  '钥匙扣': 'Keychain', '冰箱贴': 'Fridge Magnet', '杯垫': 'Coaster',
  '打包': 'Packaging', '包装': 'Packaging', '袋子': 'Bag',
  '儿童': 'Kids', '婴儿': 'Baby', '益智': 'Educational',
  '户外': 'Outdoor', '运动': 'Sports', '水壶': 'Water Bottle',
  '杯子': 'Cup', '碗': 'Bowl', '盘子': 'Plate', '筷子': 'Chopsticks',
  '毛巾': 'Towel', '浴巾': 'Bath Towel', '枕套': 'Pillowcase',
  '雨伞': 'Umbrella', '遮阳': 'Sun Shade', '手套': 'Gloves',
  '口罩': 'Mask', '围裙': 'Apron', '袖套': 'Sleeves',
  '钟表': 'Clock', '闹钟': 'Alarm Clock', '沙漏': 'Hourglass',
  '香薰': 'Aromatherapy', '蜡烛': 'Candle', '干花': 'Dried Flower',
};

const ES_TRANSLATION_MAP = {
  '玩具': 'Juguetes', '饰品': 'Accesorios', '首饰': 'Joyería',
  '花': 'Flor', '装饰': 'Decorativo', '工艺品': 'Artesanía',
  '厨房': 'Cocina', '家居': 'Hogar', '文具': 'Papelería',
  '创意': 'Creativo', '礼品': 'Regalo', '批发': 'Mayorista',
};

const AR_TRANSLATION_MAP = {
  '玩具': 'ألعاب', '饰品': 'إكسسوارات', '首饰': 'مجوهرات',
  '花': 'زهور', '装饰': 'زخرفي', '工艺品': 'حرف يدوية',
  '厨房': 'مطبخ', '家居': 'منزل', '文具': 'قرطاسية',
  '创意': 'إبداعي', '礼品': 'هدية', '批发': 'جملة',
};

function simpleTranslate(text, targetLang) {
  const map = targetLang === 'es' ? ES_TRANSLATION_MAP : targetLang === 'ar' ? AR_TRANSLATION_MAP : TRANSLATION_MAP;
  let result = text;
  for (const [zh, en] of Object.entries(map)) {
    result = result.replace(new RegExp(zh, 'g'), en);
  }
  // If no translation happened, just prepend category
  if (result === text && targetLang === 'en') {
    result = 'Yiwu Wholesale Product - ' + text.substring(0, 30);
  }
  return result;
}

// Google 翻译 (免费, 无需 API Key)
async function googleTranslate(text, targetLang) {
  const https = require('https');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Google 返回嵌套数组, 翻译结果在 [0][i][0]
          const translation = parsed[0].map(item => item[0]).join('');
          resolve(translation || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.setTimeout(5000);
  });
}

async function gptTranslate(text, targetLang, apiKey) {
  if (!apiKey) return null;
  
  const https = require('https');
  const targetName = targetLang === 'es' ? 'Spanish' : targetLang === 'ar' ? 'Arabic' : 'English';
  
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `Translate the following Chinese product name to ${targetName}. Return ONLY the translation, no explanation. This is a product name for a B2B wholesale website.` },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 100,
  };
  
  try {
    const resp = await new Promise((resolve, reject) => {
      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ ok: res.ok, data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(JSON.stringify(body));
      req.end();
    });
    
    if (!resp.ok) return null;
    const parsed = JSON.parse(resp.data);
    return parsed.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ===== 数据归一化 =====

const CATEGORY_DISPLAY = {
  toys: { en: 'Toys & Hobbies', es: 'Juguetes', ar: 'ألعاب' },
  apparel: { en: 'Apparel & Accessories', es: 'Ropa y Accesorios', ar: 'ملابس وإكسسوارات' },
  household: { en: 'Household & Home', es: 'Hogar', ar: 'منزل' },
  mixed: { en: 'Mixed Lots', es: 'Lotes Mixtos', ar: 'مجموعات متنوعة' },
};

function determineTag(product) {
  if (product.sold > 200) return 'hot';
  if (product.priceLow > 0 && product.priceLow < 2) return 'deal';
  return 'new';
}

function formatPriceGBP(cnyLow, cnyHigh) {
  const gbpLow = (cnyLow * CNY_TO_GBP).toFixed(2);
  const gbpHigh = (cnyHigh * CNY_TO_GBP).toFixed(2);
  if (gbpLow === gbpHigh) return `GBP ${gbpLow}`;
  return `GBP ${gbpLow} - ${gbpHigh}`;
}

async function normalizeProducts(scrapedProducts, options = {}) {
  const apiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  let useGPT = !!apiKey;
  let gptFailed = false;
  
  console.log(`\n[normalize] 转换 ${scrapedProducts.length} 个产品...`);
  console.log(`[normalize] 翻译模式: ${useGPT ? 'GPT-4' : '关键词映射 (无API Key)'}`);
  
  const normalized = [];
  
  // 获取现有最大产品 ID
  const productsJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data/products.json'), 'utf8'));
  const existingIds = productsJson.products.map(p => parseInt((p.id || 'p0').replace('p', '')) || 0);
  let nextId = Math.max(...existingIds, 0) + 1;
  
  // 移除旧的英国爬虫产品 (source: yiwugo 之前的数据)
  const keptProducts = productsJson.products.filter(p => p.source !== 'yiwugo' && p.source !== 'wholesaleclearance');
  console.log(`[normalize] 保留 ${keptProducts.length} 个已有产品, 新增从 p${nextId} 开始`);
  
  for (let i = 0; i < scrapedProducts.length; i++) {
    const p = scrapedProducts[i];
    const tag = determineTag(p);
    const priceDisplay = formatPriceGBP(p.priceLow, p.priceHigh);
    const category = p.category || 'mixed';
    const categoryDisp = CATEGORY_DISPLAY[category] || CATEGORY_DISPLAY.mixed;
    
    // 翻译产品名 — 优先 Google 翻译, 其次 GPT-4, 最后关键词
    let nameEN = p.title;
    let nameES = p.title;
    let nameAR = p.title;
    
    // 尝试 Google 翻译 (免费, 无需 API Key)
    if (!gptFailed && !useGPT) {
      // GPT-4 不可用, 直接用 Google
      if (i % 10 === 0) console.log(`  [翻译] 使用 Google 翻译 (${i + 1}-${Math.min(i + 10, scrapedProducts.length)}/${scrapedProducts.length})`);
      const [en, es, ar] = await Promise.all([
        googleTranslate(p.title, 'en'),
        googleTranslate(p.title, 'es'),
        googleTranslate(p.title, 'ar'),
      ]);
      nameEN = en || simpleTranslate(p.title, 'en');
      nameES = es || simpleTranslate(p.title, 'es');
      nameAR = ar || simpleTranslate(p.title, 'ar');
    } else if (useGPT && !gptFailed) {
      console.log(`  [翻译] (${i + 1}/${scrapedProducts.length}) ${p.title.substring(0, 40)}...`);
      const [en, es, ar] = await Promise.all([
        gptTranslate(p.title, 'en', apiKey),
        gptTranslate(p.title, 'es', apiKey),
        gptTranslate(p.title, 'ar', apiKey),
      ]);
      
      if (en === null) {
        console.log(`  [翻译] GPT-4 不可用, 切换到 Google 翻译`);
        gptFailed = true;
        useGPT = false;
        // 立即用 Google 翻译这个产品
        const [gen, ges, gar] = await Promise.all([
          googleTranslate(p.title, 'en'),
          googleTranslate(p.title, 'es'),
          googleTranslate(p.title, 'ar'),
        ]);
        nameEN = gen || simpleTranslate(p.title, 'en');
        nameES = ges || simpleTranslate(p.title, 'es');
        nameAR = gar || simpleTranslate(p.title, 'ar');
      } else {
        nameEN = en || simpleTranslate(p.title, 'en');
        nameES = es || simpleTranslate(p.title, 'es');
        nameAR = ar || simpleTranslate(p.title, 'ar');
      }
    } else {
      nameEN = simpleTranslate(p.title, 'en');
      nameES = simpleTranslate(p.title, 'es');
      nameAR = simpleTranslate(p.title, 'ar');
    }
    
    const id = `p${nextId++}`;
    const image = p.localImage || 'images/products/placeholder.jpg';
    
    // 起订量展示
    const moqEN = `${p.moq} pcs`;
    const moqES = `${p.moq} piezas`;
    const moqAR = `${p.moq} قطعة`;
    
    normalized.push({
      id,
      name: { en: nameEN, es: nameES, ar: nameAR },
      price: parseFloat((p.priceLow * CNY_TO_GBP).toFixed(2)),
      price_display: priceDisplay,
      price_unit: {
        en: 'per unit',
        es: 'por unidad',
        ar: 'للقطعة',
      },
      original_price_cny: `${p.priceLow}${p.priceLow !== p.priceHigh ? '~' + p.priceHigh : ''} CNY`,      image,
      category,
      category_display: categoryDisp,
      min_order: { en: moqEN, es: moqES, ar: moqAR },
      stock_status: 'in_stock',
      tag,
      source: 'yiwugo',
      source_url: p.detailUrl,
      scraped_at: p.scrapedAt,
    });
  }
  
  // 合并产品
  productsJson.products = [...keptProducts, ...normalized];
  productsJson.meta = {
    total: productsJson.products.length,
    updated: new Date().toISOString(),
    currency: 'GBP',
    sources: ['manual', 'yiwugo'],
  };
  
  // 写入 products.json
  const jsonPath = path.join(PROJECT_ROOT, 'data/products.json');
  fs.writeFileSync(jsonPath, JSON.stringify(productsJson, null, 2), 'utf8');
  console.log(`[normalize] 已更新 data/products.json: ${productsJson.products.length} 个产品`);
  
  return { total: productsJson.products.length, added: normalized.length };
}

// ===== 保存供应商资料 =====

function saveSupplierInfo(suppliers) {
  // 先保存到项目目录 (沙盒内)
  const tmpDir = path.join(PROJECT_ROOT, 'tmp-supplier');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const date = new Date().toISOString().split('T')[0];
  const csvFilename = `供应商资料_${date}.csv`;
  const jsonFilename = `供应商资料_${date}.json`;
  const tmpCsvPath = path.join(tmpDir, csvFilename);
  const tmpJsonPath = path.join(tmpDir, jsonFilename);
  
  // CSV 格式
  let csv = '\uFEFF'; // BOM for Excel
  csv += '供应商名称,商铺主页,经营年限,商铺地址,产品类别,产品数量,采集日期\n';
  
  suppliers.forEach(s => {
    csv += `"${s.name}","${s.url}","${s.years}","${s.address}","${s.category}","${s.productsCount}","${date}"\n`;
  });
  
  fs.writeFileSync(tmpCsvPath, csv, 'utf8');
  fs.writeFileSync(tmpJsonPath, JSON.stringify(suppliers, null, 2), 'utf8');
  console.log(`\n[供应商资料] 临时保存到: ${tmpCsvPath}`);
  console.log(`  共 ${suppliers.length} 个供应商`);
  
  // 尝试复制到 Desktop/cheapalot/ (可能需要沙盒外权限)
  try {
    if (!fs.existsSync(SUPPLIER_DIR)) {
      fs.mkdirSync(SUPPLIER_DIR, { recursive: true });
    }
    const destCsv = path.join(SUPPLIER_DIR, csvFilename);
    const destJson = path.join(SUPPLIER_DIR, jsonFilename);
    fs.copyFileSync(tmpCsvPath, destCsv);
    fs.copyFileSync(tmpJsonPath, destJson);
    console.log(`  已复制到: ${destCsv}`);
  } catch (e) {
    console.log(`  沙盒限制: 无法直接写入 Desktop, 稍后用 bash 复制`);
    console.log(`  临时文件位置: ${tmpCsvPath}`);
  }
  
  return tmpCsvPath;
}

// ===== 构建并部署 =====

function buildAndDeploy(autoPush = false) {
  console.log('\n[build] 构建三语 HTML...');
  
  try {
    execSync('node build/build-products.js --products', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_PATH: path.join(require('os').homedir(), '.workbuddy/binaries/node/workspace/node_modules') },
    });
    console.log('[build] HTML 构建完成');
  } catch (err) {
    console.error('[build] 构建失败:', err.message);
    return false;
  }
  
  if (autoPush) {
    console.log('\n[deploy] git push...');
    try {
      execSync('git add -A && git commit -m "Yiwugo scraper: auto-update products" && git push origin main', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
      console.log('[deploy] 部署完成! Vercel 将在 1-2 分钟内更新');
    } catch (err) {
      console.error('[deploy] git push 失败:', err.message);
      console.log('[deploy] 请手动执行: git add -A && git commit -m "Yiwugo scraper update" && git push origin main');
    }
  }
  
  return true;
}

// ===== 主函数 =====

async function main() {
  const args = process.argv.slice(2);
  const noPush = args.includes('--no-push');
  const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 3;
  const catsArg = args.find(a => a.startsWith('--categories='));
  const filterCats = catsArg ? catsArg.split('=')[1].split(',') : null;
  
  console.log('========================================');
  console.log('  义乌购 (yiwugo.com) 爬虫');
  console.log('========================================');
  console.log(`  类别: ${filterCats ? filterCats.join(', ') : '全部'}`);
  console.log(`  每类最多页数: ${maxPages}`);
  console.log(`  自动部署: ${!noPush ? '是' : '否'}`);
  console.log(`  供应商资料保存到: ${SUPPLIER_DIR}`);
  console.log('========================================\n');
  
  // 1. 爬取
  const { products, suppliers } = await scrapeYiwugo({
    categories: filterCats,
    maxPages,
    downloadImages: true,
  });
  
  if (products.length === 0) {
    console.log('\n未爬取到任何产品，退出');
    return;
  }
  
  // 2. 保存供应商资料
  saveSupplierInfo(suppliers);
  
  // 3. 翻译并归一化
  await normalizeProducts(products, {
    openaiApiKey: process.env.OPENAI_API_KEY,
  });
  
  // 4. 构建并部署
  buildAndDeploy(!noPush);
  
  console.log('\n========================================');
  console.log('  全部完成!');
  console.log('========================================');
  console.log(`  产品数: ${products.length}`);
  console.log(`  供应商数: ${suppliers.length}`);
  console.log(`  供应商资料: ${SUPPLIER_DIR}/`);
  if (noPush) {
    console.log(`  部署: 需手动 git push`);
  }
  console.log('========================================\n');
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
