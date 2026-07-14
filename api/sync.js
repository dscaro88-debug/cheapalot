/**
 * Vercel Serverless Function: /api/sync
 * 
 * Triggers a sync of approved Supabase products to the website.
 * Can be called from the admin panel or via a cron job.
 * 
 * This function:
 * 1. Fetches approved products from Supabase
 * 2. Commits them to the GitHub repo via GitHub API
 * 3. Vercel auto-deploys from the GitHub push
 */

const config = require('../../js/supabase-config.js');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for admin auth token (basic security)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch approved products from Supabase
    const supabaseResponse = await fetch(
      `${config.SUPABASE_URL}/rest/v1/products?status=eq.approved&order=created_at.desc`,
      {
        headers: {
          'apikey': config.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    const products = await supabaseResponse.json();

    if (!products || products.length === 0) {
      return res.json({ synced: 0, message: 'No approved products to sync' });
    }

    // Convert to products.json format
    const productRecords = products.map(p => ({
      id: `sup_${p.id.substring(0, 8)}`,
      source: 'supabase',
      name: p.name_en,
      name_zh: p.name_zh || '',
      description: p.description || '',
      category: p.category_slug || 'other',
      category_name: p.category || 'Other',
      price_cny: p.price_cny_low,
      price_gbp: parseFloat((p.price_cny_low * 0.1075).toFixed(2)),
      price_display: `£${(p.price_cny_low * 0.1075).toFixed(2)}`,
      original_price_cny: `¥${p.price_cny_low}`,
      moq: p.moq || 1,
      price_unit: 'per piece',
      image: p.image_url || 'images/products/placeholder.jpg',
      image_url: p.image_url || '',
      supplier_id: p.supplier_id,
      created_at: p.created_at,
      translations: {
        en: p.name_en,
        es: p.name_en,
        ar: p.name_en
      }
    }));

    // Commit to GitHub via API
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO || 'carokk/cheapalot';
    const githubBranch = 'main';

    if (!githubToken) {
      return res.json({
        synced: productRecords.length,
        message: 'Products fetched but GITHUB_TOKEN not set. Use manual sync.',
        products: productRecords
      });
    }

    // Get current products.json
    const getFileResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/contents/data/products.json?ref=${githubBranch}`,
      { headers: { Authorization: `token ${githubToken}` } }
    );
    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;
    
    // Parse existing products
    const existingContent = Buffer.from(fileData.content, 'base64').toString('utf8');
    const existingProducts = JSON.parse(existingContent);
    
    // Merge: remove old supabase products, add new ones
    const nonSupabase = existingProducts.filter(p => p.source !== 'supabase');
    const merged = [...nonSupabase, ...productRecords];
    
    // Commit updated products.json
    const newContent = Buffer.from(JSON.stringify(merged, null, 2)).toString('base64');
    
    const commitResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/contents/data/products.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Auto-sync: ${productRecords.length} supplier products`,
          content: newContent,
          sha: currentSha,
          branch: githubBranch
        })
      }
    );

    const commitResult = await commitResponse.json();

    // Mark products as published in Supabase
    for (const p of products) {
      await fetch(
        `${config.SUPABASE_URL}/rest/v1/products?id=eq.${p.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'published' })
        }
      );
    }

    return res.json({
      synced: productRecords.length,
      total: merged.length,
      commit: commitResult.commit?.sha || 'unknown',
      message: `Synced ${productRecords.length} products. Deploying...`
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
};
