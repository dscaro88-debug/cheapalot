#!/usr/bin/env node
/**
 * Add Twitter Card meta tags and manifest link to all HTML files
 */
const fs = require('fs');
const path = require('path');

const PAGES = [
  { file: 'products.html', title: 'Wholesale Clearance Stock | Browse Products', desc: 'Browse 20,000+ wholesale clearance lines from 1p/unit. Liquidation pallets, customer returns, end-of-line stock.' },
  { file: 'about.html', title: 'About CheapALot | Yiwu Sourcing Agent', desc: 'Based in Yiwu, the world\'s largest wholesale market. 20+ years export experience. Your trusted China trade partner.' },
  { file: 'sell.html', title: 'Sell Your Stock | CheapALot', desc: 'Got excess inventory or returns? We connect you with buyers in 30+ countries. Free valuation within 24 hours.' },
  { file: 'contact.html', title: 'Contact CheapALot | Get a Quote', desc: 'Contact us for wholesale clearance stock, sourcing services, or to sell your inventory. Based in Yiwu, China.' },
  { file: 'terms.html', title: 'Terms & Conditions | CheapALot', desc: 'Terms and conditions for CheapALot.com - B2B wholesale clearance stock platform.' }
];

const DIRS = ['', 'es/', 'ar/'];
const BASE = path.resolve(__dirname, '..');

const TWITTER_TEMPLATE = (title, desc) => `
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="https://cheapalot.com/images/hero-bg.jpg">
`;

const MANIFEST_LINK = `
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
`;

let updated = 0;

DIRS.forEach(dir => {
  PAGES.forEach(page => {
    const filePath = path.join(BASE, dir, page.file);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add Twitter Card if not present
    if (!html.includes('twitter:card')) {
      // Insert before </head>
      const twitterTags = TWITTER_TEMPLATE(
        dir === 'es/' ? page.title + ' | ES' : (dir === 'ar/' ? page.title + ' | AR' : page.title),
        page.desc
      );
      html = html.replace('</head>', twitterTags + '\n</head>');
      modified = true;
    }

    // Add manifest link if not present
    if (!html.includes('manifest.json')) {
      html = html.replace('</head>', MANIFEST_LINK + '\n</head>');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, html, 'utf8');
      updated++;
      console.log('  ✅ ' + dir + page.file);
    }
  });
});

// Also add manifest to index.html files
['', 'es/', 'ar/'].forEach(dir => {
  const indexPath = path.join(BASE, dir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes('manifest.json')) {
      html = html.replace('</head>', MANIFEST_LINK + '\n</head>');
      fs.writeFileSync(indexPath, html, 'utf8');
      updated++;
      console.log('  ✅ ' + dir + 'index.html (manifest added)');
    }
  }
});

console.log('\nTotal files updated: ' + updated);
