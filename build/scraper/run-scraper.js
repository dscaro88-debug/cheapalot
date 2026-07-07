/**
 * CheapALot — 爬虫主控脚本
 *
 * 完整流程: 爬取 → 下载图片 → 归一化 → 合并到 products.json → 构建 HTML → Git push
 *
 * 用法:
 *   node build/scraper/run-scraper.js                    # 爬取所有站点
 *   node build/scraper/run-scraper.js wholesaleclearance   # 只爬取指定站点
 *   node build/scraper/run-scraper.js --no-push           # 不执行 git push
 *   node build/scraper/run-scraper.js --max-pages 1       # 限制每站最多1页
 *
 * 环境变量:
 *   OPENAI_API_KEY  — 可选, 用于 GPT-4 翻译 (不设则用简单翻译)
 *   GIT_AUTO_PUSH   — 设为 '1' 自动 git push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { scrapeSite, scrapeAll } = require('./scraper-core');
const { downloadAllImages } = require('./download-images');
const { normalizeProducts } = require('./normalize');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PRODUCTS_JSON = path.join(PROJECT_ROOT, 'data', 'products.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 读取现有 products.json
 */
function readProducts() {
  const raw = fs.readFileSync(PRODUCTS_JSON, 'utf8');
  return JSON.parse(raw);
}

/**
 * 将新产品合并到 products.json
 * 策略: 替换所有爬取来源的产品, 保留手动添加的产品
 */
function mergeProducts(existing, newProducts) {
  // 保留非 scraped 来源的产品
  const manualProducts = (existing.products || []).filter(
    p => !p.source || (p.source !== 'scraped' && !p.source.includes('Wholesale') && !p.source.includes('EnviroStock') && !p.source.includes('Wholesaler'))
  );

  // 找到最大 ID 数字
  let maxId = 0;
  existing.products.forEach(p => {
    const match = (p.id || '').match(/p(\d+)/i);
    if (match) maxId = Math.max(maxId, parseInt(match[1]));
  });
  newProducts.forEach(p => {
    const match = (p.id || '').match(/_(\d+)$/);
    if (match) maxId = Math.max(maxId, parseInt(match[1]));
  });

  // 给新产品分配 p{N} 格式 ID
  newProducts.forEach((p, i) => {
    p.id = `p${maxId + i + 1}`;
    // 更新图片路径中的 ID
    if (p.image && p.image.includes('scraped_')) {
      // 图片路径保持原样, 用 scraped_ 前缀
    }
  });

  // 合并
  const allProducts = [...manualProducts, ...newProducts];

  // 更新 meta
  existing.meta = existing.meta || {};
  existing.meta.updated = new Date().toISOString().split('T')[0];
  existing.meta.total_products = allProducts.length;
  existing.meta.total_display = allProducts.length.toLocaleString('en-US');

  existing.products = allProducts;
  return existing;
}

/**
 * 运行构建脚本
 */
function runBuild() {
  console.log('\n[build] Running build-products.js...');
  try {
    const cmd = `node "${path.join(PROJECT_ROOT, 'build', 'build-products.js')}"`;
    execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
    console.log('[build] Build completed.');
  } catch (err) {
    console.error('[build] Build failed:', err.message);
  }
}

/**
 * Git push
 */
function gitPush() {
  console.log('\n[git] Committing and pushing...');
  try {
    execSync('git add -A', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    execSync('git commit -m "scraper: auto-scraped inventory from wholesale sites"', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    execSync('git push origin main', { cwd: PROJECT_ROOT, stdio: 'inherit', timeout: 30000 });
    console.log('[git] Pushed successfully. Vercel will auto-deploy in 1-2 minutes.');
  } catch (err) {
    console.error('[git] Git push failed:', err.message);
    console.error('[git] You can manually push later with: git push origin main');
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const noPush = args.includes('--no-push');
  const maxPagesArg = args.find(a => a.startsWith('--max-pages'));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : null;

  // 确定爬取哪些站点
  const siteArg = args.find(a => !a.startsWith('--'));
  const options = {};
  if (maxPages) options.maxPages = maxPages;

  console.log('========================================');
  console.log('  CheapALot — Inventory Scraper');
  console.log('========================================');

  let allScraped = [];

  if (siteArg) {
    // 只爬取指定站点
    console.log(`\n[main] Scraping single site: ${siteArg}`);
    const products = await scrapeSite(siteArg, options);
    allScraped = products;
  } else {
    // 爬取所有站点
    console.log('\n[main] Scraping all configured sites...');
    const results = await scrapeAll(options);
    for (const [siteKey, products] of Object.entries(results)) {
      allScraped = allScraped.concat(products);
    }
  }

  console.log(`\n[main] Total scraped products: ${allScraped.length}`);

  if (allScraped.length === 0) {
    console.log('[main] No products scraped. Exiting.');
    return;
  }

  // 打印摘要
  console.log('\n--- Scraped Products Summary ---');
  allScraped.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title.substring(0, 60)}`);
    console.log(`     Price: ${p.priceDisplay || p.price} | Category: ${p.category} | Source: ${p.source}`);
    console.log(`     Image: ${p.imageUrl ? 'YES' : 'NO'} | SKU: ${p.sku || 'N/A'}`);
  });
  if (allScraped.length > 10) {
    console.log(`  ... and ${allScraped.length - 10} more`);
  }
  console.log('--- End Summary ---\n');

  // Step 2: 下载图片
  console.log('[main] Step 2: Downloading product images...');
  const productsWithImages = await downloadAllImages(allScraped);

  // Step 3: 归一化数据
  console.log('[main] Step 3: Normalizing data and translating...');
  const normalized = await normalizeProducts(productsWithImages);

  // Step 4: 合并到 products.json
  console.log('[main] Step 4: Merging into products.json...');
  const existing = readProducts();
  const merged = mergeProducts(existing, normalized);
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`[main] products.json updated. Total products: ${merged.products.length}`);

  // Step 5: 构建 HTML
  console.log('[main] Step 5: Building HTML...');
  runBuild();

  // Step 6: Git push (可选)
  if (!noPush && (process.env.GIT_AUTO_PUSH === '1' || !process.env.GIT_AUTO_PUSH)) {
    const shouldPush = process.env.GIT_AUTO_PUSH === '1';
    if (shouldPush) {
      console.log('[main] Step 6: Git push...');
      gitPush();
    } else {
      console.log('[main] Step 6: Skipped git push (set GIT_AUTO_PUSH=1 to auto-push)');
      console.log('[main] To deploy manually: git add -A && git commit -m "scraper update" && git push origin main');
    }
  }

  console.log('\n========================================');
  console.log('  Scraper pipeline complete!');
  console.log('========================================');
  console.log(`  Products scraped: ${allScraped.length}`);
  console.log(`  Products in JSON: ${merged.products.length}`);
  console.log(`  Images downloaded: ${productsWithImages.filter(p => p.localImage).length}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
