/**
 * Admin Panel - Frontend Logic
 * Review products, approve/reject, sync to website
 */

let adminSupabase = null;
let adminUser = null;
let adminProfile = null;
let currentFilter = 'pending';
let allProducts = [];
let allSuppliers = [];

// ============= INIT =============
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.SUPABASE_CONFIG || window.SUPABASE_CONFIG.url === 'YOUR_PROJECT_URL') {
    showAlert('Supabase not configured. Please set up credentials in js/supabase-config.js', 'error', 10000);
    return;
  }

  adminSupabase = supabaseClient.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  // Check existing session
  const { data: { session } } = await adminSupabase.auth.getSession();
  if (session) {
    await loadAdminProfile(session.user);
    if (adminProfile?.is_admin) {
      showAdminDashboard();
    }
  }

  // Setup login form
  document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
});

// ============= AUTH =============
async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  const { data, error } = await adminSupabase.auth.signInWithPassword({ email, password });
  if (error) {
    showAlert(`Login failed: ${error.message}`, 'error');
    return;
  }

  await loadAdminProfile(data.user);
  
  if (!adminProfile?.is_admin) {
    showAlert('Access denied. Admin privileges required.', 'error', 6000);
    await adminSupabase.auth.signOut();
    return;
  }

  showAdminDashboard();
  showAlert('Admin login successful', 'success');
}

async function loadAdminProfile(user) {
  adminUser = user;
  const { data, error } = await adminSupabase
    .from('suppliers')
    .select('*')
    .eq('auth_id', user.id)
    .single();
  
  if (error) {
    console.error('Profile load error:', error);
    return;
  }
  
  adminProfile = data;
}

function showAdminDashboard() {
  document.getElementById('adminAuthSection').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  loadAllData();
}

async function logout() {
  await adminSupabase.auth.signOut();
  adminUser = null;
  adminProfile = null;
  document.getElementById('adminAuthSection').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
  showAlert('Logged out', 'info');
}

// ============= LOAD DATA =============
async function loadAllData() {
  await Promise.all([loadProducts(), loadSuppliers()]);
  updateCounts();
  renderCurrentView();
}

async function loadProducts() {
  const { data, error } = await adminSupabase
    .from('products')
    .select(`
      *,
      suppliers!inner(company_name, contact_name, email, city)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products load error:', error);
    showAlert('Failed to load products', 'error');
    return;
  }

  allProducts = data || [];
}

async function loadSuppliers() {
  const { data, error } = await adminSupabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Suppliers load error:', error);
    return;
  }

  allSuppliers = data || [];
}

// ============= COUNTS =============
function updateCounts() {
  const pending = allProducts.filter(p => p.status === 'pending').length;
  const approved = allProducts.filter(p => p.status === 'approved').length;
  const rejected = allProducts.filter(p => p.status === 'rejected').length;

  document.getElementById('adminStatTotal').textContent = allProducts.length;
  document.getElementById('adminStatPending').textContent = pending;
  document.getElementById('adminStatApproved').textContent = approved;
  document.getElementById('adminStatSuppliers').textContent = allSuppliers.length;
  document.getElementById('countPending').textContent = pending;
  document.getElementById('countApproved').textContent = approved;
  document.getElementById('countRejected').textContent = rejected;
  document.getElementById('countAll').textContent = allProducts.length;
  document.getElementById('countSuppliers').textContent = allSuppliers.length;
  document.getElementById('syncCount').textContent = approved;
}

// ============= FILTERING =============
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-filter="${filter}"]`).classList.add('active');
  
  const productsView = document.getElementById('productsView');
  const suppliersView = document.getElementById('suppliersView');
  const viewTitle = document.getElementById('viewTitle');

  if (filter === 'suppliers') {
    productsView.style.display = 'none';
    suppliersView.style.display = 'block';
    renderSuppliers();
  } else {
    productsView.style.display = 'block';
    suppliersView.style.display = 'none';
    const titles = { pending: 'Pending Review', approved: 'Approved Products', rejected: 'Rejected Products', all: 'All Products' };
    viewTitle.textContent = titles[filter] || 'Products';
    renderProducts();
  }
}

