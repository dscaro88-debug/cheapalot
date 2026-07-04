#!/usr/bin/env node
/**
 * CheapALot Build Script
 * ======================
 * Reads data/products.json + data/i18n.json + data/forms.json
 * Generates product cards, filter sidebar, and deals section
 * Injects into existing HTML templates for EN/ES/AR
 * Replaces form actions with Formspree IDs
 *
 * Usage:
 *   node build/build-products.js          # Build all pages
 *   node build/build-products.js --products  # Only products.html
 *   node build/build-products.js --deals     # Only index.html deals
 *   node build/build-products.js --forms     # Only form actions
 *
 * AI Pipeline Integration:
 *   1. Supplier sends inventory via WhatsApp/Email
 *   2. GPT-4 parses → updates data/products.json
 *   3. Run this script → regenerates all HTML
 *   4. git commit + push → Vercel auto-deploys
 */

const fs = require('fs');
const path = require('path');

// ─── Paths ───
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT = {
  en: ROOT,
  es: path.join(ROOT, 'es'),
  ar: path.join(ROOT, 'ar')
};

// ─── Load Data ───
const productsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf8'));
const i18nData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'i18n.json'), 'utf8'));
const formsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'forms.json'), 'utf8'));

const { products, categories, deals, meta } = productsData;
const { ui, languages } = i18nData;

// ─── Tag CSS class mapping ───
const TAG_CLASS = {
  best_seller: '',
  new: 'green',
  clearance: '',
  seasonal: '',
  hot: 'orange',
  '70_off': 'orange'
};

// ─── Helpers ───
function t(key, lang) {
  return ui[key] ? (ui[key][lang] || ui[key].en || key) : key;
}

function deepT(obj, key, lang) {
  if (!obj[key]) return key;
  return obj[key][lang] || obj[key].en || key;
}

function getImagePath(image, lang) {
  // For subdirectory languages, prefix with ../
  if (lang !== 'en') {
    return '../' + image;
  }
  return image;
}

// ─── Generate: Product Card ───
function generateProductCard(product, lang) {
  const tagClass = TAG_CLASS[product.tag] !== undefined ? TAG_CLASS[product.tag] : '';
  const tagText = t('tags', lang) && i18nData.ui.tags[product.tag] 
    ? (i18nData.ui.tags[product.tag][lang] || i18nData.ui.tags[product.tag].en) 
    : product.tag;
  const stockKey = product.stock_status === 'limited' ? 'limited' : 'in_stock';
  const stockText = i18nData.ui.products_page[stockKey][lang] || i18nData.ui.products_page[stockKey].en;
  const minLabel = i18nData.ui.products_page.min_order_label[lang] || i18nData.ui.products_page.min_order_label.en;
  const addToCartText = i18nData.ui.products_page.add_to_cart[lang] || i18nData.ui.products_page.add_to_cart.en;
  const viewText = i18nData.ui.products_page.view[lang] || i18nData.ui.products_page.view.en;
  const imgPath = getImagePath(product.image, lang);

  // Determine min order display
  let minOrderDisplay = product.min_order[lang] || product.min_order.en;
  // If it's a pallet, don't prefix with "Min:"
  const isPallet = minOrderDisplay.toLowerCase().includes('pallet') || 
                    minOrderDisplay.toLowerCase().includes('paleta') ||
                    minOrderDisplay.toLowerCase().includes('منص');

  return `                <div class="product-card" data-id="${product.id}" data-category="${product.category}" data-price="${product.price}" data-stock="${product.stock_status}">
                    <div class="product-img" style="background-image: url('${imgPath}')">
                        <span class="product-tag ${tagClass}">${tagText}</span>
                    </div>
                    <div class="product-body">
                        <div class="product-cat">${product.category_display[lang] || product.category_display.en}</div>
                        <h3 class="product-title">${product.name[lang] || product.name.en}</h3>
                        <div class="product-meta">
                            <span>${isPallet ? '📦 ' : minLabel + ' '}${minOrderDisplay}</span>
                            <span>${stockText}</span>
                        </div>
                        <div class="product-price">${product.price_display}<small>${product.price_unit[lang] || product.price_unit.en}</small></div>
                        <div class="product-actions">
                            <a href="#inquiry" class="btn btn-primary" onclick="prefillInquiry('${(product.name[lang] || product.name.en).replace(/'/g, "\\'")}', '${product.price_display}')">${addToCartText}</a>
                            <a href="#inquiry" class="btn btn-outline">${viewText}</a>
                        </div>
                    </div>
                </div>`;
}

