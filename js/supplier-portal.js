/**
 * Supplier Portal - Frontend Logic
 * Handles auth, product CRUD, image upload via Supabase
 */

let supabase = null;
let currentUser = null;
let supplierProfile = null;

// ============= INIT =============
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.SUPABASE_CONFIG || window.SUPABASE_CONFIG.url === 'YOUR_PROJECT_URL') {
    showAlert('Supabase not configured. Please set up credentials in js/supabase-config.js', 'error', 10000);
    return;
  }

  supabase = supabaseClient.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  // Check if user is already logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserProfile(session.user);
    showDashboard();
  }

  // Setup event listeners
  setupAuthTabs();
  setupForms();
  setupImageUpload();
});

// ============= AUTH TABS =============
function setupAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.auth-form-wrap').forEach(f => f.classList.remove('active'));
  document.getElementById(`${tab}Form`).classList.add('active');
}

// ============= AUTH =============
document.getElementById('loginFormEl').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAlert('Please fill in all fields', 'error');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showAlert(`Login failed: ${error.message}`, 'error');
    return;
  }

  await loadUserProfile(data.user);
  showDashboard();
  showAlert('Welcome back!', 'success');
});

document.getElementById('registerFormEl').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const contactName = document.getElementById('regContactName').value.trim();
  const companyName = document.getElementById('regCompanyName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const city = document.getElementById('regCity').value.trim();

  if (!email || !password || !contactName) {
    showAlert('Please fill in required fields', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters', 'error');
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { contact_name: contactName }
    }
  });

  if (error) {
    showAlert(`Registration failed: ${error.message}`, 'error');
    return;
  }

  // Update supplier profile with additional info
  if (data.user) {
    await supabase.from('suppliers').update({
      company_name: companyName,
      phone: phone,
      city: city,
      contact_name: contactName
    }).eq('auth_id', data.user.id);
  }

  showAlert('Account created! Please check your email to confirm registration.', 'success', 8000);
  switchTab('login');
});

async function loadUserProfile(user) {
  currentUser = user;
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('auth_id', user.id)
    .single();
  
  if (error) {
    console.error('Profile load error:', error);
    return;
  }
  
  supplierProfile = data;
}

function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  
  const name = supplierProfile?.contact_name || supplierProfile?.email || 'Supplier';
  document.getElementById('welcomeMsg').textContent = `Welcome, ${name}!`;
  
  const statusEl = document.getElementById('accountStatus');
  if (supplierProfile?.is_admin) {
    statusEl.textContent = 'Administrator';
    statusEl.className = 'account-status approved';
  } else if (supplierProfile?.is_approved) {
    statusEl.textContent = 'Approved Supplier';
    statusEl.className = 'account-status approved';
  } else {
    statusEl.textContent = 'Pending Approval';
    statusEl.className = 'account-status pending';
  }

  // Setup nav
  const nav = document.getElementById('portalNav');
  nav.innerHTML = '';
  if (supplierProfile?.is_admin) {
    nav.innerHTML += '<a href="admin.html" class="btn-admin">Admin Panel</a>';
  }
  nav.innerHTML += '<button onclick="logout()" class="btn-logout">Logout</button>';

  loadCategories();
  loadMyProducts();
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  supplierProfile = null;
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  showAlert('Logged out successfully', 'info');
}

// ============= CATEGORIES =============
async function loadCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  
  if (error) { console.error('Category load error:', error); return; }
  
  const select = document.getElementById('prodCategory');
  select.innerHTML = '<option value="">Select category...</option>';
  data.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.slug;
    opt.textContent = `${cat.icon} ${cat.name_en}`;
    select.appendChild(opt);
  });
}

// ============= IMAGE UPLOAD =============
function setupImageUpload() {
  const area = document.getElementById('imageUploadArea');
  const input = document.getElementById('prodImage');
  const preview = document.getElementById('imagePreview');
  const placeholder = document.getElementById('uploadPlaceholder');

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragover');
  });

  area.addEventListener('dragleave', () => area.classList.remove('dragover'));

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    if (e.dataTransfer.files[0]) {
      input.files = e.dataTransfer.files;
      handleImageSelect(input.files[0]);
    }
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleImageSelect(input.files[0]);
  });
}

let selectedImageFile = null;

