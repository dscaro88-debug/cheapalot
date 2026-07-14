// /api/upload.js — Vercel Serverless Function
// Handles supplier product uploads: image + product data → GitHub commit → Vercel auto-deploy

const REPO_OWNER = 'dscaro88-debug';
const REPO_NAME = 'cheapalot';
const BRANCH = 'main';

const CATEGORY_MAP = {
    toys: { en: 'Toys & Hobbies', es: 'Juguetes', ar: 'ألعاب' },
    household: { en: 'Household', es: 'Hogar', ar: 'منزلي' },
    apparel: { en: 'Apparel & Accessories', es: 'Ropa y Accesorios', ar: 'ملابس وإكسسوارات' },
    jewelry: { en: 'Jewelry', es: 'Joyería', ar: 'مجوهرات' },
    crafts: { en: 'Arts & Crafts', es: 'Artesanía', ar: 'حرف فنية' },
    electronics: { en: 'Electronics', es: 'Electrónica', ar: 'إلكترونيات' },
    sports: { en: 'Sports & Outdoor', es: 'Deportes', ar: 'رياضة' },
    home_decor: { en: 'Home Decoration', es: 'Decoración del Hogar', ar: 'ديكور المنزل' },
    stationery: { en: 'Stationery & Office', es: 'Papelería', ar: 'قرطاسية' },
    other: { en: 'Other', es: 'Otros', ar: 'أخرى' }
};

const CNY_TO_GBP = 0.1075;

function ghHeaders(token) {
    return {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
}

async function getFile(token, path) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
    const res = await fetch(url, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
    const data = await res.json();
    return { sha: data.sha, content: Buffer.from(data.content, 'base64') };
}

async function putFile(token, path, content, message, sha) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const body = {
        message: message,
        content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(content).toString('base64'),
        branch: BRANCH
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`GitHub PUT ${path} failed: ${err.message || res.status}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const token = process.env.GITHUB_TOKEN;
    const uploadPassword = process.env.UPLOAD_PASSWORD;

    if (!token || !uploadPassword) {
        return res.status(500).json({ ok: false, error: 'Server not configured. Ask admin to set GITHUB_TOKEN and UPLOAD_PASSWORD env vars.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    // Action: verify access code
    if (body.action === 'verify') {
        if (body.code === uploadPassword) {
            return res.json({ ok: true });
        }
        return res.status(403).json({ ok: false, error: 'Invalid access code' });
    }

    // Action: upload product
    if (body.action !== 'upload') {
        return res.status(400).json({ ok: false, error: 'Unknown action' });
    }

    // Verify access code
    if (body.code !== uploadPassword) {
        return res.status(403).json({ ok: false, error: 'Invalid access code' });
    }

    // Validate fields
    const { supplierName, productName, category, priceCny, minOrder, stockStatus, description, image } = body;
    if (!supplierName || !productName || !priceCny || !minOrder || !image) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        // Parse price (could be "3.5" or "3.5~4.5")
        const priceMatch = priceCny.match(/([\d.]+)/);
        if (!priceMatch) throw new Error('Invalid price format');
        const priceCnyNum = parseFloat(priceMatch[1]);
        const priceGbp = Math.round(priceCnyNum * CNY_TO_GBP * 100) / 100;

        // Parse price range
        const rangeMatch = priceCny.match(/([\d.]+)\s*[~-]\s*([\d.]+)/);
        let priceDisplay, priceNum;
        if (rangeMatch) {
            const low = parseFloat(rangeMatch[1]);
            const high = parseFloat(rangeMatch[2]);
            const gbpLow = Math.round(low * CNY_TO_GBP * 100) / 100;
            const gbpHigh = Math.round(high * CNY_TO_GBP * 100) / 100;
            priceDisplay = `£${gbpLow} - £${gbpHigh}`;
            priceNum = gbpLow;
        } else {
            priceDisplay = `£${priceGbp.toFixed(2)}`;
            priceNum = priceGbp;
        }

        // Generate IDs
        const timestamp = Date.now();
        const productId = `sup_${timestamp}`;
        const imageFileName = `sup_${timestamp}.jpg`;

        // Extract base64 image data from data URL
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Category display
        const catMap = CATEGORY_MAP[category] || CATEGORY_MAP.other;

        // Build product object
        const newProduct = {
            id: productId,
            image: `images/products/custom/${imageFileName}`,
            tag: 'new',
            category: category,
            price: priceNum,
            price_display: priceDisplay,
            stock_status: stockStatus || 'in_stock',
            name: { en: productName, es: productName, ar: productName },
            category_display: catMap,
            price_unit: { en: 'per unit', es: 'por unidad', ar: 'للقطعة' },
            min_order: { en: minOrder, es: minOrder, ar: minOrder },
            source: 'supplier',
            supplier: supplierName,
            original_price_cny: priceCny + ' CNY'
        };

        if (description) {
            newProduct.description = { en: description, es: description, ar: description };
        }

        // 1. Upload image to GitHub
        await putFile(
            token,
            `images/products/custom/${imageFileName}`,
            imageBuffer,
            `Supplier upload: image for ${productName}`
        );

        // 2. Get current products.json
        const file = await getFile(token, 'data/products.json');
        const productsData = JSON.parse(file.content.toString('utf-8'));
        productsData.products.push(newProduct);

        // 3. Update products.json
        await putFile(
            token,
            'data/products.json',
            JSON.stringify(productsData, null, 2),
            `Supplier upload: ${productName} (by ${supplierName})`,
            file.sha
        );

        return res.json({
            ok: true,
            productId: productId,
            message: 'Product uploaded successfully'
        });

    } catch (err) {
        console.error('Upload error:', err.message);
        return res.status(500).json({ ok: false, error: 'Upload failed: ' + err.message });
    }
};