// ─── Generate: Product Grid (inner content only, no wrapper) ───
function generateProductGrid(lang) {
  const cards = products.map(p => generateProductCard(p, lang)).join('\n\n');
  return cards;
}

// ─── Generate: Filter Sidebar ───
function generateFilterSidebar(lang) {
  const filtersText = i18nData.ui.products_page.filters[lang] || 'Filters';
  const catText = i18nData.ui.products_page.filter_category[lang] || 'Category';
  const condText = i18nData.ui.products_page.filter_condition[lang] || 'Stock Condition';
  const qtyText = i18nData.ui.products_page.filter_quantity[lang] || 'Min Quantity';
  const priceText = i18nData.ui.products_page.filter_price[lang] || 'Price Range';
  const clearText = i18nData.ui.products_page.clear_filters[lang] || 'Clear Filters';

  // Generate category checkboxes
  const catCheckboxes = categories.map(cat => {
    const name = cat.name[lang] || cat.name.en;
    return `                <label><input type="checkbox"> ${name} <span class="count">(${cat.count.toLocaleString()})</span></label>`;
  }).join('\n');

  // Static filter groups (these don't change with data)
  const condNew = i18nData.ui.products_page.condition_new[lang] || 'New / Unused';
  const condReturns = i18nData.ui.products_page.condition_returns[lang] || 'Customer Returns';
  const condLikeNew = i18nData.ui.products_page.condition_like_new[lang] || 'Like New';
  const condDamaged = i18nData.ui.products_page.condition_damaged[lang] || 'Damaged / Refurb';
  const condMixed = i18nData.ui.products_page.condition_mixed[lang] || 'Mixed Pallets';

  const qty100 = i18nData.ui.products_page.qty_100[lang] || '100+ units';
  const qty500 = i18nData.ui.products_page.qty_500[lang] || '500+ units';
  const qty1000 = i18nData.ui.products_page.qty_1000[lang] || '1,000+ units';
  const qtyPallet = i18nData.ui.products_page.qty_pallet[lang] || 'Full Pallet';
  const qtyContainer = i18nData.ui.products_page.qty_container[lang] || 'Container Load';

  const priceUnder1 = i18nData.ui.products_page.price_under1[lang] || 'Under £1';
  const price15 = i18nData.ui.products_page.price_1_5[lang] || '£1 - £5';
  const price520 = i18nData.ui.products_page.price_5_20[lang] || '£5 - £20';
  const price2050 = i18nData.ui.products_page.price_20_50[lang] || '£20 - £50';
  const price50plus = i18nData.ui.products_page.price_50_plus[lang] || '£50+';

  // Products page link (with prefix for subdirectory languages)
  const productsLink = lang === 'en' ? 'products.html' : '../products.html';

  return `            <h3>${filtersText}</h3>

            <div class="filter-group">
                <h4>${catText}</h4>
${catCheckboxes}
            </div>

            <div class="filter-group">
                <h4>${condText}</h4>
                <label><input type="checkbox" checked> ${condNew}</label>
                <label><input type="checkbox"> ${condReturns}</label>
                <label><input type="checkbox"> ${condLikeNew}</label>
                <label><input type="checkbox"> ${condDamaged}</label>
                <label><input type="checkbox"> ${condMixed}</label>
            </div>

            <div class="filter-group">
                <h4>${qtyText}</h4>
                <label><input type="checkbox"> ${qty100}</label>
                <label><input type="checkbox"> ${qty500}</label>
                <label><input type="checkbox"> ${qty1000}</label>
                <label><input type="checkbox"> ${qtyPallet}</label>
                <label><input type="checkbox"> ${qtyContainer}</label>
            </div>

            <div class="filter-group">
                <h4>${priceText}</h4>
                <label><input type="checkbox"> ${priceUnder1}</label>
                <label><input type="checkbox"> ${price15}</label>
                <label><input type="checkbox"> ${price520}</label>
                <label><input type="checkbox"> ${price2050}</label>
                <label><input type="checkbox"> ${price50plus}</label>
            </div>

            <a href="${productsLink}" class="btn btn-outline" style="width:100%;justify-content:center">${clearText}</a>`;
}

