/**
 * CheapALot — 供应商自助上传接口 (Vercel Serverless)
 * 路由: POST /api/upload
 *   action=verify  { code }                                   → { ok, supplierName }
 *   action=upload  { code, supplierName, productName, category, priceUsd, minOrder, stockStatus, stockQty, description, image(dataURI) }
 *                                                              → { ok, id }
 *
 * 持久化: 写入 data/pending-overstock.json (待 CARO 审批), 图片写入 images/products/supplier/
 * 需要环境变量: GITHUB_TOKEN, GITHUB_REPO, SUPPLIER_TOKENS("code1:Name1,code2:Name2")
 */

const { readJson, updateJson, putFileBase64 } = require('./_github');

const PENDING_PATH = 'data/pending-overstock.json';
const IMG_DIR = 'images/products/supplier';

function parseTokens() {
  const raw = process.env.SUPPLIER_TOKENS || '';
  const map = {};
  raw.split(',').forEach(pair => {
    const [code, name] = pair.split(':');
    if (code && name) map[code.trim()] = name.trim();
  });
  return map;
}

function extractImage(dataUri) {
  // data:image/jpeg;base64,xxxxx
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUri || '');
  if (!m) return null;
  const ext = m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1];
  return { base64: m[2], ext };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(req.body || '{}'); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }

  try {
    // ── 校验访问码 ──
    if (body.action === 'verify') {
      const tokens = parseTokens();
      const name = tokens[body.code];
      if (!name) return res.status(200).json({ ok: false });
      return res.status(200).json({ ok: true, supplierName: name });
    }

    if (body.action === 'upload') {
      const tokens = parseTokens();
      const supplierName = tokens[body.code];
      if (!supplierName) return res.status(403).json({ ok: false, error: 'Invalid access code' });

      const { productName, category, priceUsd, minOrder, stockStatus, stockQty, description, image } = body;
      if (!productName || !category || !priceUsd) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }

      const id = 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      let imagePath = '';
      const img = extractImage(image);
      if (img) {
        try {
          await putFileBase64(`${IMG_DIR}/${id}.${img.ext}`, img.base64, `inventory: add supplier image ${id}`);
          imagePath = `${IMG_DIR}/${id}.${img.ext}`;
        } catch (e) {
          imagePath = ''; // 图片失败不阻塞, 产品仍进待审
        }
      }

      const item = {
        id,
        supplierName,
        productName,
        category: category || 'mixed',
        priceUsd: String(priceUsd),
        minOrder: minOrder || '',
        stockStatus: stockStatus || 'overstock',
        stockQty: stockQty ? parseInt(stockQty) : null,   // 真实库存数量(overstock 关键)
        description: description || '',
        imagePath,
        imageDataUri: img ? `data:image/${img.ext === 'jpg' ? 'jpeg' : img.ext};base64,${img.base64}` : '',
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };

      await updateJson(PENDING_PATH, (list) => {
        const arr = Array.isArray(list) ? list : [];
        arr.push(item);
        return arr;
      }, `inventory: new pending stock from ${supplierName}`);

      return res.status(200).json({ ok: true, id });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
