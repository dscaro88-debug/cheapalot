/**
 * 义乌购 (yiwugo.com) 爬虫
 * 
 * 数据源: 义乌国际商贸城官方在线平台 yiwugo.com
 * 模式: Playwright 渲染 → Cheerio 解析
 * 
 * 产品字段:
 *   - 产品名 (中文)
 *   - 价格区间 (人民币)
 *   - 起订量
 *   - 成交量
 *   - 产品图片 URL
 *   - 产品详情页 URL
 *   - 供应商名称
 *   - 供应商主页 URL
 *   - 供应商经营年限
 *   - 商铺实体地址 (义乌国际商贸城X区X门X楼X街XXX)
 * 
 * 用法:
 *   node build/scraper/yiwugo-scraper.js                    # 爬取所有预设类别
 *   node build/scraper/yiwugo-scraper.js --max-pages=2      # 每个类别只爬2页
 *   node build/scraper/yiwugo-scraper.js --categories=toys  # 只爬玩具类
 *   node build/scraper/yiwugo-scraper.js --no-push          # 不自动 git push
 */

const { chromium } = require('playwright');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Users/carokk/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

// 义乌国际商贸城各区域 + 行业分类
// URL 格式: https://www.yiwugo.com/product_list/i_1_{subMarket}_{floor}_{industryCode}.html
const CATEGORIES = [
  // 一区 (1001) - 玩具/花类/饰品/工艺品
  { id: 'toys',           name: 'Toys & Hobbies',           nameZh: '玩具',         url: '/product_list/i_1_1001_1_115.html',  cheapalotCat: 'toys' },
  { id: 'artificial_flowers', name: 'Artificial Flowers',   nameZh: '仿真花',       url: '/product_list/i_1_1001_1_1.html',    cheapalotCat: 'household' },
  { id: 'jewelry',        name: 'Jewelry & Accessories',     nameZh: '珠宝首饰',     url: '/product_list/i_1_1001_2_7.html',    cheapalotCat: 'apparel' },
  { id: 'hair_accessories', name: 'Hair Accessories',       nameZh: '头饰',         url: '/product_list/i_1_1001_2_6.html',    cheapalotCat: 'apparel' },
  { id: 'festive_crafts', name: 'Festive & Party Crafts',    nameZh: '喜庆工艺',     url: '/product_list/i_1_1001_3_8.html',    cheapalotCat: 'household' },
  { id: 'decorative_crafts', name: 'Decorative Crafts',      nameZh: '装饰工艺',     url: '/product_list/i_1_1001_3_9.html',    cheapalotCat: 'household' },
  { id: 'photo_frames',   name: 'Photo Frames & Mirrors',    nameZh: '相框',         url: '/product_list/i_1_1001_3_11.html',   cheapalotCat: 'household' },
  { id: 'porcelain_crystal', name: 'Porcelain & Crystal',    nameZh: '瓷器水晶',     url: '/product_list/i_1_1001_3_12.html',   cheapalotCat: 'household' },
];

const BASE_URL = 'https://www.yiwugo.com';
const PRODUCTS_PER_PAGE = 60;

// 清仓 / 尾货 / 库存处理 — 真实库存信号关键词(用于"全网库存爬取")
const CLEARANCE_KEYWORDS = ['清仓', '尾货', '库存处理', '甩货', '特价清仓'];

/**
 * 启动 Playwright 浏览器
 * 本地有指定 Chrome 则用; 否则(如 CI)回退到 Playwright 自带 chromium
 */
async function launchBrowser() {
  const useLocal = fs.existsSync(CHROME_PATH);
  return await chromium.launch({
    headless: true,
    ...(useLocal ? { executablePath: CHROME_PATH } : {}),
  });
}

/**
 * 解析单个义乌购产品卡片 → 归一化对象
 */