// ============= RENDER PRODUCTS =============
function renderProducts() {
  let products = allProducts;
  if (currentFilter !== 'all') {
    products = products.filter(p => p.status === currentFilter);
  }

  const tbody = document.getElementById('adminTableBody');
  const noData = document.getElementById('adminNoData');

  if (products.length === 0) {
    tbody.innerHTML = '';
    noData.style.display = 'block';
    return;
  }

  noData.style.display = 'none';
  tbody.innerHTML = products.map(p => {
    const supplier = p.suppliers || {};
    return `
      <tr>
        <td>${p.image_url ? `<img src="${p.image_url}" alt="">` : '<span style="color:#ccc">No img</span>'}</td>
        <td>
          <strong>${escapeHtml(p.name_en)}</strong>
          ${p.name_zh ? `<br><small style="color:#888">${escapeHtml(p.name_zh)}</small>` : ''}
          ${p.description ? `<br><small style="color:#666">${escapeHtml(p.description.substring(0, 80))}${p.description.length > 80 ? '...' : ''}</small>` : ''}
        </td>
        <td>${escapeHtml(supplier.company_name || supplier.contact_name || '-')}</td>
        <td>${escapeHtml(p.category || '-')}</td>
        <td>¥${p.price_cny_low}${p.price_cny_high ? `~¥${p.price_cny_high}` : ''}</td>
        <td>${p.moq}</td>
        <td><span class="status-badge ${p.status}">${p.status}</span></td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>
          ${p.status === 'pending' ? `
            <button class="action-btn approve" onclick="approveProduct('${p.id}')">Approve</button>
            <button class="action-btn reject" onclick="rejectProduct('${p.id}')">Reject</button>
          ` : ''}
          ${p.status === 'rejected' ? `
            <button class="action-btn approve" onclick="approveProduct('${p.id}')">Approve</button>
          ` : ''}
          ${p.status === 'approved' ? `
            <button class="action-btn reject" onclick="rejectProduct('${p.id}')">Unapprove</button>
          ` : ''}
          <button class="action-btn delete" onclick="deleteProductAdmin('${p.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============= RENDER SUPPLIERS =============
function renderSuppliers() {
  const tbody = document.getElementById('suppliersTableBody');
  
  if (allSuppliers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:30px;">No suppliers yet</td></tr>';
    return;
  }

  tbody.innerHTML = allSuppliers.map(s => {
    const productCount = allProducts.filter(p => p.supplier_id === s.id).length;
    return `
      <tr>
        <td><strong>${escapeHtml(s.company_name || '-')}</strong></td>
        <td>${escapeHtml(s.contact_name || '-')}</td>
        <td>${escapeHtml(s.email || '-')}</td>
        <td>${escapeHtml(s.phone || '-')}</td>
        <td>${escapeHtml(s.city || '-')}</td>
        <td>${productCount}</td>
        <td>
          ${s.is_admin ? '<span class="status-badge published">Admin</span>' : 
            s.is_approved ? '<span class="status-badge approved">Approved</span>' : 
            '<span class="status-badge pending">Pending</span>'}
        </td>
        <td>
          ${!s.is_admin && !s.is_approved ? `<button class="action-btn approve" onclick="approveSupplier('${s.id}')">Approve</button>` : ''}
          ${!s.is_admin && s.is_approved ? `<button class="action-btn reject" onclick="disapproveSupplier('${s.id}')">Disapprove</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderCurrentView() {
  if (currentFilter === 'suppliers') {
    renderSuppliers();
  } else {
    renderProducts();
  }
}

// ============= APPROVE / REJECT =============
async function approveProduct(productId) {
  const { error } = await adminSupabase
    .from('products')
    .update({ status: 'approved' })
    .eq('id', productId);

  if (error) {
    showAlert(`Approve failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Product approved! It will be published on next sync.', 'success');
  await loadAllData();
}

async function rejectProduct(productId) {
  const reason = prompt('Rejection reason (optional):');
  
  const { error } = await adminSupabase
    .from('products')
    .update({ status: 'rejected', rejection_reason: reason || 'Not specified' })
    .eq('id', productId);

  if (error) {
    showAlert(`Reject failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Product rejected', 'info');
  await loadAllData();
}

async function deleteProductAdmin(productId) {
  if (!confirm('Delete this product permanently?')) return;

  const { error } = await adminSupabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    showAlert(`Delete failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Product deleted', 'success');
  await loadAllData();
}

// ============= SUPPLIER APPROVAL =============
async function approveSupplier(supplierId) {
  const { error } = await adminSupabase
    .from('suppliers')
    .update({ is_approved: true })
    .eq('id', supplierId);

  if (error) {
    showAlert(`Approve failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Supplier approved', 'success');
  await loadAllData();
}

async function disapproveSupplier(supplierId) {
  if (!confirm('Disapprove this supplier?')) return;
  
  const { error } = await adminSupabase
    .from('suppliers')
    .update({ is_approved: false })
    .eq('id', supplierId);

  if (error) {
    showAlert(`Failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Supplier disapproved', 'info');
  await loadAllData();
}

// ============= SYNC TO WEBSITE =============
async function syncToWebsite() {
  const approved = allProducts.filter(p => p.status === 'approved');
  
  if (approved.length === 0) {
    showAlert('No approved products to sync. Approve products first.', 'warning');
    return;
  }

  if (!confirm(`This will sync ${approved.length} approved products to the website. Continue?`)) return;

  showAlert('Syncing... This will update the website and trigger a deploy.', 'info', 6000);

  try {
    // Call the sync API endpoint (Vercel serverless function)
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'sync' })
    });

    if (response.ok) {
      const result = await response.json();
      showAlert(`Sync complete! ${result.synced || approved.length} products published. Website deploying...`, 'success', 8000);
    } else {
      // Fallback: open the sync in a new window (manual mode)
      showAlert('Auto-sync unavailable. Use the manual sync script: npm run sync', 'warning', 8000);
    }
  } catch (err) {
    showAlert('Sync endpoint not available. Use manual sync script.', 'warning', 8000);
  }
}

// ============= UTILITIES =============
function showAlert(message, type = 'info', duration = 4000) {
  const container = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `portal-alert ${type}`;
  alert.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => alert.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
