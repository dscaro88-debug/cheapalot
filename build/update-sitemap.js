#!/usr/bin/env node
/**
 * update-sitemap.js
 * Regenerates sitemap.xml with all pages (en/es/ar) incl. the new FAQ page,
 * correct hreflang alternates, and a fresh lastmod. Reusable on every content change.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.cheapalot.com';
const LASTMOD = '2026-08-13';

// page -> { priority, changefreq }
const PAGES = {
  '':          { p: 1.0, c: 'daily' },
  'products':  { p: 0.9, c: 'daily' },
  'faq':       { p: 0.8, c: 'daily' },
  'eu-buyers': { p: 0.8, c: 'monthly' },
  'sell':      { p: 0.8, c: 'monthly' },
  'about':     { p: 0.7, c: 'monthly' },
  'contact':   { p: 0.7, c: 'monthly' },
  'terms':     { p: 0.5, c: 'monthly' }
};

const LANGS = [
  { code: 'en', dir: '' },
  { code: 'es', dir: 'es/' },
  { code: 'ar', dir: 'ar/' }
];

function urlFor(page, lang) {
  const base = lang === 'en' ? SITE + '/' : SITE + '/' + lang + '/';
  return page === '' ? base : base + page + '.html';
}

let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
out += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
out += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

Object.keys(PAGES).forEach(page => {
  const meta = PAGES[page];
  LANGS.forEach(l => {
    out += '    <url>\n';
    out += '        <loc>' + urlFor(page, l.code) + '</loc>\n';
    out += '        <lastmod>' + LASTMOD + '</lastmod>\n';
    out += '        <changefreq>' + meta.c + '</changefreq>\n';
    out += '        <priority>' + meta.p.toFixed(1) + '</priority>\n';
    LANGS.forEach(a => {
      out += '        <xhtml:link rel="alternate" hreflang="' + a.code + '" href="' + urlFor(page, a.code) + '"/>\n';
    });
    out += '        <xhtml:link rel="alternate" hreflang="x-default" href="' + urlFor(page, 'en') + '"/>\n';
    out += '    </url>\n';
  });
});

out += '</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out);
console.log('sitemap.xml regenerated: ' + (Object.keys(PAGES).length * 3) + ' URLs, lastmod ' + LASTMOD);