// ─── Generate: Toolbar ───
function generateToolbar(lang) {
  const showing = i18nData.ui.products_page.showing[lang] || 'Showing';
  const of = i18nData.ui.products_page.of[lang] || 'of';
  const productsWord = i18nData.ui.products_page.products_word[lang] || 'products';
  const sortNewest = i18nData.ui.products_page.sort_newest[lang] || 'Sort: Newest First';
  const sortPriceLow = i18nData.ui.products_page.sort_price_low[lang] || 'Price: Low to High';
  const sortPriceHigh = i18nData.ui.products_page.sort_price_high[lang] || 'Price: High to Low';
  const sortQty = i18nData.ui.products_page.sort_quantity[lang] || 'Quantity: High to Low';
  const sortPopular = i18nData.ui.products_page.sort_popular[lang] || 'Most Popular';

  const totalDisplay = meta.total_display || products.length.toString();
  const showingEnd = Math.min(products.length, 12);

  return `                <div class="toolbar-info">${showing} <strong>1-${showingEnd}</strong> ${of} <strong>${totalDisplay}</strong> ${productsWord}</div>
                <div class="toolbar-sort">
                    <select>
                        <option>${sortNewest}</option>
                        <option>${sortPriceLow}</option>
                        <option>${sortPriceHigh}</option>
                        <option>${sortQty}</option>
                        <option>${sortPopular}</option>
                    </select>
                </div>`;
}

// ─── Generate: Pagination ───
function generatePagination(lang) {
  const prevText = i18nData.ui.products_page.pagination_prev[lang] || '← Previous';
  const nextText = i18nData.ui.products_page.pagination_next[lang] || 'Next →';
  // Arabic: arrows reversed for RTL
  if (lang === 'ar') {
    return `                <a href="#">${prevText}</a>
                <a href="#" class="active">1</a>
                <a href="#">2</a>
                <a href="#">3</a>
                <a href="#">4</a>
                <a href="#">5</a>
                <a href="#">...</a>
                <a href="#">1041</a>
                <a href="#">${nextText}</a>`;
  }
  return `                <a href="#">${prevText}</a>
                <a href="#" class="active">1</a>
                <a href="#">2</a>
                <a href="#">3</a>
                <a href="#">4</a>
                <a href="#">5</a>
                <a href="#">...</a>
                <a href="#">1041</a>
                <a href="#">${nextText}</a>`;
}

// ─── Replace section between markers in HTML ───
function replaceBetween(html, startStr, endStr, newContent) {
  const startIdx = html.indexOf(startStr);
  if (startIdx === -1) {
    console.warn(`  ⚠️ Marker not found: "${startStr.trim()}"`);
    return html;
  }
  const endIdx = html.indexOf(endStr, startIdx + startStr.length);
  if (endIdx === -1) {
    console.warn(`  ⚠️ End marker not found: "${endStr.trim()}"`);
    return html;
  }
  return html.slice(0, startIdx + startStr.length) + '\n' + newContent + '\n            ' + html.slice(endIdx);
}

// ─── Replace section using regex (for deeply nested elements) ───
function replaceSectionRegex(html, startPattern, endPattern, newContent) {
  const regex = new RegExp('(' + startPattern + ')([\\s\\S]*?)(' + endPattern + ')');
  const match = html.match(regex);
  if (!match) {
    console.warn(`  ⚠️ Pattern not found: ${startPattern} ... ${endPattern}`);
    return html;
  }
  return html.replace(regex, '$1\n' + newContent + '\n            $3');
}

// ─── Build: Products Page ───
function buildProductsPage(lang) {
  const dir = OUT[lang];
  const filePath = path.join(dir, 'products.html');
  
  console.log(`\n📦 Building products.html [${lang.toUpperCase()}]...`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ ${filePath} not found, skipping.`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Generate dynamic content
  const filterSidebar = generateFilterSidebar(lang);
  const toolbar = generateToolbar(lang);
  const productGrid = generateProductGrid(lang);
  const pagination = generatePagination(lang);

  // Replace filter sidebar
  html = replaceBetween(
    html,
    '<aside class="filter-sidebar">',
    '</aside>',
    filterSidebar
  );

  // Replace toolbar (use product-grid as end marker since </div> would match inner divs)
  html = replaceBetween(
    html,
    '<div class="products-toolbar">',
    '<div class="product-grid">',
    toolbar + '\n            </div>\n\n            '
  );

  // Replace product grid (add closing </div> since it's between product-grid and pagination)
  html = replaceBetween(
    html,
    '<div class="product-grid">',
    '<div class="pagination">',
    productGrid + '\n            </div>\n\n            '
  );

  // Replace pagination (use </main> as end marker)
  html = replaceBetween(
    html,
    '<div class="pagination">',
    '</main>',
    pagination + '\n            </div>\n\n        '
  );

  // Update meta info (total products count etc.)
  const today = new Date().toISOString().split('T')[0];
  html = html.replace(/data-updated="[^"]*"/, `data-updated="${today}"`);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  ✅ ${filePath} updated (${products.length} products, ${categories.length} categories)`);
}

