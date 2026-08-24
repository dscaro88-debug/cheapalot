#!/usr/bin/env node
/**
 * 义乌购手表静态化脚本
 *
 * Reads data/stock-watches.json → 32 个产品
 * 为每个产品生成 watches/<id>.html(包含完整 SSR 内容)
 *
 * 修复 Google Search Console 软 404 报告:
 *   之前 product.html 是空壳 SSR(JS 渲染),Google 爬虫看不到产品内容,
 *   判为软 404。本脚本生成完整 HTML 让 Google 索引到真实产品页。
 *
 * 用法:
 *   node build/prerender-watches.js
 *   node build/prerender-watches.js --no-write   # 只检查,不写
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'stock-watches.json');
const PRODUCT_HTML = path.join(ROOT, 'product.html');
const OUT_DIR = path.join(ROOT, 'watches');
const BASE_URL = 'https://www.cheapalot.com';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-write');

function loadJson() {
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

function loadTemplate() {
  return fs.readFileSync(PRODUCT_HTML, 'utf8');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function langName(p, lang) {
  return p.name[lang] || p.name.en;
}

function langDesc(p, lang) {
  return (p.description && p.description[lang]) || (p.description && p.description.en) || '';
}

function langCatDisplay(p, lang) {
  return p.category_display[lang] || p.category_display.en || '';
}

function langPriceUnit(p, lang) {
  return (p.price_unit && p.price_unit[lang]) || (p.price_unit && p.price_unit.en) || '';
}

function langMinOrder(p, lang) {
  return (p.min_order && p.min_order[lang]) || (p.min_order && p.min_order.en) || '';
}

function langSpecs(p, lang) {
  return (p.specifications && p.specifications[lang]) || (p.specifications && p.specifications.en) || {};
}

function buildJsonLd(p) {
  const enName = langName(p, 'en');
  const enCat = langCatDisplay(p, 'en');
  return JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": enName,
    "sku": p.sku,
    "mpn": p.sku,
    "category": enCat,
    "image": [`${BASE_URL}/${p.image}`],
    "description": langDesc(p, 'en') || `${enName} - Wholesale from Yiwu, B2B trade only.`,
    "brand": { "@type": "Brand", "name": "CheapALot" },
    "offers": {
      "@type": "Offer",
      "url": `${BASE_URL}/watches/${p.id}.html`,
      "priceCurrency": "USD",
      "price": p.price,
      "priceValidUntil": "2027-12-31",
      "availability": p.stock_status === 'in_stock'
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
      "itemCondition": "https://schema.org/NewCondition",
      "eligibleQuantity": { "@type": "QuantitativeValue", "minValue": p.moq || 1 }
    }
  }, null, 2);
}

function buildBreadcrumbJsonLd(p) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Stock Watches", "item": `${BASE_URL}/stock.html` },
      { "@type": "ListItem", "position": 3, "name": langName(p, 'en'), "item": `${BASE_URL}/watches/${p.id}.html` }
    ]
  }, null, 2);
}

function renderProductHtml(template, p) {
  const enName = langName(p, 'en');
  const enDesc = langDesc(p, 'en') || `${enName} — Wholesale in stock from Yiwu. B2B trade only. MOQ ${p.moq} pcs.`;
  const enCat = langCatDisplay(p, 'en');
  const enPriceUnit = langPriceUnit(p, 'en');
  const enMinOrder = langMinOrder(p, 'en');
  const specs = langSpecs(p, 'en');
  const specHtml = Object.entries(specs)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  // 1) Head: title / meta description / canonical / og:* / twitter:*
  let html = template;

  const replacements = [
    [/    <title>[\s\S]*?<\/title>/, `    <title>${esc(enName)} (${p.sku}) | CheapALot Wholesale Watches</title>`],
    [
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${esc(enDesc.slice(0, 160))}">`
    ],
    [
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${BASE_URL}/watches/${p.id}.html">`
    ],
    [
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${esc(enName)} | CheapALot Wholesale Watches">`
    ],
    [
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${esc(enDesc.slice(0, 200))}">`
    ],
    [
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${BASE_URL}/watches/${p.id}.html">`
    ],
    [
      /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${BASE_URL}/${p.image}">`
    ],
    [
      /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${esc(enName)}">`
    ],
    [
      /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${esc(enDesc.slice(0, 200))}">`
    ]
  ];
  for (const [re, val] of replacements) {
    html = html.replace(re, val);
  }

  // 2) 在 </head> 前注入 Product + BreadcrumbList JSON-LD
  const jsonLd = buildJsonLd(p) + '\n' + buildBreadcrumbJsonLd(p);
  html = html.replace(
    '</head>',
    `    <script type="application/ld+json">\n${jsonLd}\n    </script>\n</head>`
  );

  // 3) 在 body 头部注入 SSR 隐藏层(Googlebot 不执行 JS 时也能读到)
  //    包含 H1、价格、SKU、描述等核心内容
  const ssrHidden = `
<!-- SSR FALLBACK: Googlebot 不执行 JS 时, 也能读到核心产品信息 -->
<div id="ssr-product" style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">
    <h1>${esc(enName)}</h1>
    <p><strong>SKU:</strong> ${esc(p.sku)}</p>
    <p><strong>Category:</strong> ${esc(enCat)}</p>
    <p><strong>Price:</strong> ${esc(p.price_display)} ${esc(enPriceUnit)}</p>
    <p><strong>MOQ:</strong> ${esc(enMinOrder)}</p>
    <p><strong>Stock Status:</strong> ${esc(p.stock_status)}</p>
    ${p.inspired_by ? `<p><strong>Inspired By:</strong> ${esc(p.inspired_by)}</p>` : ''}
    ${p.description ? `<p>${esc(langDesc(p, 'en'))}</p>` : ''}
    <img src="${esc(p.image)}" alt="${esc(enName)}">
</div>
<!-- END SSR FALLBACK -->
`;

  html = html.replace(
    /<body([^>]*)>/,
    `<body$1>\n${ssrHidden}`
  );

  // 4) 在 </body> 前注入 visible SSR panel(浏览器用户也能看到,Googlebot 抓取时读)
  //    包含:完整的核心产品信息卡,即使 JS 失败也可用
  const ssrPanel = `
<!-- VISIBLE SSR PANEL: 无 JS 也能看到的核心产品信息 -->
<noscript>
    <div style="max-width:680px;margin:24px auto;padding:24px;background:#fff;border:2px solid #1a1a1a;border-radius:12px;font-family:Inter,sans-serif;">
        <h1 style="font-family:Oswald,sans-serif;font-size:28px;margin:0 0 12px;">${esc(enName)}</h1>
        <p style="color:#666;font-size:13px;margin:0 0 16px;">SKU: ${esc(p.sku)} · ${esc(enCat)} · ${esc(p.stock_status)}</p>
        <p style="font-size:32px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">${esc(p.price_display)} <span style="font-size:14px;font-weight:400;color:#666;">${esc(enPriceUnit)}</span></p>
        <p style="color:#444;font-size:14px;margin:0 0 16px;">${esc(enMinOrder)}</p>
        ${p.description ? `<p style="color:#333;font-size:14px;line-height:1.6;">${esc(langDesc(p, 'en'))}</p>` : ''}
        ${specHtml ? `<h3 style="font-family:Oswald,sans-serif;font-size:16px;margin:16px 0 8px;">Specifications</h3><table style="width:100%;border-collapse:collapse;font-size:13px;">${specHtml}</table>` : ''}
        <p style="margin-top:24px;font-size:14px;color:#666;">📱 <a href="https://wa.me/8613367494665" style="color:#e31837;">Contact us on WhatsApp</a> · ✉️ <a href="mailto:dscaro88@gmail.com" style="color:#e31837;">Email us</a></p>
    </div>
</noscript>
`;

  html = html.replace(
    '</body>',
    `${ssrPanel}\n</body>`
  );

  return html;
}

function main() {
  if (!fs.existsSync(DATA)) {
    console.error('找不到 stock-watches.json:', DATA);
    process.exit(1);
  }
  if (!fs.existsSync(PRODUCT_HTML)) {
    console.error('找不到 product.html:', PRODUCT_HTML);
    process.exit(1);
  }

  const data = loadJson();
  const products = data.products || [];
  const template = loadTemplate();

  if (!DRY_RUN && !fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`\n[手表静态化] 共 ${products.length} 个产品`);
  console.log(`[输出目录] ${path.relative(ROOT, OUT_DIR)}/\n`);

  let ok = 0, fail = 0;
  for (const p of products) {
    try {
      const html = renderProductHtml(template, p);
      const outFile = path.join(OUT_DIR, `${p.id}.html`);
      if (!DRY_RUN) fs.writeFileSync(outFile, html, 'utf8');
      console.log(`  ✓ ${p.id} (${p.sku}) → watches/${p.id}.html  ${(html.length/1024).toFixed(1)}KB`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${p.id} 失败: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n[完成] ${ok} 个成功${fail ? ', ' + fail + ' 个失败' : ''}`);
  if (DRY_RUN) console.log('(DRY RUN — 未写文件)');
}

main();