function parseYiwugoCard($el, catId, catZh, sourceName) {
  // 产品图片
  const imgSrc = $el.find('.thumbnail').attr('src') || '';
  const imageUrl = imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc;

  // 产品名
  const productName = $el.find('.product-name span').last().text().trim();

  // 产品详情页 URL
  const detailHref = $el.find('.tile-item').first().attr('href') || '';
  const detailUrl = detailHref ? BASE_URL + detailHref : '';

  // 产品 ID (从 URL 提取)
  const productIdMatch = detailHref.match(/detail\/(\d+)\.html/);
  const productId = productIdMatch ? productIdMatch[1] : '';

  // 价格解析
  const priceEls = $el.find('.price');
  let priceLow = 0, priceHigh = 0;
  let priceRaw = '';
  $el.find('.price .f18, .price .f12').each(function (j, span) {
    priceRaw += $(span).text().trim();
  });
  const startPriceText = $el.find('.start-price').text().replace(/\s/g, '');
  if (startPriceText) {
    priceLow = parseFloat(startPriceText) || 0;
  }
  const f18Els = $el.find('.price .f18');
  if (f18Els.length >= 2) {
    const highText = $(f18Els.get(1)).text().trim();
    const f12AfterTilde = $el.find('.price .f18').eq(1).next('.f12').text().trim();
    priceHigh = parseFloat(highText + f12AfterTilde) || priceLow;
  } else {
    priceHigh = priceLow;
  }
  if (priceLow === 0) {
    const priceText = $el.find('.price').text().replace(/\s+/g, '');
    const m = priceText.match(/(\d+\.?\d*)~(\d+\.?\d*)元/);
    if (m) {
      priceLow = parseFloat(m[1]);
      priceHigh = parseFloat(m[2]);
    }
  }

  // 起订量 / 成交量
  const priceText = $el.find('.price').text().replace(/\s+/g, '');
  const moqMatch = priceText.match(/(\d+)个起购/);
  const moq = moqMatch ? parseInt(moqMatch[1]) : 1;
  const soldMatch = priceText.match(/成交(\d+)个/);
  const sold = soldMatch ? parseInt(soldMatch[1]) : 0;

  // 供应商信息 (保密 - 不显示在网站上)
  const supplierName = $el.find('.shop_name .name').text().trim();
  const supplierHref = $el.find('.shop_name .name').attr('href') || '';
  const supplierUrl = supplierHref ? BASE_URL + supplierHref : '';
  const supplierYears = $el.find('.year').text().trim();
  const shopAddress = $el.find('.address-info span').text().trim();

  if (productName && imageUrl) {
    return {
      productId,
      title: productName,
      priceLow,
      priceHigh,
      priceCurrency: 'CNY',
      moq,
      sold,
      imageUrl,
      detailUrl,
      supplier: {
        name: supplierName,
        url: supplierUrl,
        years: supplierYears,
        address: shopAddress,
      },
      category: catId,
      categoryZh: catZh,
      source: sourceName,
      scrapedAt: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * 抓取单个分类页面
 */
async function scrapeCategoryPage(page, category, pageNum) {
  const url = `${BASE_URL}${category.url}?page=${pageNum}`;
  console.log(`  [scrape] ${category.nameZh} 第${pageNum}页: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  const $ = cheerio.load(html);
  
  const products = [];
  
  $('.products-box').each((i, el) => {
    const prod = parseYiwugoCard($(el), category.cheapalotCat, category.nameZh, 'yiwugo');
    if (prod) products.push(prod);
  });
  
  return products;
}

/**
 * 抓取义乌购「清仓 / 尾货 / 库存处理」搜索结果 → 真实库存信号(overstock)
 * 注: yiwugo 列表页不暴露逐件库存数字, 但供应商主动挂"清仓/尾货"即代表有货要清。
 */
async function scrapeYiwugoClearance(options = {}) {
  const { maxPages = 2, downloadImages = false } = options;
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

  const all = [];
  const suppliers = new Map();
  try {
    for (const kw of CLEARANCE_KEYWORDS) {
      for (let p = 1; p <= maxPages; p++) {
        const url = `${BASE_URL}/search/?keyword=${encodeURIComponent(kw)}&page=${p}`;
        console.log(`  [清仓] 搜索 "${kw}" 第${p}页: ${url}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(1500);
        } catch (e) {
          console.log(`  [清仓] 页面加载失败, 跳过: ${e.message}`);
          break;
        }
        const html = await page.content();
        const $ = cheerio.load(html);
        let found = 0;
        $('.products-box').each((i, el) => {
          const prod = parseYiwugoCard($(el), 'mixed', kw + '清仓', 'yiwugo-clearance');
          if (prod) {
            all.push(prod);
            found++;
            if (prod.supplier.name) {
              const key = prod.supplier.url || prod.supplier.name;
              if (!suppliers.has(key)) suppliers.set(key, { name: prod.supplier.name, url: prod.supplier.url, years: prod.supplier.years, address: prod.supplier.address, category: kw, productsCount: 1 });
              else suppliers.get(key).productsCount++;
            }
          }
        });
        console.log(`  [清仓] "${kw}" 第${p}页: ${found} 个`);
        if (found === 0) break;
        await page.waitForTimeout(1200);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\n[清仓] 共爬取 ${all.length} 个清仓/尾货商品`);
  return { products: all, suppliers: [...suppliers.values()] };
}

/**
 * 检查是否有下一页
 */
async function hasNextPage(page) {
  const html = await page.content();
  const $ = cheerio.load(html);
  // 检查分页组件中是否有"下一页"按钮
  const nextBtn = $('.pagination a.next, .el-pagination .btn-next, a:contains("下一页")');
  return nextBtn.length > 0 && !nextBtn.hasClass('disabled');
}

/**
 * 下载产品图片
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlinkSync(filepath);
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(filepath); } catch(e) {}
      resolve(false);
    });
  });
}

/**
 * 主函数: 爬取指定类别
 */
async function scrapeYiwugo(options = {}) {
  const {
    categories: filterCategories,
    maxPages = 3,
    downloadImages = true,
  } = options;
  
  const cats = filterCategories
    ? CATEGORIES.filter(c => filterCategories.includes(c.id))
    : CATEGORIES;
  
  console.log(`\n[义乌购爬虫] 开始爬取 ${cats.length} 个类别, 每类最多 ${maxPages} 页\n`);
  
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
  
  const allProducts = [];
  const allSuppliers = new Map(); // 用 Map 去重供应商
  
  try {
    for (const cat of cats) {
      console.log(`\n=== ${cat.nameZh} (${cat.name}) ===`);
      
      for (let p = 1; p <= maxPages; p++) {
        const products = await scrapeCategoryPage(page, cat, p);
        console.log(`  第${p}页: ${products.length} 个产品`);
        
        if (products.length === 0) {
          console.log(`  没有更多产品, 停止`);
          break;
        }
        
        // 收集供应商信息
        products.forEach(p => {
          if (p.supplier.name) {
            const key = p.supplier.url || p.supplier.name;
            if (!allSuppliers.has(key)) {
              allSuppliers.set(key, {
                name: p.supplier.name,
                url: p.supplier.url,
                years: p.supplier.years,
                address: p.supplier.address,
                category: p.categoryZh,
                productsCount: 1,
              });
            } else {
              allSuppliers.get(key).productsCount++;
            }
          }
        });
        
        allProducts.push(...products);
        
        // 下载图片
        if (downloadImages) {
          const imgDir = path.join(__dirname, '../../images/products/scraped');
          if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
          
          for (const prod of products) {
            if (prod.imageUrl) {
              const ext = '.jpg';
              const filename = `yw_${prod.productId}${ext}`;
              const filepath = path.join(imgDir, filename);
              if (!fs.existsSync(filepath)) {
                await downloadImage(prod.imageUrl, filepath);
              }
              prod.localImage = `images/products/scraped/${filename}`;
            }
          }
        }
        
        // 简短延迟避免被限制
        await page.waitForTimeout(1500);
      }
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n[义乌购爬虫] 完成!`);
  console.log(`  总产品数: ${allProducts.length}`);
  console.log(`  供应商数: ${allSuppliers.size}`);
  
  return {
    products: allProducts,
    suppliers: [...allSuppliers.values()],
  };
}

module.exports = { scrapeYiwugo, scrapeYiwugoClearance, CATEGORIES, CLEARANCE_KEYWORDS };
