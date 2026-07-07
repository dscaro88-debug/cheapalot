/**
 * CheapALot — 爬虫核心引擎
 * 支持: 静态站点(HTTP+Cheerio) / 动态站点(Playwright)
 *
 * 用法:
 *   const { scrapeSite } = require('./scraper-core');
 *   const products = await scrapeSite('wholesaleclearance');
 */

const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const sites = require('./sites');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchHTML(redirectUrl).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout: ' + url));
    });
  });
}

async function fetchDynamicHTML(url) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000); // wait for lazy images
  const html = await page.content();
  await browser.close();
  return html;
}

/**
 * 从 HTML 中解析产品列表
 */
function parseProducts(html, siteConfig) {
  const $ = cheerio.load(html);
  const s = siteConfig.selectors;
  const products = [];

  $(s.productCard).each((i, el) => {
    const $card = $(el);

    // 提取产品名
    let title = '';
    if (s.title) {
      title = $card.find(s.title).first().text().trim();
    }
    if (!title && s.image) {
      title = $card.find(s.image).attr(s.imageAltAttr || 'alt') || '';
    }
    if (!title) return; // skip if no title

    // 提取价格
    let price = '';
    let joblotPrice = '';
    if (s.price) {
      price = $card.find(s.price).first().text().trim();
    }
    if (s.joblotPrice) {
      joblotPrice = $card.find(s.joblotPrice).first().text().trim();
    }

    // 提取 SKU
    let sku = '';
    if (s.sku) {
      const skuText = $card.find(s.sku).text();
      const match = skuText.match(/SKU[A-Z0-9]+/i);
      if (match) sku = match[0];
    }

    // 提取图片 URL
    let imageUrl = '';
    if (s.image) {
      const $img = $card.find(s.image).first();
      imageUrl = $img.attr(s.imageUrlAttr || 'src') || $img.attr('src') || '';
      // 处理相对路径
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, siteConfig.baseUrl).href;
      }
      // 跳过占位图
      if (imageUrl && imageUrl.includes('placeholder')) {
        imageUrl = '';
      }
    }

    // 提取产品链接
    let productUrl = '';
    if (s.link) {
      const href = $card.find(s.link).first().attr(s.linkAttr || 'href');
      if (href) {
        productUrl = href.startsWith('http') ? href : new URL(href, siteConfig.baseUrl).href;
      }
    }

    // 提取折扣
    let rrp = '';
    if (s.rrp) {
      rrp = $card.find(s.rrp).first().text().trim();
    }

    // 自动分类
    const category = classifyProduct(title, siteConfig.categoryMap);

    // 解析价格数字
    const priceNum = parsePrice(price);
    const joblotPriceNum = parsePrice(joblotPrice);

    // 解析 MOQ (从标题中提取数量)
    const moq = extractMOQ(title);

    products.push({
      title: title.substring(0, 200),
      price: priceNum,
      priceDisplay: price || '',
      joblotPrice: joblotPriceNum,
      joblotPriceDisplay: joblotPrice || '',
      rrp: rrp,
      sku: sku,
      imageUrl: imageUrl,
      productUrl: productUrl,
      category: category,
      moq: moq,
      source: siteConfig.name,
    });
  });

  return products;
}

/**
 * 根据标题关键词自动分类
 */
function classifyProduct(title, categoryMap) {
  if (!categoryMap) return 'mixed';
  const lowerTitle = title.toLowerCase();
  for (const [keywords, category] of Object.entries(categoryMap)) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(lowerTitle)) {
      return category;
    }
  }
  return 'mixed';
}

/**
 * 解析价格字符串 -> 数字
 * "£10.92" -> 10.92
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 0;
}

/**
 * 从标题中提取 MOQ
 * "25 x Designer Canvas Tote Bag" -> "25 pcs"
 * "14,000 Glow in the Dark Products" -> "14,000 pcs"
 */
function extractMOQ(title) {
  const match = title.match(/^([\d,]+)\s*(?:x|pcs|pieces|units|pk|pack)/i);
  if (match) {
    return match[1].replace(/,/g, '') + ' pcs';
  }
  const match2 = title.match(/([\d,]+)\s*(?:pcs|pieces|units)/i);
  if (match2) {
    return match2[1].replace(/,/g, '') + ' pcs';
  }
  return '';
}

/**
 * 爬取一个站点的所有页
 */
async function scrapeSite(siteKey, options = {}) {
  const config = sites[siteKey];
  if (!config) {
    throw new Error('Unknown site: ' + siteKey);
  }

  const maxPages = options.maxPages || config.maxPages;
  const allProducts = [];

  console.log(`\n[scraper] Starting: ${config.name}`);
  console.log(`[scraper] URL: ${config.startUrl}`);
  console.log(`[scraper] Max pages: ${maxPages}`);

  for (let page = 1; page <= maxPages; page++) {
    let url;
    if (page === 1) {
      url = config.startUrl;
    } else if (config.paginationPath) {
      // WordPress style: /page/2/
      url = config.baseUrl + config.paginationPath + page + '/';
    } else if (config.paginationParam) {
      url = config.startUrl + '?' + config.paginationParam + '=' + page;
    } else {
      break; // no pagination config
    }

    console.log(`[scraper] Page ${page}: ${url}`);

    try {
      let html;
      if (config.type === 'dynamic') {
        html = await fetchDynamicHTML(url);
      } else {
        html = await fetchHTML(url);
      }

      const products = parseProducts(html, config);
      console.log(`[scraper]   Found ${products.length} products on page ${page}`);

      if (products.length === 0) {
        console.log(`[scraper]   No products found, stopping pagination.`);
        break;
      }

      allProducts.push(...products);

      // Be polite - wait between requests
      if (page < maxPages) {
        await sleep(config.delayMs || 1500);
      }
    } catch (err) {
      console.error(`[scraper]   Error on page ${page}: ${err.message}`);
      break;
    }
  }

  console.log(`[scraper] Total scraped from ${config.name}: ${allProducts.length} products`);
  return allProducts;
}

/**
 * 爬取所有配置的站点
 */
async function scrapeAll(options = {}) {
  const siteKeys = Object.keys(sites);
  const allResults = {};

  for (const key of siteKeys) {
    try {
      const products = await scrapeSite(key, options);
      allResults[key] = products;
    } catch (err) {
      console.error(`[scraper] Failed to scrape ${key}: ${err.message}`);
      allResults[key] = [];
    }
  }

  return allResults;
}

module.exports = {
  scrapeSite,
  scrapeAll,
  parseProducts,
  classifyProduct,
  parsePrice,
  extractMOQ,
  fetchHTML,
};
