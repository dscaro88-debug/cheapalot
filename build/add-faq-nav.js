#!/usr/bin/env node
/**
 * add-faq-nav.js
 * Adds a FAQ link to the main nav and the footer "Quick Links" of every HTML page
 * (en/es/ar), for internal-link equity and discoverability of the new FAQ page.
 * Idempotent: skips files that already contain the FAQ nav link.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'index.html', 'products.html', 'about.html', 'contact.html', 'sell.html', 'terms.html',
  'es/index.html', 'es/products.html', 'es/about.html', 'es/contact.html', 'es/sell.html', 'es/terms.html',
  'ar/index.html', 'ar/products.html', 'ar/about.html', 'ar/contact.html', 'ar/sell.html', 'ar/terms.html'
];

const FAQ_LABEL = { en: 'FAQ', es: 'Preguntas Frecuentes', ar: 'الأسئلة الشائعة' };

function langOf(html) {
  const m = html.match(/<html lang="([a-z]{2})"/);
  return m ? m[1] : 'en';
}

FILES.forEach(rel => {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) { console.log('skip (missing):', rel); return; }
  let html = fs.readFileSync(target, 'utf8');
  const lang = langOf(html);
  const label = FAQ_LABEL[lang] || 'FAQ';

  // 1) Nav: insert before the sourcing CTA (unique across pages)
  const navMarker = '<a href="index.html#sourcing" class="nav-cta">';
  if (html.indexOf('href="faq.html"') === -1 && html.indexOf(navMarker) !== -1) {
    const faqNav = '<a href="faq.html">' + label + '</a>\n                ' + navMarker;
    html = html.replace(navMarker, faqNav);
  }

  // 2) Footer Quick Links: insert after the contact link that closes the col
  //    (footer contact link is followed by </div><div class="footer-col">)
  const footRe = /(<a href="contact\.html">[^<]*<\/a>)(\s*<\/div>\s*<div class="footer-col">)/;
  if (html.indexOf('href="faq.html"') === -1 && footRe.test(html)) {
    html = html.replace(footRe, '$1\n                    <a href="faq.html">' + label + '</a>$2');
  }

  fs.writeFileSync(target, html);
  console.log('  ✓ ' + rel + '  (nav+footer FAQ link added, lang=' + lang + ')');
});
console.log('Done.');