// ─── Build: Deals Section (for index.html) ───
// Deal i18n strings (not in i18n.json, specific to deals section)
const DEAL_I18N = {
  only_left: {
    en: (n) => `🔥 <strong>Only ${n} cartons left</strong>`,
    es: (n) => `🔥 <strong>Solo ${n} cajas restantes</strong>`,
    ar: (n) => `🔥 <strong>يتبقى ${n} صندوق فقط</strong>`
  },
  inquire_btn: {
    en: 'INQUIRE NOW →',
    es: 'SOLICITAR AHORA →',
    ar: 'اطلب الآن ←'
  },
  badge_best_seller: { en: 'BEST SELLER', es: 'MÁS VENDIDO', ar: 'الأكثر مبيعاً' },
  badge_price_crunch: { en: 'PRICE CRUNCH', es: 'BAJADA DE PRECIO', ar: 'تخفيض السعر' }
};

function generateDealsSection(lang) {
  const dealsHTML = deals.map((deal, i) => {
    const imgPath = getImagePath(deal.image, lang);
    const name = deal.name[lang] || deal.name.en;
    const desc = deal.desc[lang] || deal.desc.en;
    const dealNum = i + 1;
    
    // Badge
    let badgeHTML = '';
    if (deal.badge === 'best_seller') {
      const badgeText = DEAL_I18N.badge_best_seller[lang] || DEAL_I18N.badge_best_seller.en;
      badgeHTML = `                    <div class="deal-badge">${badgeText}</div>\n`;
    } else if (deal.badge === 'price_crunch') {
      const badgeText = DEAL_I18N.badge_price_crunch[lang] || DEAL_I18N.badge_price_crunch.en;
      badgeHTML = `                    <div class="deal-badge orange">${badgeText}</div>\n`;
    }

    const stockLine = DEAL_I18N.only_left[lang](deal.stock_remaining);
    const inquireBtn = DEAL_I18N.inquire_btn[lang] || DEAL_I18N.inquire_btn.en;
    const inquiryLink = lang === 'en' ? '#inquiry-form' : '#inquiry-form';

    return `                <div class="deal-card deal-${dealNum}">
                    <img class="deal-img" src="${imgPath}" alt="${name}">
${badgeHTML}                    <div class="deal-info">
                        <h3>${name}</h3>
                        <p>${desc}</p>
                        <div class="deal-stock-line">${stockLine} · <span class="countdown" data-deadline="${deal.countdown_days}">${deal.countdown_days}d 0h</span></div>
                        <a href="${inquiryLink}" class="btn-inquire" data-product="${name}">${inquireBtn}</a>
                    </div>
                </div>`;
  }).join('\n\n');

  return dealsHTML;
}

function buildDealsSection(lang) {
  const dir = OUT[lang];
  const filePath = path.join(dir, 'index.html');
  
  console.log(`\n🔥 Building deals section [${lang.toUpperCase()}]...`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ ${filePath} not found, skipping.`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  const dealsHTML = generateDealsSection(lang);

  // Replace deals grid using regex (handles deeply nested deal-card divs)
  // Pattern: <div class="deals-grid"> ... </div>\n        </div>\n    </section>
  // $3 already contains the closing tags, so newContent is just the deal cards
  html = replaceSectionRegex(
    html,
    '<div class="deals-grid">',
    '<\\/div>\\s*<\\/div>\\s*<\\/section>',
    dealsHTML
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  ✅ ${filePath} deals section updated (${deals.length} deals)`);
}

// ─── Build: Form Actions (Formspree) ───
// Maps form elements to Formspree form IDs
const FORM_MAP = [
  { selector: 'quickInquiryForm', formKey: 'inquiry' },
  { selector: 'inquiry-form', formKey: 'inquiry' },
  { selector: 'sourcingRequestForm', formKey: 'sourcing' },
  { selector: 'sourcing-request-form', formKey: 'sourcing' },
  { selector: 'exitPopupForm', formKey: 'exit_popup' },
  { selector: 'exit-popup-form', formKey: 'exit_popup' },
  { selector: 'sell-form', formKey: 'sell' },
  { selector: 'contact-form', formKey: 'contact' }
];

