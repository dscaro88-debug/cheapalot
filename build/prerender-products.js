#!/usr/bin/env node
/**
 * prerender-products.js
 * Reads data/products.json and injects ALL products as crawlable static HTML
 * into the product grid of products.html (en/es/ar).
 *
 * WHY: the live site renders products via client-side fetch + JS (products-loader.js).
 * AI search engines (ChatGPT / Perplexity / Gemini / Claude) and efficient Google
 * crawls do NOT execute that JS, so the 513 products were invisible. Pre-rendering
 * them as real HTML in the DOM makes the entire catalog crawlable (SEO + GEO).
 *
 * The products-loader.js is enhanced to enhance this static DOM (display-toggle
 * pagination/filter) instead of wiping it.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'products.json');

const TAGS = {
  best_seller: { en: 'Best Seller', es: 'Más Vendido', ar: 'الأكثر مبيعاً' },
  new:         { en: 'New',         es: 'Nuevo',        ar: 'جديد' },
  limited:     { en: 'Limited',     es: 'Limitado',     ar: 'محدود' },
  hot:         { en: 'Hot',         es: 'Popular',      ar: 'رائج' },
  sale:        { en: 'Sale',        es: 'Oferta',       ar: 'تخفيض' }
};
const STOCK = {
  agent:     { en: '📦 Sourcing Agent · 7–15 days', es: '📦 Agente · 7–15 días', ar: '📦 وكيل · ٧–١٥ يوم' },
  overstock: { en: '✓ In Stock',                    es: '✓ En Stock',             ar: '✓ متوفر' },
  limited:   { en: '⚡ Limited',                    es: '⚡ Limitado',            ar: '⚡ محدود' },
  in_stock:  { en: '✓ In Stock',                    es: '✓ En Stock',             ar: '✓ متوفر' },
  out_of_stock: { en: '✗ Sold Out',                 es: '✗ Agotado',              ar: '✗ نفذ' }
};
const BTN = {
  quote: { en: 'Get Quote', es: 'Cotizar', ar: 'استفسار' },
  info:  { en: 'More Info', es: 'Más Info', ar: 'مزيد من المعلومات' }
};

function t(obj, lang) {
  if (!obj) return '';
  return obj[lang] || obj['en'] || '';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function safeImg(p) {
  const v = String(p || '');
  return /^(?:\.\.\/)?images\/[a-zA-Z0-9_./-]+$/.test(v) ? v : 'images/placeholder.jpg';
}
function tagLabel(tag, lang) {
  const m = TAGS[tag] || TAGS['new'];
  return m[lang] || m['en'];
}
function tagClass(tag) {
  const m = { best_seller: '', new: 'green', limited: 'orange', hot: 'red', sale: 'orange' };
  return m[tag] || '';
}
function stockLabel(status, lang) {
  const m = STOCK[status] || STOCK['agent'];
  return m[lang] || m['en'];
}

// Build one crawlable product card (matches products-loader.js markup for visual parity)
function card(p, lang, imgPrefix, baseUrl) {
  const name = esc(t(p.name, lang));
  const cat = esc(t(p.category_display, lang));
  const priceUnit = esc(t(p.price_unit, lang));
  const minOrder = esc(t(p.min_order, lang));
  const numericPrice = Number(p.price);
  const priceDisp = esc(p.price_display || ('£' + (Number.isFinite(numericPrice) ? numericPrice : 0).toFixed(2)));
  const img = esc((imgPrefix + safeImg(p.image)).replace(/^\.\//, ''));
  const inquiry = baseUrl + 'index.html?product=' + encodeURIComponent(t(p.name, lang)) + '#inquiry-form';
  const tag = p.tag ? `<span class="product-tag ${tagClass(p.tag)}">${tagLabel(p.tag, lang)}</span>` : '';
  const stock = stockLabel(p.stock_status, lang);
  const stockClass = (p.stock_status === 'overstock') ? ' in-stock' : (p.stock_status === 'limited' ? ' limited' : ' agent');

  return `<article class="product-card" data-id="${esc(p.id)}" data-category="${esc(p.category || '')}" data-price="${esc(numericPrice)}" data-stock="${esc(p.stock_status || 'agent')}">` +
    `<a class="product-img${stockClass}" href="${inquiry}" style="background-image:url('${img}')" role="img" aria-label="${name}">${tag}</a>` +
    `<div class="product-body">` +
      `<div class="product-cat">${cat}</div>` +
      `<h3 class="product-title"><a href="${inquiry}">${name}</a></h3>` +
      `<div class="product-meta"><span>📦 Min: ${minOrder}</span><span class="stock-label${stockClass}">${stock}</span></div>` +
      `<div class="product-price">${priceDisp}<small>${priceUnit}</small></div>` +
      `<div class="product-actions">` +
        `<a href="${inquiry}" class="btn btn-primary">${BTN.quote[lang] || BTN.quote.en}</a>` +
        `<a href="${inquiry}" class="btn btn-outline">${BTN.info[lang] || BTN.info.en}</a>` +
      `</div>` +
    `</div>` +
  `</article>`;
}

// Replace the inner content of <div id="productGrid">...</div> (depth-aware).
function replaceGrid(html, inner) {
  const open = html.indexOf('<div id="productGrid"');
  if (open === -1) throw new Error('productGrid not found');
  const openEnd = html.indexOf('>', open) + 1;
  // find matching close
  let depth = 0, i = openEnd, close = -1;
  while (i < html.length) {
    if (html.startsWith('<div', i)) { depth++; i += 4; continue; }
    if (html.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) { close = i; break; }
      i += 6; continue;
    }
    // skip inside tags / text
    if (html[i] === '<') { const j = html.indexOf('>', i); i = j + 1; }
    else i++;
  }
  if (close === -1) throw new Error('could not find matching </div>');
  return html.slice(0, openEnd) + '\n' + inner + '\n        ' + html.slice(close);
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const products = (data.products || []).filter(p =>
    p.source !== 'supplier' || p.approved !== false
  );
  console.log(`Pre-rendering ${products.length} products...`);

  const configs = [
    { file: 'products.html',       lang: 'en', imgPrefix: '',      baseUrl: '' },
    { file: 'es/products.html',    lang: 'es', imgPrefix: '../',   baseUrl: '../' },
    { file: 'ar/products.html',    lang: 'ar', imgPrefix: '../',   baseUrl: '../' }
  ];

  for (const cfg of configs) {
    const target = path.join(ROOT, cfg.file);
    if (!fs.existsSync(target)) { console.log('skip (missing):', cfg.file); continue; }
    let html = fs.readFileSync(target, 'utf8');
    const inner = products.map(p => '            ' + card(p, cfg.lang, cfg.imgPrefix, cfg.baseUrl)).join('\n');
    html = replaceGrid(html, inner);
    fs.writeFileSync(target, html);
    console.log(`  ✓ ${cfg.file} (${products.length} cards injected)`);
  }
  console.log('Done.');
}

main();
