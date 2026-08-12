#!/usr/bin/env node
/**
 * inject-seo-data.js
 * Idempotently injects structured data (JSON-LD) into the static HTML:
 *   - LocalBusiness  -> homepage (index.html / es / ar)
 *   - ItemList        -> products.html / es / ar  (machine-readable product inventory)
 *   - BreadcrumbList -> all inner pages (products/about/contact/sell/terms + es/ar)
 *
 * SEO + GEO: rich schema helps Google rich results and helps AI engines
 * (ChatGPT / Perplexity / Gemini) extract factual entity + product data.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'products.json');
const SITE = 'https://cheapalot.com';

function stripMarked(html, marker) {
  const re = new RegExp('<!--' + marker + '-->[\\s\\S]*?<!--/' + marker + '-->', 'g');
  return html.replace(re, '');
}
function injectBeforeHead(html, block) {
  const i = html.lastIndexOf('</head>');
  if (i === -1) return html + block;
  return html.slice(0, i) + '\n' + block + '\n' + html.slice(i);
}
function readMeta(html, name) {
  const m = html.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? m[1].trim() : '';
}
function jsonLd(obj) {
  return '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + '\n</script>';
}

/* ---------------- LocalBusiness ---------------- */
function buildLocalBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "CheapALot",
    "url": SITE,
    "logo": SITE + "/images/logo.png",
    "image": SITE + "/images/hero-bg.jpg",
    "description": "CheapALot is a Yiwu, China-based B2B wholesale and sourcing company. We supply wholesale clearance stock and overstock from £0.10 per unit, provide a Yiwu purchasing/sourcing agent service (supplier verification, quality control, price negotiation, production follow-up), help businesses sell excess inventory through a global buyer network, and handle export logistics. 20+ years of export experience, serving 30+ countries.",
    "@id": SITE,
    "email": "dscaro88@gmail.com",
    "telephone": "+86 13367494665",
    "priceRange": "£",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Yiwu",
      "addressRegion": "Zhejiang",
      "addressCountry": "CN",
      "postalCode": "322000"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 29.3068,
      "longitude": 120.0757
    },
    "areaServed": [
      { "@type": "Country", "name": "GB" },
      { "@type": "Country", "name": "EU" },
      { "@type": "Country", "name": "Worldwide" }
    ],
    "openingHoursSpecification": [{
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "09:00",
      "closes": "18:00",
      "validFrom": "2026-01-01",
      "validThrough": "2026-12-31"
    }],
    "knowsAbout": [
      "Wholesale clearance stock", "Overstock inventory", "Yiwu sourcing agent",
      "China procurement", "Quality control inspection", "Export logistics", "B2B liquidation"
    ],
    "sameAs": []
  };
}

/* ---------------- ItemList (products) ---------------- */
function buildItemList(html) {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || SITE + '/products.html';
  const lang = (canonical.match(/\/es\//) ? 'es' : canonical.match(/\/ar\//) ? 'ar' : 'en');
  const products = (data.products || []).filter(p => p.source !== 'supplier' || p.approved !== false);
  const itemListElement = products.map((p, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "Product",
      "name": (p.name && (p.name[lang] || p.name.en)) || '',
      "category": (p.category_display && (p.category_display[lang] || p.category_display.en)) || p.category || '',
      "url": canonical + '#' + p.id,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "GBP",
        "price": p.price,
        "availability": p.stock_status === 'overstock'
          ? "https://schema.org/InStock"
          : "https://schema.org/LimitedAvailability"
      }
    }
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "CheapALot Wholesale Product Catalog",
    "description": "500+ wholesale products sourced from Yiwu, China — toys, home textiles, electronics, apparel, tools, furniture and more.",
    "numberOfItems": itemListElement.length,
    "itemListElement": itemListElement
  };
}

/* ---------------- BreadcrumbList ---------------- */
function buildBreadcrumb(html) {
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canonical) return null;
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
  const label = title.split('|')[0].split('-')[0].trim();
  const home = (canonical.match(/^(https?:\/\/[^/]+)/) || [SITE])[1] + '/';
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": home },
      { "@type": "ListItem", "position": 2, "name": label, "item": canonical }
    ]
  };
}

/* ---------------- Main ---------------- */
const INDEX_FILES = ['index.html', 'es/index.html', 'ar/index.html'];
const PRODUCT_FILES = ['products.html', 'es/products.html', 'ar/products.html'];
const INNER_FILES = ['about.html', 'contact.html', 'sell.html', 'terms.html',
  'es/about.html', 'es/contact.html', 'es/sell.html', 'es/terms.html',
  'ar/about.html', 'ar/contact.html', 'ar/sell.html', 'ar/terms.html'];

function process(file, builders) {
  const target = path.join(ROOT, file);
  if (!fs.existsSync(target)) { console.log('skip (missing):', file); return; }
  let html = fs.readFileSync(target, 'utf8');
  // strip previous injections
  html = stripMarked(html, 'SEO-LOCALBUSINESS');
  html = stripMarked(html, 'SEO-ITEMLIST');
  html = stripMarked(html, 'SEO-BREADCRUMB');
  let added = [];
  builders.forEach(b => {
    const obj = b(html);
    if (!obj) return;
    html = injectBeforeHead(html, '<!--' + b.marker + '-->\n' + jsonLd(obj) + '\n<!--/' + b.marker + '-->');
    added.push(b.marker);
  });
  fs.writeFileSync(target, html);
  console.log('  ✓ ' + file + '  [' + added.join(', ') + ']');
}

function main() {
  console.log('Injecting structured data...');
  const lb = html => buildLocalBusiness(); lb.marker = 'SEO-LOCALBUSINESS';
  const il = html => buildItemList(html); il.marker = 'SEO-ITEMLIST';
  const bc = html => buildBreadcrumb(html); bc.marker = 'SEO-BREADCRUMB';

  INDEX_FILES.forEach(f => process(f, [lb]));
  PRODUCT_FILES.forEach(f => process(f, [il, bc]));
  console.log('---');
  INNER_FILES.forEach(f => process(f, [bc]));
  console.log('Done.');
}

main();