function buildFormActions(lang) {
  const dir = OUT[lang];
  
  console.log(`\n📝 Updating form actions [${lang.toUpperCase()}]...`);
  
  const htmlFiles = ['index.html', 'products.html', 'contact.html', 'sell.html']
    .filter(f => fs.existsSync(path.join(dir, f)));

  let updatedCount = 0;

  htmlFiles.forEach(file => {
    const filePath = path.join(dir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Replace existing formspree action URLs with correct IDs per form
    FORM_MAP.forEach(({ selector, formKey }) => {
      const formId = formsData.forms[formKey] || 'your-form-id';
      const formAction = `https://formspree.io/f/${formId}`;

      // Pattern: <form ... id="selector" ...> (without action)
      // Add action and method attributes
      const formRegex = new RegExp(
        `(<form\\s+[^>]*?(?:id="${selector}"|class="[^"]*${selector}[^"]*")[^>]*?)(>)`,
        'g'
      );
      
      html = html.replace(formRegex, (match, before, after) => {
        if (match.includes('action=')) {
          // Form already has action, replace the ID
          return match.replace(
            /action="https:\/\/formspree\.io\/f\/[^"]*"/,
            `action="${formAction}"`
          );
        }
        // Add action and method
        modified = true;
        return `${before} action="${formAction}" method="POST"${after}`;
      });

      // Also match forms with id selector in different order
      const formRegex2 = new RegExp(
        `(<form\\s+[^>]*?(?:class="[^"]*${selector}[^"]*"|id="${selector}")[^>]*?)(>)`,
        'g'
      );
      
      html = html.replace(formRegex2, (match, before, after) => {
        if (match.includes('action=')) {
          return match.replace(
            /action="https:\/\/formspree\.io\/f\/[^"]*"/,
            `action="${formAction}"`
          );
        }
        modified = true;
        return `${before} action="${formAction}" method="POST"${after}`;
      });
    });

    // 2. Replace any remaining "your-form-id" placeholders
    const beforeReplace = html;
    html = html.replace(
      /action="https:\/\/formspree\.io\/f\/your-form-id"/g,
      (match) => {
        // Determine which form this belongs to based on context
        return match; // Will be handled by the FORM_MAP above
      }
    );

    // Handle bare <form> tag (sell form on index.html — no id/class)
    if (file === 'index.html') {
      const sellFormId = formsData.forms.sell || 'your-form-id';
      const sellAction = `https://formspree.io/f/${sellFormId}`;
      html = html.replace(
        /<form>\n/,
        `<form action="${sellAction}" method="POST">\n`
      );
    }

    if (html !== beforeReplace || modified) {
      // Check if we actually changed anything by re-reading
      const original = fs.readFileSync(filePath, 'utf8');
      if (html !== original) {
        fs.writeFileSync(filePath, html, 'utf8');
        updatedCount++;
        console.log(`  ✅ ${file} form actions updated`);
      }
    }
  });

  if (updatedCount === 0) {
    console.log(`  ℹ️  No form actions to update (already configured or no forms found)`);
  }
}

// ─── Main ───
function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  CheapALot Build Script v1.0                 ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📊 Data: ${products.length} products, ${categories.length} categories, ${deals.length} deals`);
  console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`🌐 Languages: EN, ES, AR`);

  const args = process.argv.slice(2);
  const buildAll = args.length === 0;
  const buildProductsFlag = buildAll || args.includes('--products');
  const buildDealsFlag = buildAll || args.includes('--deals');
  const buildFormsFlag = buildAll || args.includes('--forms');

  const langs = ['en', 'es', 'ar'];

  if (buildProductsFlag) {
    console.log('\n' + '─'.repeat(50));
    console.log('📦 Building Products Pages');
    console.log('─'.repeat(50));
    langs.forEach(lang => buildProductsPage(lang));
  }

  if (buildDealsFlag) {
    console.log('\n' + '─'.repeat(50));
    console.log('🔥 Building Deals Sections');
    console.log('─'.repeat(50));
    langs.forEach(lang => buildDealsSection(lang));
  }

  if (buildFormsFlag) {
    console.log('\n' + '─'.repeat(50));
    console.log('📝 Updating Form Actions');
    console.log('─'.repeat(50));
    langs.forEach(lang => buildFormActions(lang));
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Build complete!');
  console.log('═'.repeat(50));
  console.log('\n💡 Next steps:');
  console.log('   1. Review the generated HTML');
  console.log('   2. git add -A && git commit -m "build: regenerate from JSON data"');
  console.log('   3. git push origin main → Vercel auto-deploys');
  
  // Show Formspree status
  const unconfigured = Object.entries(formsData.forms).filter(([k, v]) => v === 'your-form-id');
  if (unconfigured.length > 0) {
    console.log('\n⚠️  Formspree not configured yet!');
    console.log('   Forms using placeholder: ' + unconfigured.map(([k]) => k).join(', '));
    console.log('   → Sign up at https://formspree.io');
    console.log('   → Update data/forms.json with your form IDs');
    console.log('   → Run: node build/build-products.js --forms');
  }
}

main();
