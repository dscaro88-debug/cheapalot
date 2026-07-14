#!/usr/bin/env node
/**
 * Sync Script: Supabase → products.json → git push → Vercel deploy
 * 
 * Usage:
 *   node build/sync-supabase.js              # Sync and push
 *   node build/sync-supabase.js --no-push     # Sync only, don't push
 *   node build/sync-supabase.js --dry-run     # Preview what would be synced
 * 
 * This script:
 *   1. Fetches approved products from Supabase
 *   2. Downloads product images
 *   3. Converts to products.json format
 *   4. Merges with existing products (preserves non-Supabase products)
 *   5. Updates products.json
 *   6. Git commit + push → Vercel auto-deploys
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Load config
const config = require('../js/supabase-config.js');

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = config.SUPABASE_SERVICE_KEY;

const NO_PUSH = process.argv.includes('--no-push');
const DRY_RUN = process.argv.includes('--dry-run');

// Paths
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_JSON = path.join(ROOT, 'data', 'products.json');
const IMAGES_DIR = path.join(ROOT, 'images', 'products', 'suppliers');

// CNY to GBP rate
const CNY_TO_GBP = 0.1075;

// ============= HELPER: fetch from Supabase =============
function supabaseFetch(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ============= HELPER: download image =============
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(filepath);
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// ============= MAIN =============
async function main() {
  console.log('=== CheapALot Supabase Sync ===\n');

  if (SUPABASE_URL === 'YOUR_PROJECT_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY') {
    console.error('ERROR: Supabase not configured!');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in js/supabase-config.js');
    process.exit(1);
  }

  // 1. Fetch approved products
  console.log('1. Fetching approved products from Supabase...');
  const products = await supabaseFetch(
    'products?status=eq.approved&order=created_at.desc'
  );
  console.log(`   Found ${products.length} approved products`);

  if (products.length === 0) {
    console.log('   No approved products to sync. Exiting.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN PREVIEW ---');
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name_en} - ¥${p.price_cny_low} (${p.category})`);
    });
    console.log('\nNo changes made.');
    return;
  }

  // 2. Fetch suppliers for each product
  console.log('\n2. Fetching supplier info...');
  const supplierIds = [...new Set(products.map(p => p.supplier_id))];
  const suppliersMap = {};
  for (const sid of supplierIds) {
    const supplier = await supabaseFetch(`suppliers?id=eq.${sid}`);
    if (supplier[0]) {
      suppliersMap[sid] = supplier[0];
    }
  }
  console.log(`   Got info for ${Object.keys(suppliersMap).length} suppliers`);

  // 3. Download images
  console.log('\n3. Downloading product images...');
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const productRecords = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`   [${i + 1}/${products.length}] ${p.name_en}`);

    let localImage = '';
    if (p.image_url) {
      const ext = path.extname(new URL(p.image_url).pathname).split('.').pop() || 'jpg';
      const filename = `sup_${p.id.substring(0, 8)}.${ext}`;
      const filepath = path.join(IMAGES_DIR, filename);
      
      try {
        await downloadImage(p.image_url, filepath);
        localImage = `images/products/suppliers/${filename}`;
      } catch (err) {
        console.log(`      Warning: Image download failed: ${err.message}`);
        localImage = 'images/products/placeholder.jpg';
      }
    } else {
      localImage = 'images/products/placeholder.jpg';
    }

    // 4. Convert to products.json format
    const priceGbp = (p.price_cny_low * CNY_TO_GBP).toFixed(2);
    const priceHighGbp = p.price_cny_high ? (p.price_cny_high * CNY_TO_GBP).toFixed(2) : null;

    productRecords.push({
      id: `sup_${p.id.substring(0, 8)}`,
      source: 'supabase',
      name: p.name_en,
      name_zh: p.name_zh || '',
      description: p.description || '',
      category: p.category_slug || 'other',
      category_name: p.category || 'Other',
      price_low: parseFloat(p.price_cny_low),
      price_high: p.price_cny_high ? parseFloat(p.price_cny_high) : null,
      price_cny: p.price_cny_low,
      price_gbp: parseFloat(priceGbp),
      price_display: `£${priceGbp}${priceHighGbp ? ` - £${priceHighGbp}` : ''}`,
      original_price_cny: `¥${p.price_cny_low}${p.price_cny_high ? `~¥${p.price_cny_high}` : ''}`,
      moq: p.moq || 1,
      unit: p.unit || 'per piece',
      price_unit: p.unit === 'dozen' ? 'per dozen' : 
                   p.unit === 'set' ? 'per set' :
                   p.unit === 'box' ? 'per box' :
                   p.unit === 'kg' ? 'per kg' :
                   p.unit === 'meter' ? 'per meter' :
                   p.unit === 'roll' ? 'per roll' :
                   p.unit === 'pair' ? 'per pair' : 'per piece',
      stock: p.stock_qty || null,
      image: localImage,
      image_url: p.image_url || '',
      supplier_id: p.supplier_id,
      created_at: p.created_at,
      translations: {
        en: p.name_en,
        es: p.name_en, // Translation handled by existing build process
        ar: p.name_en
      }
    });
  }

  // 5. Merge with existing products
  console.log('\n4. Merging with existing products...');
  const existingData = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  
  // Remove old supabase products, keep others
  const nonSupabaseProducts = existingData.filter(p => p.source !== 'supabase');
  const mergedProducts = [...nonSupabaseProducts, ...productRecords];
  
  console.log(`   Non-Supabase products kept: ${nonSupabaseProducts.length}`);
  console.log(`   Supabase products added: ${productRecords.length}`);
  console.log(`   Total products: ${mergedProducts.length}`);

  // 6. Write updated products.json
  console.log('\n5. Writing products.json...');
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(mergedProducts, null, 2));
  console.log('   products.json updated');

  // 7. Mark products as published
  console.log('\n6. Marking products as published...');
  for (const p of products) {
    const updateUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${p.id}`;
    const updateData = JSON.stringify({ status: 'published' });
    
    await new Promise((resolve, reject) => {
      const options = {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      };
      
      const req = https.request(updateUrl, options, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.write(updateData);
      req.end();
    });
  }
  console.log(`   ${products.length} products marked as published`);

  // 8. Rebuild HTML
  console.log('\n7. Rebuilding product HTML...');
  try {
    execSync('node build/build-products.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.log('   Warning: Build script not found or failed. HTML may need manual rebuild.');
  }

  // 9. Git push
  if (NO_PUSH) {
    console.log('\n8. Skipping git push (--no-push flag)');
  } else {
    console.log('\n8. Committing and pushing to GitHub...');
    try {
      execSync('git add -A', { cwd: ROOT });
      execSync(`git commit -m "Sync ${productRecords.length} supplier products from Supabase"`, { cwd: ROOT });
      execSync('git push origin main', { cwd: ROOT });
      console.log('   Pushed! Vercel will deploy in 1-2 minutes.');
    } catch (err) {
      console.log('   Git push failed. You may need to push manually.');
      console.log(`   Error: ${err.message}`);
    }
  }

  console.log('\n=== Sync Complete ===');
  console.log(`   Products synced: ${productRecords.length}`);
  console.log(`   Total products on site: ${mergedProducts.length}`);
  
  // 10. Save supplier data
  const supplierData = Object.values(suppliersMap).map(s => ({
    id: s.id,
    company_name: s.company_name,
    contact_name: s.contact_name,
    email: s.email,
    phone: s.phone,
    city: s.city,
    product_count: products.filter(p => p.supplier_id === s.id).length
  }));
  
  const today = new Date().toISOString().split('T')[0];
  const supplierPath = path.join(require('os').homedir(), 'Desktop', 'cheapalot', `供应商资料_${today}.json`);
  try {
    fs.writeFileSync(supplierPath, JSON.stringify(supplierData, null, 2));
    console.log(`   Supplier data saved: ${supplierPath}`);
  } catch (err) {
    // Fallback to project dir
    const fallbackPath = path.join(ROOT, `tmp-supplier-${today}.json`);
    fs.writeFileSync(fallbackPath, JSON.stringify(supplierData, null, 2));
    console.log(`   Supplier data saved: ${fallbackPath}`);
  }
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
