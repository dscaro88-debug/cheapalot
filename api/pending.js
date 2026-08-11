/**
 * CheapALot — 待审库存管理接口 (Vercel Serverless, 仅 CARO 管理员)
 * 路由: POST /api/pending
 *   action=list    { adminToken }                         → { ok, items[] }
 *   action=approve { adminToken, id }                     → 并入 products.json(overstock), 移出待审
 *   action=reject  { adminToken, id }                     → 移出待审
 * 需要环境变量: GITHUB_TOKEN, GITHUB_REPO, ADMIN_TOKEN
 */

const { getFile, putFile, readJson, updateJson } = require('./_github');

const PENDING_PATH = 'data/pending-overstock.json';
const PRODUCTS_PATH = 'data/products.json';
const CATEGORY_DISPLAY = {
  toys: 'Toys & Hobbies', household: 'Household & Home', apparel: 'Apparel & Accessories',
  jewelry: 'Jewelry & Accessories', crafts: 'Arts & Crafts', electronics: 'Electronics',
  sports: 'Sports & Outdoor', home_decor: 'Home Decoration', stationery: 'Stationery & Office',
  other: 'Other', mixed: 'Mixed Lots',
};

function maxNumericId(products) {
  let max = 0;
  for (const p of products) {
    const m = String(p.id || '').match(/p(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return max;
}

// 用 GitHub API 校验客户端传来的 PAT 是否有效(与 manage.html 登录态一致)
async function validGitHubToken(token) {
  if (!token) return false;
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'cheapalot' },
    });
    return r.ok;
  } catch { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(req.body || '{}'); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }

  const ok = await validGitHubToken(body.token);
  if (!ok) return res.status(403).json({ ok: false, error: 'Invalid GitHub token' });

  try {
    if (body.action === 'list') {
      const items = await readJson(PENDING_PATH, []);
      return res.status(200).json({ ok: true, items: Array.isArray(items) ? items : [] });
    }

    if (body.action === 'reject') {
      await updateJson(PENDING_PATH, (list) => {
        const arr = Array.isArray(list) ? list : [];
        return arr.filter(x => x.id !== body.id);
      }, `inventory: reject pending ${body.id}`);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'approve') {
      const items = await readJson(PENDING_PATH, []);
      const item = (Array.isArray(items) ? items : []).find(x => x.id === body.id);
      if (!item) return res.status(404).json({ ok: false, error: 'Not found' });

      // 读取 products.json
      const pf = await getFile(PRODUCTS_PATH);
      const productsJson = pf ? JSON.parse(pf.decoded) : { products: [] };
      productsJson.products = productsJson.products || [];

      const nextId = maxNumericId(productsJson.products) + 1;
      const cat = item.category || 'mixed';
      const price = parseFloat(item.priceUsd) || 0;
      const newProduct = {
        id: `p${nextId}`,
        image: item.imagePath || item.imageDataUri || 'images/products/placeholder.jpg',
        tag: 'new',
        category: cat,
        price,
        price_display: `$${price.toFixed(2)}`,
        price_unit: { en: 'per unit', es: 'por unidad', ar: 'للقطعة' },
        stock_status: 'overstock',
        stock_signal: 'supplier',
        verified: true,
        scraped_at: null,
        name: { en: item.productName, es: item.productName, ar: item.productName },
        category_display: {
          en: CATEGORY_DISPLAY[cat] || cat,
          es: CATEGORY_DISPLAY[cat] || cat,
          ar: CATEGORY_DISPLAY[cat] || cat,
        },
        min_order: { en: item.minOrder || '1 pc', es: item.minOrder || '1 ud', ar: item.minOrder || '1 قطعة' },
        source: 'supplier',
        source_url: '',
        original_price: '',
        rrp_discount: '',
        stock_qty: item.stockQty,   // 真实库存数量(前端可展示)
        supplier_name: item.supplierName,
      };

      productsJson.products.push(newProduct);
      productsJson.meta = productsJson.meta || {};
      productsJson.meta.updated = new Date().toISOString().split('T')[0];
      productsJson.meta.total_products = productsJson.products.length;

      // 写回 products.json
      await putFile(PRODUCTS_PATH, JSON.stringify(productsJson, null, 1), `inventory: approve supplier stock ${item.productName}`, pf ? pf.sha : undefined);

      // 从待审移除
      await updateJson(PENDING_PATH, (list) => {
        const arr = Array.isArray(list) ? list : [];
        return arr.filter(x => x.id !== body.id);
      }, `inventory: approved ${item.id}`);

      return res.status(200).json({ ok: true, productId: newProduct.id });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
