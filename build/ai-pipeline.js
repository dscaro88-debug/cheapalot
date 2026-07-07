#!/usr/bin/env node
/**
 * AI Pipeline Orchestrator
 * 
 * Full pipeline: Parse supplier text → Update products.json → Build HTML → Git push
 * 
 * Usage:
 *   node build/ai-pipeline.js <supplier-input-file>
 *   node build/ai-pipeline.js --mock                  # End-to-end test with mock data
 *   echo "supplier message" | node build/ai-pipeline.js
 * 
 * Environment:
 *   OPENAI_API_KEY  - Required for real GPT-4 parsing (skip with --mock)
 *   GIT_AUTO_PUSH   - Set to "1" to auto-push (default: disabled)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PRODUCTS_JSON = path.join(PROJECT_ROOT, 'data', 'products.json');
const BUILD_SCRIPT = path.join(PROJECT_ROOT, 'build', 'build-products.js');
const PARSE_SCRIPT = path.join(PROJECT_ROOT, 'build', 'ai-parse-supplier.js');
const NODE_BIN = process.env.NODE_BIN || process.execPath;

function log(msg) { console.log('[pipeline] ' + msg); }
function logErr(msg) { console.error('[pipeline] ' + msg); }

function runNode(scriptPath, args) {
  args = args || [];
  const result = spawnSync(NODE_BIN, [scriptPath].concat(args), {
    cwd: PROJECT_ROOT, encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '' }
  });
  if (result.status !== 0) {
    throw new Error('Script failed: ' + scriptPath + '\n' + result.stderr);
  }
  return result.stdout;
}

function gitCommit(message) {
  try {
    execSync('git add -A', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const status = execSync('git status --short', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    if (!status.trim()) { log('No changes to commit.'); return null; }
    execSync('git commit -m "' + message.replace(/"/g, '\\"') + '"', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
    log('✅ Committed: ' + commitHash);
    if (process.env.GIT_AUTO_PUSH === '1') {
      execSync('git push origin main', { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 30000 });
      log('✅ Pushed to GitHub. Vercel will auto-deploy.');
    } else {
      log('⚠️  Auto-push disabled. Run: git push origin main');
    }
    return commitHash;
  } catch (err) {
    logErr('Git operation failed: ' + err.message);
    return null;
  }
}

function getNextProductId(existingProducts) {
  let maxNum = 0;
  existingProducts.forEach(function(p) {
    var match = p.id && p.id.match(/^p(\d+)$/);
    if (match) { var num = parseInt(match[1]); if (num > maxNum) maxNum = num; }
  });
  return 'p' + (maxNum + 1);
}

function mergeProducts(newProducts) {
  const data = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  const existingIds = new Set(data.products.map(function(p) { return p.id; }));
  let nextId = getNextProductId(data.products);
  let nextNum = parseInt(nextId.slice(1));
  let added = 0;
  let imageCounter = data.products.length + 1;

  newProducts.forEach(function(product) {
    var id = 'p' + nextNum;
    while (existingIds.has(id)) { nextNum++; id = 'p' + nextNum; }
    existingIds.add(id);
    if (product.image === 'PLACEHOLDER' || !product.image) {
      product.image = 'images/products/p' + imageCounter + '.jpg';
    }
    product.id = id;
    data.products.push(product);
    added++;
    nextNum++;
    imageCounter++;
  });

  data.meta.total_products = data.products.length;
  data.meta.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log('📦 Added ' + added + ' product(s) to products.json (total: ' + data.products.length + ')');
  return added;
}

async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');

  log('========================================');
  log('  CheapALot AI Inventory Pipeline');
  log('========================================');
  log('  Mode: ' + (useMock ? 'MOCK (no API)' : 'LIVE (GPT-4)'));
  log('  Time: ' + new Date().toISOString());
  log('========================================');

  log('\n📥 Step 1: Parsing supplier input...');
  var products;
  if (useMock) {
    var output = runNode(PARSE_SCRIPT, ['--mock']);
    products = JSON.parse(output.trim());
  } else {
    var inputFile = args.find(function(a) { return !a.startsWith('--'); });
    var parseArgs = inputFile ? [inputFile] : [];
    var output2 = runNode(PARSE_SCRIPT, parseArgs);
    products = JSON.parse(output2.trim());
  }

  if (!products || products.length === 0) {
    logErr('❌ No products parsed. Exiting.');
    process.exit(1);
  }
  log('   Parsed ' + products.length + ' product(s)');

  log('\n📝 Step 2: Updating products.json...');
  var added = mergeProducts(products);
  if (added === 0) { log('No new products to add. Exiting.'); process.exit(0); }

  log('\n🏗️  Step 3: Building HTML pages...');
  try {
    runNode(BUILD_SCRIPT);
    log('   Build completed successfully.');
  } catch (err) {
    logErr('❌ Build failed: ' + err.message);
    logErr('   Reverting products.json changes...');
    execSync('git checkout -- data/products.json', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    process.exit(1);
  }

  log('\n🚀 Step 4: Committing and pushing...');
  var commitMsg = 'feat: add ' + added + ' product(s) via AI pipeline\\n\\nParsed from supplier input at ' + new Date().toISOString();
  var commitHash = gitCommit(commitMsg);

  log('\n========================================');
  log('  Pipeline Complete!');
  log('========================================');
  log('  Products added: ' + added);
  log('  Commit: ' + (commitHash || 'N/A'));
  log('  Deploy: ' + (process.env.GIT_AUTO_PUSH === '1' ? 'Vercel auto-deploying (1-2 min)' : 'Run "git push origin main" to deploy'));
  log('========================================\n');
}

main().catch(function(err) { logErr('Fatal error: ' + err.message); process.exit(1); });
