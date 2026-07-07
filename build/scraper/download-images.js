/**
 * CheapALot — 图片下载器
 * 下载远程产品图片到 images/products/ 目录
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images', 'products', 'scraped');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': new URL(url).origin,
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });
      fileStream.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Download timeout: ' + url));
    });
  });
}

/**
 * 下载图片并返回本地相对路径
 * @param {string} imageUrl - 远程图片 URL
 * @param {string} productId - 产品 ID (如 "scraped_1")
 * @returns {Promise<string>} - 本地路径 (如 "images/products/scraped/scraped_1.jpg")
 */
async function downloadProductImage(imageUrl, productId) {
  if (!imageUrl) return '';

  ensureDir(IMAGES_DIR);

  // 确定文件扩展名
  let ext = '.jpg';
  const urlLower = imageUrl.toLowerCase();
  if (urlLower.includes('.png')) ext = '.png';
  else if (urlLower.includes('.webp')) ext = '.webp';
  else if (urlLower.includes('.jpeg')) ext = '.jpeg';

  const filename = productId + ext;
  const destPath = path.join(IMAGES_DIR, filename);
  const relativePath = `images/products/scraped/${filename}`;

  try {
    await downloadFile(imageUrl, destPath);
    console.log(`  [image] Downloaded: ${relativePath}`);
    return relativePath;
  } catch (err) {
    console.error(`  [image] Failed: ${imageUrl} — ${err.message}`);
    // Return empty string on failure; product will use placeholder
    return '';
  }
}

/**
 * 批量下载图片
 * @param {Array} products - 爬取的产品列表
 * @returns {Promise<Array>} - 添加了 localImage 字段的产品列表
 */
async function downloadAllImages(products) {
  console.log(`\n[image] Downloading ${products.length} images...`);
  ensureDir(IMAGES_DIR);

  const results = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const productId = `scraped_${Date.now()}_${i + 1}`;
    const localImage = await downloadProductImage(p.imageUrl, productId);
    results.push({ ...p, localImage, id: productId });
  }

  const success = results.filter(p => p.localImage).length;
  console.log(`[image] Downloaded ${success}/${products.length} images successfully`);
  return results;
}

module.exports = {
  downloadProductImage,
  downloadAllImages,
  IMAGES_DIR,
};
