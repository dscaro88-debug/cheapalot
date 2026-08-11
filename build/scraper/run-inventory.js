/**
 * CheapALot — 统一库存(尾货)采集编排器
 *
 * 三路库存汇入同一 overstock 池:
 *   1) 自动爬取  — 义乌购清仓搜索 + 海外清仓站(UK) + 1688(实验性)
 *   2) 手动上传  — CARO 在 upload.html 新增(走 products.json manual 源)
 *   3) 供应商门户 — 合作供应商通过 supplier-portal.html 提交, 进 pending 审批
 *
 * 本脚本只负责「自动爬取」这一路, 并把结果安全合并进 data/products.json:
 *   - 仅替换「本次实际爬到数据的来源」对应的旧 overstock 记录
 *   - 爬取失败/返回 0 的来源 → 保留其原有记录(不误删)
 *   - 代理目录(yiwugo/agent) 与 手动上传 永远保留
 *   - 若全部爬取失败(0 条) → 不改动 products.json, 不触发部署
 *
 * 用法:
 *   node build/scraper/run-inventory.js                 # 爬取并合入, 不推送
 *   node build/scraper/run-inventory.js --push          # 爬取 + git push(Vercel 自动部署)
 *   node build/scraper/run-inventory.js --max-pages=1   # 测试(每源更少页)
 *   GIT_AUTO_PUSH=1 node build/scraper/run-inventory.js # 环境变量控制推送
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { scrapeYiwugoClearance } = require('./yiwugo-scraper');
const { scrapeAll } = require('./scraper-core');
const { normalizeProducts } = require('./normalize');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PRODUCTS_JSON = path.join(PROJECT_ROOT, 'data', 'products.json');

function readProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
}

function maxNumericId(products) {
  let max = 0;
  for (const p of products) {
    const m = String(p.id || '').match(/p(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return max;
}

async function main() {
  const args = process.argv.slice(2);
  const doPush = args.includes('--push') || process.env.GIT_AUTO_PUSH === '1';
  const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 2;

  console.log('========================================');
  console.log('  CheapALot — 库存(尾货)自动采集');
  console.log('========================================');

  const rawAll = [];

  // ── 路1: 义乌购清仓/尾货搜索(中文真实库存信号) ──
  try {
    console.log('\n[1/2] 义乌购清仓搜索...');
    const { products } = await scrapeYiwugoClearance({ maxPages, downloadImages: false });
    console.log(`  → 义乌购清仓: ${products.length} 条`);
    rawAll.push(...products);
  } catch (e) {
    console.error('  [义乌购清仓] 失败(跳过):', e.message);
  }

  // ── 路1: 海外清仓站 + 1688(scraper-core 通用引擎) ──
  try {
    console.log('\n[2/2] 海外清仓站 + 1688...');
    const results = await scrapeAll({ maxPages });
    for (const [site, prods] of Object.entries(results)) {
      console.log(`  → ${site}: ${prods.length} 条`);
      rawAll.push(...prods);
    }
  } catch (e) {
    console.error('  [海外清仓] 失败(跳过):', e.message);
  }

  console.log(`\n[汇总] 本次爬取原始商品: ${rawAll.length} 条`);

  if (rawAll.length === 0) {
    console.log('[安全] 全部来源 0 条, 不改动 products.json, 结束。');
    return;
  }

  // 让清仓品直接使用远程图片(免去下载, CI 更快)
  rawAll.forEach(p => { if (p.imageUrl && !p.localImage) p.localImage = p.imageUrl; });

  // 归一化(翻译 + 三态映射 + stock_signal/verified)
  const normalized = await normalizeProducts(rawAll, {});
  console.log(`[归一化] ${normalized.length} 条 overstock 就绪`);

  // ── 安全合并 ──
  const existing = readProducts();
  const existingProducts = existing.products || [];

  // 仅替换「本次实际有数据的来源」, 失败的源保留旧记录
  const scrapedSources = new Set(normalized.map(p => p.source).filter(Boolean));
  const kept = existingProducts.filter(p => !scrapedSources.has(p.source));

  // 分配新 ID
  let nextId = maxNumericId(existingProducts) + 1;
  normalized.forEach(p => { p.id = `p${nextId++}`; });

  const merged = [...kept, ...normalized];

  existing.products = merged;
  existing.meta = existing.meta || {};
  existing.meta.updated = new Date().toISOString().split('T')[0];
  existing.meta.total_products = merged.length;
  existing.meta.total_display = merged.length.toLocaleString('en-US');
  existing.meta.last_inventory_crawl = new Date().toISOString();

  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(existing, null, 1), 'utf8');
  console.log(`[合并] 保留 ${kept.length} + 新增 ${normalized.length} = ${merged.length} 条`);

  // ── 部署 ──
  if (doPush) {
    try {
      execSync('git add -A', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      execSync('git commit -m "inventory: auto-crawled overstock from web"', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      execSync('git push origin main', { cwd: PROJECT_ROOT, stdio: 'inherit', timeout: 60000 });
      console.log('[部署] 已推送, Vercel 将自动更新。');
    } catch (e) {
      console.error('[部署] git push 失败:', e.message);
    }
  } else {
    console.log('[部署] 未推送(加 --push 或设 GIT_AUTO_PUSH=1)。本地 products.json 已更新。');
  }

  console.log('\n========================================');
  console.log('  库存采集完成!');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
