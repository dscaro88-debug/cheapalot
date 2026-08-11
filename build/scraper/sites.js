/**
 * CheapALot — 站点爬取配置
 * 每个站点定义: URL, 选择器, 分页, 分类映射
 *
 * 添加新站点: 复制一个 site config, 改 name/url/selectors 即可
 */

module.exports = {

  // ── 站点 1: Wholesale Clearance UK ──
  wholesaleclearance: {
    name: 'Wholesale Clearance UK',
    baseUrl: 'https://www.wholesaleclearance.co.uk',
    startUrl: 'https://www.wholesaleclearance.co.uk/joblots.php',
    type: 'static',           // 'static' = HTTP+Cheerio, 'dynamic' = Playwright
    maxPages: 3,              // 最多爬取页数
    delayMs: 1500,           // 每页间隔(ms), 礼貌爬取
    paginationParam: 'inPage', // ?inPage=2
    selectors: {
      productCard: '.product',
      title: '.title-block .title',
      price: '.price-block .price',
      joblotPrice: '.price-block small strong',
      sku: '.price-block small',
      image: '.img-holder img',
      imageUrlAttr: 'data-src',  // lazy loading attribute
      imageAltAttr: 'alt',
      link: '.info',
      linkAttr: 'href',
      rrp: '.rrp span:first-child',
    },
    categoryMap: {
      // 根据标题关键词自动分类到 cheapalot 类别
      'tote|bag|backpack|purse|handbag': 'apparel',
      'apron|sarong|clothing|tshirt|top|legging|tight|fashion': 'apparel',
      'hair|beauty|cosmetic|skincare|shampoo|conditioner': 'apparel',
      'phone|case|samsung|iphone|charger|cable|electronic': 'electrical',
      'toy|game|puzzle|plush|kids|children|baby|nursery': 'toys',
      'garden|outdoor|bbq|patio|plant': 'household',
      'tool|diy|drill|screwdriver|power': 'diy',
      'sofa|chair|table|furniture|cabinet': 'furniture',
      'food|drink|beverage|confectionery|sweet|chocolate': 'mixed',
      'sport|fitness|yoga|gym': 'sports',
    },
  },

  // ── 站点 2: EnviroStock ──
  envirostock: {
    name: 'EnviroStock',
    baseUrl: 'https://enviro-stock.co.uk',
    startUrl: 'https://enviro-stock.co.uk/categories/',
    type: 'static',
    maxPages: 2,
    delayMs: 2000,
    paginationParam: 'page',
    paginationPath: '/page/',  // WordPress /page/2/ style
    selectors: {
      productCard: '.product, .wc-block-grid__product, .woocommerce-loop__product',
      title: '.woocommerce-loop-product__title, .wc-block-grid__product-title, h2 a, h3 a',
      price: '.price, .woocommerce-Price-amount',
      image: 'img',
      imageUrlAttr: 'src',
      imageAltAttr: 'alt',
      link: 'a',
      linkAttr: 'href',
    },
    categoryMap: {
      'fashion|apparel|clothing|shoe|watch': 'apparel',
      'electronic|tech|gadget|phone': 'electrical',
      'home|garden|kitchen|cookware': 'household',
      'tool|industrial|equipment': 'diy',
      'toy|children|kids': 'toys',
    },
  },

  // ── 站点 3: The Wholesaler UK ──
  thewholesaler: {
    name: 'The Wholesaler UK',
    baseUrl: 'https://www.thewholesaler.co.uk',
    startUrl: 'https://www.thewholesaler.co.uk/wholesale-clearance/',
    type: 'static',
    maxPages: 2,
    delayMs: 2000,
    selectors: {
      productCard: '.product-item, .listing-item, .joblot',
      title: '.title, h3, h4',
      price: '.price',
      image: 'img',
      imageUrlAttr: 'data-src',
      imageAltAttr: 'alt',
      link: 'a',
      linkAttr: 'href',
    },
    categoryMap: {
      'fashion|clothing|bag|shoe': 'apparel',
      'electronic|tech|phone': 'electrical',
      'home|garden|kitchen': 'household',
      'toy|kids|children': 'toys',
      'tool|diy': 'diy',
    },
  },

  // ── 站点 4: Pallet Clearance ──
  palletclearance: {
    name: 'Pallet Clearance',
    baseUrl: 'https://palletclearance.app',
    startUrl: 'https://palletclearance.app/',
    type: 'dynamic',           // 需要 Playwright (JS 渲染)
    maxPages: 2,
    delayMs: 2000,
    selectors: {
      productCard: '.product-card, [class*="product"]',
      title: '.product-title, h3, h4, .title',
      price: '.price, [class*="price"]',
      image: 'img',
      imageUrlAttr: 'src',
      imageAltAttr: 'alt',
      link: 'a',
      linkAttr: 'href',
    },
    categoryMap: {
      'fashion|clothing': 'apparel',
      'electronic|tech': 'electrical',
      'home|garden': 'household',
      'toy|kids': 'toys',
    },
  },

  // ── 站点 5: 1688 清仓尾货 (中国库存源, 实验性) ──
  // 说明: 1688 反爬较强, 可能需登录态/代理. 若被拦截, 流水线会自动跳过该源, 不影响其他源.
  '1688-clearance': {
    name: '1688 清仓尾货',
    baseUrl: 'https://www.1688.com',
    startUrl: 'https://www.1688.com/cms/chaoshi/qingcang.html',
    type: 'dynamic',
    maxPages: 2,
    delayMs: 2500,
    experimental: true,        // 标记为实验性, 失败不影响整体
    selectors: {
      productCard: '.offer-list-row, .offer-item, .ic-offer, [class*="offer"]',
      title: '.offer-title, .title, h2, h3, a[title]',
      price: '.price, .price-num, [class*="price"]',
      image: 'img',
      imageUrlAttr: 'src',
      imageAltAttr: 'alt',
      link: 'a',
      linkAttr: 'href',
    },
    categoryMap: {
      '玩具|公仔|积木': 'toys',
      '服装|服饰|鞋|包': 'apparel',
      '家居|家纺|收纳|厨房': 'household',
      '电子|数码|充电': 'electrical',
      '工具|五金': 'diy',
      '运动|户外': 'sports',
      '家具': 'furniture',
    },
  },
};