function handleImageSelect(file) {
  if (!file.type.startsWith('image/')) {
    showAlert('Please select an image file', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Image too large (max 5MB)', 'error');
    return;
  }
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ============= PRODUCT UPLOAD =============
document.getElementById('uploadFormEl').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!supplierProfile) {
    showAlert('Please log in first', 'error');
    return;
  }

  const nameEn = document.getElementById('prodNameEn').value.trim();
  const nameZh = document.getElementById('prodNameZh').value.trim();
  const category = document.getElementById('prodCategory').value;
  const moq = parseInt(document.getElementById('prodMoq').value) || 1;
  const priceLow = parseFloat(document.getElementById('prodPriceLow').value);
  const priceHigh = parseFloat(document.getElementById('prodPriceHigh').value) || null;
  const unit = document.getElementById('prodUnit').value;
  const stock = parseInt(document.getElementById('prodStock').value) || null;
  const desc = document.getElementById('prodDesc').value.trim();

  if (!nameEn || !category || !priceLow) {
    showAlert('Please fill in required fields', 'error');
    return;
  }

  if (!selectedImageFile) {
    showAlert('Please upload a product image', 'error');
    return;
  }

  // Upload image to Supabase Storage
  const fileExt = selectedImageFile.name.split('.').pop();
  const fileName = `${supplierProfile.auth_id}/${Date.now()}.${fileExt}`;
  
  showAlert('Uploading image...', 'info');
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, selectedImageFile);

  if (uploadError) {
    showAlert(`Image upload failed: ${uploadError.message}`, 'error');
    return;
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  // Get category name
  const catSelect = document.getElementById('prodCategory');
  const catName = catSelect.options[catSelect.selectedIndex].text.replace(/^[^\s]+\s/, '');

  // Insert product
  const { error: insertError } = await supabase.from('products').insert({
    supplier_id: supplierProfile.id,
    name_en: nameEn,
    name_zh: nameZh || null,
    description: desc || null,
    category: catName,
    category_slug: category,
    price_cny_low: priceLow,
    price_cny_high: priceHigh,
    moq: moq,
    unit: unit,
    stock_qty: stock,
    image_url: urlData.publicUrl,
    image_path: fileName,
    status: 'pending'
  });

  if (insertError) {
    showAlert(`Upload failed: ${insertError.message}`, 'error');
    return;
  }

  showAlert('Product submitted for review! It will appear on the website after admin approval.', 'success', 6000);
  hideUploadForm();
  resetUploadForm();
  loadMyProducts();
});

function showUploadForm() {
  document.getElementById('uploadFormWrap').style.display = 'block';
  document.getElementById('uploadFormWrap').scrollIntoView({ behavior: 'smooth' });
}

function hideUploadForm() {
  document.getElementById('uploadFormWrap').style.display = 'none';
}

function resetUploadForm() {
  document.getElementById('uploadFormEl').reset();
  selectedImageFile = null;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'block';
}

// ============= LOAD PRODUCTS =============
async function loadMyProducts() {
  if (!supplierProfile) return;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', supplierProfile.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products load error:', error);
    return;
  }

  // Update stats
  const total = data.length;
  const pending = data.filter(p => p.status === 'pending').length;
  const approved = data.filter(p => p.status === 'approved' || p.status === 'published').length;
  const rejected = data.filter(p => p.status === 'rejected').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statApproved').textContent = approved;
  document.getElementById('statRejected').textContent = rejected;

  // Render table
  const tbody = document.getElementById('productsTableBody');
  const noMsg = document.getElementById('noProductsMsg');

  if (data.length === 0) {
    tbody.innerHTML = '';
    noMsg.style.display = 'block';
    return;
  }

  noMsg.style.display = 'none';
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.image_url ? `<img src="${p.image_url}" alt="">` : '<span style="color:#ccc">No image</span>'}</td>
      <td><strong>${escapeHtml(p.name_en)}</strong>${p.name_zh ? `<br><small style="color:#888">${escapeHtml(p.name_zh)}</small>` : ''}</td>
      <td>${escapeHtml(p.category || '-')}</td>
      <td>¥${p.price_cny_low}${p.price_cny_high ? `~¥${p.price_cny_high}` : ''}</td>
      <td>${p.moq}</td>
      <td><span class="status-badge ${p.status}">${p.status}</span></td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td>
        ${p.status === 'pending' ? `<button class="action-btn delete" onclick="deleteProduct('${p.id}')">Delete</button>` : ''}
        ${p.status === 'rejected' ? `<button class="action-btn delete" onclick="deleteProduct('${p.id}')">Delete</button>` : ''}
      </td>
    </tr>
  `).join('');
}

// ============= DELETE PRODUCT =============
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    showAlert(`Delete failed: ${error.message}`, 'error');
    return;
  }

  showAlert('Product deleted', 'success');
  loadMyProducts();
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
