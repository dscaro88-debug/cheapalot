#!/usr/bin/env node
/**
 * AI Supplier Inventory Parser
 * 
 * Takes raw supplier text (WhatsApp message, email body, PDF text)
 * and uses GPT-4 to extract structured product data.
 * 
 * Usage:
 *   node build/ai-parse-supplier.js <input-file>
 *   node build/ai-parse-supplier.js --mock          # Generate mock data (no API call)
 *   cat supplier-msg.txt | node build/ai-parse-supplier.js
 * 
 * Output: JSON array of product objects to stdout
 */

const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an inventory parsing assistant for CheapALot.com, a B2B wholesale clearance platform based in Yiwu, China.

Your job: Parse raw supplier inventory messages and extract structured product data.

## Product Schema
Each product must have these fields:
- name: { en, es, ar } - Product name in English, Spanish, and Arabic
- category_display: { en, es, ar } - Category display name
- category: one of: household, electrical, apparel, diy, furniture, toys, sports, mixed
- price: number (in GBP, e.g. 0.18 for 18p)
- price_display: string (e.g. "\u00a30.18", "\u00a32.40", "\u00a3280")
- price_unit: { en, es, ar } - e.g. "per unit", "per pallet", "per carton"
- min_order: { en, es, ar } - Minimum order quantity (e.g. "500 pcs", "1 pallet")
- stock_status: one of: "in_stock", "limited", "sold_out"
- tag: one of: "best_seller", "new", "clearance", "seasonal", "hot", "70_off"
- image: leave as "PLACEHOLDER" (will be assigned later)

## Rules
1. Translate ALL product names and descriptions to en, es, and ar
2. Prices are in GBP (British Pounds)
3. If supplier mentions "per carton", calculate per-unit price if quantity per carton is given
4. Default min_order is "500 pcs" if not specified
5. Default stock_status is "in_stock" if not specified
6. Default tag is "new" if not specified
7. Categorize products into one of the 8 categories above
8. Generate SEO-friendly product names (include key features, quantity, material)
9. For Arabic translations, use Modern Standard Arabic

## Output Format
Return ONLY a JSON array of product objects. No markdown, no explanation.`;

function generateMockProducts() {
  return [
    {
      name: { en: "Stainless Steel Water Bottles 500ml (Bulk Pack)", es: "Botellas de Agua de Acero Inoxidable 500ml (Pack al Por Mayor)", ar: "زجاجات ماء من الستانلس ستيل 500مل (عبوة جملة)" },
      category_display: { en: "Household", es: "Hogar", ar: "منزلي" },
      category: "household", price: 0.85, price_display: "£0.85",
      price_unit: { en: "per unit", es: "por unidad", ar: "للقطعة" },
      min_order: { en: "500 pcs", es: "500 pcs", ar: "500 قطعة" },
      stock_status: "in_stock", tag: "new", image: "PLACEHOLDER"
    },
    {
      name: { en: "LED Strip Lights 5m RGB with Remote (Clearance)", es: "Tiras LED RGB 5m con Control Remoto (Liquidación)", ar: "أشرطة LED ملونة 5م مع جهاز تحكم (تخفيضات)" },
      category_display: { en: "Electrical", es: "Eléctrico", ar: "كهربائيات" },
      category: "electrical", price: 1.20, price_display: "£1.20",
      price_unit: { en: "per unit", es: "por unidad", ar: "للقطعة" },
      min_order: { en: "200 pcs", es: "200 pcs", ar: "200 قطعة" },
      stock_status: "limited", tag: "70_off", image: "PLACEHOLDER"
    },
    {
      name: { en: "Kids Educational Wooden Puzzle Set (24pc)", es: "Set de Rompecabezas de Madera Educativo para Niños (24pc)", ar: "مجموعة ألغاز خشبية تعليمية للأطفال (24 قطعة)" },
      category_display: { en: "Toys & Nursery", es: "Juguetes y Bebé", ar: "ألعاب وطفولة" },
      category: "toys", price: 0.65, price_display: "£0.65",
      price_unit: { en: "per unit", es: "por unidad", ar: "للقطعة" },
      min_order: { en: "300 pcs", es: "300 pcs", ar: "300 قطعة" },
      stock_status: "in_stock", tag: "best_seller", image: "PLACEHOLDER"
    }
  ];
}

async function parseWithGPT4(rawText) {
  if (!OPENAI_API_KEY) {
    console.error('⚠️  OPENAI_API_KEY not set. Using mock data instead.');
    return generateMockProducts();
  }

  const { OpenAI } = require('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'Parse this supplier inventory message and return a JSON array of products:\n\n' + rawText }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  const content = response.choices[0].message.content;
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse GPT-4 response as JSON array');
}

function validateProduct(product) {
  const errors = [];
  const validCategories = ['household', 'electrical', 'apparel', 'diy', 'furniture', 'toys', 'sports', 'mixed'];
  const validTags = ['best_seller', 'new', 'clearance', 'seasonal', 'hot', '70_off'];
  const validStatus = ['in_stock', 'limited', 'sold_out'];

  if (!product.name || !product.name.en) errors.push('Missing name.en');
  if (!product.name || !product.name.es) errors.push('Missing name.es');
  if (!product.name || !product.name.ar) errors.push('Missing name.ar');
  if (!product.category || !validCategories.includes(product.category)) errors.push('Invalid category: ' + product.category);
  if (typeof product.price !== 'number' || product.price < 0) errors.push('Invalid price: ' + product.price);
  if (!product.price_display) errors.push('Missing price_display');
  if (product.tag && !validTags.includes(product.tag)) errors.push('Invalid tag: ' + product.tag);
  if (product.stock_status && !validStatus.includes(product.stock_status)) errors.push('Invalid stock_status: ' + product.stock_status);
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');

  if (useMock) {
    console.error('📋 Using mock data (no API call)');
    const products = generateMockProducts();
    products.forEach((p, i) => {
      const errors = validateProduct(p);
      if (errors.length) console.error('  ⚠️ Product ' + (i+1) + ': ' + errors.join(', '));
    });
    console.log(JSON.stringify(products, null, 2));
    return;
  }

  const inputFile = args.find(a => !a.startsWith('--'));
  let rawText = '';
  if (inputFile) {
    rawText = fs.readFileSync(path.resolve(inputFile), 'utf8');
  } else {
    rawText = fs.readFileSync('/dev/stdin', 'utf8');
  }

  if (!rawText.trim()) {
    console.error('❌ No input provided. Usage: node ai-parse-supplier.js <file> | --mock');
    process.exit(1);
  }

  console.error('📄 Input: ' + rawText.length + ' chars');

  try {
    const products = await parseWithGPT4(rawText);
    console.error('✅ Parsed ' + products.length + ' product(s)');
    let valid = true;
    products.forEach((p, i) => {
      const errors = validateProduct(p);
      if (errors.length) {
        console.error('  ⚠️ Product ' + (i+1) + ' "' + (p.name && p.name.en || 'unnamed') + '": ' + errors.join(', '));
        valid = false;
      } else {
        console.error('  ✅ Product ' + (i+1) + ': ' + p.name.en + ' - ' + p.price_display);
      }
    });
    console.log(JSON.stringify(products, null, 2));
  } catch (err) {
    console.error('❌ Parsing failed: ' + err.message);
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal: ' + err.message); process.exit(1); });
