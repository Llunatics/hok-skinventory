// ═══════════════════════════════════════════════════════
//  HoK Vault — Honor of Kings Skin Wishlist
//  Core Application Logic
// ═══════════════════════════════════════════════════════

// ---- State ----
let wishlist = [];
let currentFilter = 'all';
let currentDetailId = null;
let pendingConfirmAction = null;
let uploadedImageData = null; // For local image uploads

// ---- Rarity Config ----
const RARITIES = {
  basic:             { label: 'Basic',             icon: '◇',  order: 9 },
  rare:              { label: 'Rare',              icon: '◆',  order: 8 },
  epic:              { label: 'Epic',              icon: '✦',  order: 7 },
  epic_limited:      { label: 'Epic Limited',      icon: '✦⚜', order: 6 },
  legend:            { label: 'Legend',             icon: '★',  order: 5 },
  legend_limited:    { label: 'Legend Limited',     icon: '★⚜', order: 4 },
  precious:          { label: 'Precious',           icon: '♛',  order: 3 },
  flawless:          { label: 'Flawless',           icon: '❖',  order: 2 },
  treasure_flawless: { label: 'Treasure Flawless',  icon: '✪',  order: 1 },
  mythic:            { label: 'Mythic',             icon: '⚝',  order: 0 },
};

const PRIORITIES = {
  must:   { label: 'Harus Punya', order: 0 },
  high:   { label: 'Tinggi',      order: 1 },
  medium: { label: 'Sedang',      order: 2 },
  low:    { label: 'Rendah',      order: 3 },
};

const STATUSES = {
  available: { label: 'Tersedia',       cssClass: 'sb-available' },
  upcoming:  { label: 'Mendatang',      cssClass: 'sb-upcoming' },
  expired:   { label: 'Tidak Tersedia', cssClass: 'sb-expired' },
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadTheme();
  renderItems();
  updateStats();
  spawnParticles();
  setupDragDrop();
  lucide.createIcons();
});

// ---- Particles ----
function spawnParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 18 + 12) + 's';
    p.style.animationDelay = (Math.random() * 18) + 's';
    const size = Math.random() * 2 + 1;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.opacity = Math.random() * 0.4 + 0.1;
    c.appendChild(p);
  }
}

// ---- Drag & Drop for Upload Zone ----
function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover'); });
  });
  zone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) processImageFile(files[0]);
  });
}

// ---- Data Persistence ----
function loadData() {
  try {
    const data = localStorage.getItem('hokvault-data');
    wishlist = data ? JSON.parse(data) : [];
  } catch { wishlist = []; }
}

function saveData() {
  localStorage.setItem('hokvault-data', JSON.stringify(wishlist));
}

// ---- Theme ----
function loadTheme() {
  const scheme = localStorage.getItem('hokvault-scheme') || 'dark';
  const accent = localStorage.getItem('hokvault-accent') || 'gold';
  applyScheme(scheme);
  applyAccent(accent);
}

function setScheme(scheme) {
  applyScheme(scheme);
  localStorage.setItem('hokvault-scheme', scheme);
  showToast(`Mode ${scheme === 'dark' ? 'gelap' : 'terang'} diaktifkan`, 'info');
  if (document.activeElement) document.activeElement.blur();
}

function setAccent(accent) {
  applyAccent(accent);
  localStorage.setItem('hokvault-accent', accent);
  if (document.activeElement) document.activeElement.blur();
}

function applyScheme(scheme) {
  document.documentElement.setAttribute('data-scheme', scheme);
  // Update scheme button states
  document.querySelectorAll('.scheme-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-scheme-val') === scheme);
  });
}

function applyAccent(accent) {
  document.documentElement.setAttribute('data-accent', accent);
  // Update accent swatch states
  document.querySelectorAll('.accent-swatch').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-accent-val') === accent);
  });
}

// ---- Image Tab Switch ----
function switchImageTab(tab) {
  const urlTab = document.getElementById('img-tab-url');
  const fileTab = document.getElementById('img-tab-file');
  const urlInput = document.getElementById('img-input-url');
  const fileInput = document.getElementById('img-input-file');

  urlTab.classList.toggle('active', tab === 'url');
  fileTab.classList.toggle('active', tab === 'file');
  urlInput.classList.toggle('hidden', tab !== 'url');
  fileInput.classList.toggle('hidden', tab !== 'file');
}

// ---- Image Upload ----
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) processImageFile(file);
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar (JPG, PNG, WebP)', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Compress/resize image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      uploadedImageData = canvas.toDataURL('image/webp', 0.75);
      showImagePreview(uploadedImageData);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  const wrap = document.getElementById('image-preview-wrap');
  const img = document.getElementById('image-preview-img');
  img.src = src;
  wrap.classList.remove('hidden');
  // Update upload zone visual
  const zoneContent = document.getElementById('upload-zone-content');
  if (zoneContent) {
    zoneContent.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5" style="color:#10b981;"></i><span style="color:#10b981;font-weight:600;">Gambar berhasil dipilih</span>';
    lucide.createIcons();
  }
}

function removeImagePreview() {
  uploadedImageData = null;
  document.getElementById('image-preview-wrap').classList.add('hidden');
  document.getElementById('image-preview-img').src = '';
  document.getElementById('form-image-file').value = '';
  // Reset upload zone
  const zoneContent = document.getElementById('upload-zone-content');
  if (zoneContent) {
    zoneContent.innerHTML = '<i data-lucide="image-plus" class="w-6 h-6"></i><span>Klik atau seret gambar ke sini</span><span class="upload-hint">JPG, PNG, WebP · Maks 2MB</span>';
    lucide.createIcons();
  }
}

// ---- Helpers ----
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatPrice(num) {
  if (!num || num === 0) return '0';
  return Number(num).toLocaleString('id-ID');
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return 'Baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 2592000) return Math.floor(s / 86400) + ' hari lalu';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---- Filters ----
function setFilter(filter) {
  currentFilter = filter;
  // Desktop
  document.querySelectorAll('.nav-pill').forEach(t => t.classList.remove('active'));
  const map = { all: 'nav-all', active: 'nav-wishlist', purchased: 'nav-owned' };
  document.getElementById(map[filter])?.classList.add('active');
  // Mobile
  document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
  const mMap = { all: 'm-all', active: 'm-wishlist', purchased: 'm-owned' };
  document.getElementById(mMap[filter])?.classList.add('active');
  renderItems();
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-rarity').value = 'all';
  document.getElementById('filter-priority').value = 'all';
  document.getElementById('sort-by').value = 'newest';
  setFilter('all');
}

function getFilteredItems() {
  const search = document.getElementById('search-input').value.toLowerCase().trim();
  const rarity = document.getElementById('filter-rarity').value;
  const priority = document.getElementById('filter-priority').value;
  const sortBy = document.getElementById('sort-by').value;

  let items = [...wishlist];
  if (currentFilter === 'active') items = items.filter(i => !i.owned);
  if (currentFilter === 'purchased') items = items.filter(i => i.owned);
  if (rarity !== 'all') items = items.filter(i => i.rarity === rarity);
  if (priority !== 'all') items = items.filter(i => i.priority === priority);

  if (search) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(search) ||
      i.hero.toLowerCase().includes(search) ||
      (i.notes && i.notes.toLowerCase().includes(search))
    );
  }

  switch (sortBy) {
    case 'newest':     items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest':     items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'price-high': items.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    case 'price-low':  items.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case 'priority':   items.sort((a, b) => (PRIORITIES[a.priority]?.order ?? 9) - (PRIORITIES[b.priority]?.order ?? 9)); break;
    case 'name':       items.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  return items;
}

// ---- Rendering ----
function renderItems() {
  const grid = document.getElementById('items-grid');
  const emptyState = document.getElementById('empty-state');
  const noResults = document.getElementById('no-results-state');
  const filtered = getFilteredItems();

  if (wishlist.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    noResults.classList.add('hidden');
  } else if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    noResults.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  lucide.createIcons();
  updateStats();
}

function renderCard(item) {
  const rar = RARITIES[item.rarity] || RARITIES.epic;
  const pri = PRIORITIES[item.priority] || PRIORITIES.medium;
  const status = STATUSES[item.status] || STATUSES.available;
  const hasImg = item.image && item.image.trim();
  const ownedCls = item.owned ? 'owned' : '';

  return `
    <div class="skin-card ${ownedCls}" data-rarity="${item.rarity}" onclick="openDetail('${item.id}')">
      <div class="rarity-bar" data-r="${item.rarity}"></div>

      ${item.owned ? '<div class="owned-badge"><i data-lucide="check" class="w-3 h-3"></i> Dimiliki</div>' : ''}

      ${hasImg ? `
        <div class="skin-card-img">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"
               onerror="this.closest('.skin-card-img').outerHTML='<div class=\\'skin-card-placeholder\\' data-r=\\'${item.rarity}\\'><span class=\\'skin-card-placeholder-icon\\'>${rar.icon}</span></div>'" />
        </div>
      ` : `
        <div class="skin-card-placeholder" data-r="${item.rarity}">
          <span class="skin-card-placeholder-icon">${rar.icon}</span>
        </div>
      `}

      <div class="skin-card-body">
        <div class="skin-card-hero">${escapeHtml(item.hero)}</div>
        <div class="skin-card-name">${escapeHtml(item.name)}</div>

        <div class="flex items-center gap-1.5 flex-wrap mt-2.5">
          <span class="rarity-badge rb-${item.rarity}">${rar.icon} ${rar.label}</span>
          <span class="status-badge ${status.cssClass}">${status.label}</span>
          <span class="priority-dot pd-${item.priority}" title="${pri.label}"></span>
        </div>

        ${item.notes ? `<p class="card-notes">${escapeHtml(item.notes)}</p>` : ''}

        <div class="skin-card-footer">
          <div>
            ${item.price ? `<div class="skin-card-price">${formatPrice(item.price)}<span class="price-unit">Token</span></div>` : `<span style="font-size:11px;color:var(--text-muted);">—</span>`}
          </div>
          <div class="card-actions">
            <button class="card-action-btn" title="Edit" onclick="event.stopPropagation();editItem('${item.id}')"><i data-lucide="pencil" class="w-3 h-3"></i></button>
            <button class="card-action-btn" title="${item.owned ? 'Belum dimiliki' : 'Sudah dimiliki'}" onclick="event.stopPropagation();toggleOwned('${item.id}')"><i data-lucide="${item.owned ? 'undo-2' : 'check'}" class="w-3 h-3"></i></button>
            <button class="card-action-btn danger" title="Hapus" onclick="event.stopPropagation();confirmDelete('${item.id}')"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Stats ----
function updateStats() {
  const total = wishlist.length;
  const owned = wishlist.filter(i => i.owned).length;
  const totalVal = wishlist.reduce((s, i) => s + (i.price || 0), 0);
  const progress = total > 0 ? Math.round((owned / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-value').textContent = formatPrice(totalVal);
  document.getElementById('stat-owned').textContent = owned;
  document.getElementById('stat-progress').textContent = progress + '%';
  document.getElementById('progress-bar').style.width = progress + '%';
}

// ---- CRUD ----
function openAddModal() {
  document.getElementById('modal-title').textContent = 'Tambah Skin Baru';
  document.getElementById('btn-save-text').textContent = 'Simpan';
  document.getElementById('item-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('form-rarity').value = 'epic';
  document.getElementById('form-priority').value = 'medium';
  document.getElementById('form-status').value = 'available';
  uploadedImageData = null;
  removeImagePreview();
  switchImageTab('url');
  document.getElementById('item-modal').showModal();
  lucide.createIcons();
}

function editItem(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modal-title').textContent = 'Edit Skin';
  document.getElementById('btn-save-text').textContent = 'Perbarui';
  document.getElementById('form-id').value = item.id;
  document.getElementById('form-hero').value = item.hero;
  document.getElementById('form-name').value = item.name;
  document.getElementById('form-price').value = item.price || '';
  document.getElementById('form-rarity').value = item.rarity;
  document.getElementById('form-priority').value = item.priority;
  document.getElementById('form-status').value = item.status || 'available';
  document.getElementById('form-notes').value = item.notes || '';

  // Handle image
  uploadedImageData = null;
  removeImagePreview();
  if (item.image && item.image.startsWith('data:')) {
    uploadedImageData = item.image;
    switchImageTab('file');
    showImagePreview(item.image);
    document.getElementById('form-image').value = '';
  } else {
    switchImageTab('url');
    document.getElementById('form-image').value = item.image || '';
    if (item.image) showImagePreview(item.image);
  }

  document.getElementById('item-modal').showModal();
  lucide.createIcons();
}

function saveItem(event) {
  event.preventDefault();

  const id = document.getElementById('form-id').value;
  const hero = document.getElementById('form-hero').value.trim();
  const name = document.getElementById('form-name').value.trim();
  const price = parseInt(document.getElementById('form-price').value) || 0;
  const rarity = document.getElementById('form-rarity').value;
  const priority = document.getElementById('form-priority').value;
  const status = document.getElementById('form-status').value;
  const notes = document.getElementById('form-notes').value.trim();

  // Determine image source
  let image = '';
  if (uploadedImageData) {
    image = uploadedImageData;
  } else {
    image = document.getElementById('form-image').value.trim();
  }

  if (!hero || !name) {
    showToast('Nama hero dan skin wajib diisi', 'error');
    return;
  }

  if (id) {
    const idx = wishlist.findIndex(i => i.id === id);
    if (idx !== -1) {
      wishlist[idx] = { ...wishlist[idx], hero, name, price, rarity, priority, status, image, notes, updatedAt: new Date().toISOString() };
      showToast('Skin berhasil diperbarui', 'success');
    }
  } else {
    wishlist.push({
      id: generateId(), hero, name, price, rarity, priority, status, image, notes,
      owned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    showToast('Skin berhasil ditambahkan', 'success');
  }

  saveData();
  closeModal();
  renderItems();
}

function deleteItem(id) {
  wishlist = wishlist.filter(i => i.id !== id);
  saveData();
  renderItems();
  showToast('Skin berhasil dihapus', 'warning');
}

function toggleOwned(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;

  item.owned = !item.owned;
  item.updatedAt = new Date().toISOString();
  item.owned ? (item.ownedAt = new Date().toISOString()) : delete item.ownedAt;

  saveData();
  renderItems();

  if (item.owned) {
    showToast(`${item.name} sekarang dimiliki!`, 'success');
    spawnConfetti();
  } else {
    showToast(`${item.name} dikembalikan ke wishlist`, 'info');
  }
}

// ---- Modals ----
function closeModal() {
  document.getElementById('item-modal').close();
  uploadedImageData = null;
}

function openDetail(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;
  currentDetailId = id;

  const rar = RARITIES[item.rarity] || RARITIES.epic;
  const pri = PRIORITIES[item.priority] || PRIORITIES.medium;
  const status = STATUSES[item.status] || STATUSES.available;
  const modal = document.getElementById('detail-modal');
  const imgWrap = document.getElementById('detail-image-wrap');
  const imgEl = document.getElementById('detail-image');
  const content = document.getElementById('detail-content');
  const toggleBtn = document.getElementById('detail-toggle-btn');

  if (item.image && item.image.trim()) {
    imgWrap.classList.remove('hidden');
    imgEl.src = item.image;
    imgEl.alt = item.name;
    imgEl.onerror = () => imgWrap.classList.add('hidden');
  } else {
    imgWrap.classList.add('hidden');
  }

  if (item.owned) {
    toggleBtn.className = 'glass-btn-ghost flex-1';
    toggleBtn.innerHTML = '<i data-lucide="undo-2" class="w-4 h-4"></i><span>Belum Dimiliki</span>';
  } else {
    toggleBtn.className = 'glass-btn-primary flex-1';
    toggleBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i><span>Sudah Dimiliki</span>';
  }

  content.innerHTML = `
    <div class="flex items-start justify-between gap-3 mb-4">
      <div>
        <div class="skin-card-hero">${escapeHtml(item.hero)}</div>
        <h2 style="font-family:'Outfit',sans-serif;font-size:1.35rem;font-weight:800;color:var(--text-primary);margin-top:4px;">${escapeHtml(item.name)}</h2>
        ${item.owned ? '<div style="margin-top:6px;"><span class="owned-badge" style="position:static;"><i data-lucide="check" class="w-3 h-3"></i> Dimiliki</span></div>' : ''}
      </div>
      ${item.price ? `<div style="font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:800;color:var(--accent);white-space:nowrap;">${formatPrice(item.price)} <span style="font-size:10px;font-weight:500;color:var(--text-tertiary);">Token</span></div>` : ''}
    </div>

    <div class="flex flex-wrap gap-1.5 mb-4">
      <span class="rarity-badge rb-${item.rarity}">${rar.icon} ${rar.label}</span>
      <span class="status-badge ${status.cssClass}">${status.label}</span>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600;background:var(--bg-surface);color:var(--text-secondary);">
        <span class="priority-dot pd-${item.priority}"></span> ${pri.label}
      </span>
    </div>

    ${item.notes ? `<div style="padding:12px;border-radius:12px;background:var(--bg-surface);border:1px solid var(--glass-border);margin-bottom:14px;"><p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${escapeHtml(item.notes)}</p></div>` : ''}

    <div style="font-size:11px;color:var(--text-muted);">
      <p>Ditambahkan ${new Date(item.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</p>
      ${item.ownedAt ? `<p style="margin-top:3px;">Dimiliki sejak ${new Date(item.ownedAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</p>` : ''}
    </div>
  `;

  modal.showModal();
  lucide.createIcons();
}

function togglePurchasedFromDetail() {
  if (!currentDetailId) return;
  document.getElementById('detail-modal').close();
  toggleOwned(currentDetailId);
}

function editFromDetail() {
  if (!currentDetailId) return;
  document.getElementById('detail-modal').close();
  editItem(currentDetailId);
}

function deleteFromDetail() {
  if (!currentDetailId) return;
  document.getElementById('detail-modal').close();
  confirmDelete(currentDetailId);
}

// ---- Confirm ----
function confirmDelete(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;
  document.getElementById('confirm-title').textContent = 'Hapus Skin';
  document.getElementById('confirm-message').textContent = `Hapus "${item.hero} — ${item.name}" dari wishlist? Tindakan ini permanen.`;
  pendingConfirmAction = () => deleteItem(id);
  document.getElementById('confirm-modal').showModal();
}

function confirmClearAll() {
  if (!wishlist.length) { showToast('Wishlist sudah kosong', 'info'); return; }
  document.getElementById('confirm-title').textContent = 'Hapus Semua Data';
  document.getElementById('confirm-message').textContent = `Semua ${wishlist.length} skin akan dihapus permanen. Lanjutkan?`;
  document.getElementById('confirm-btn').textContent = 'Hapus Semua';
  pendingConfirmAction = () => { wishlist = []; saveData(); renderItems(); showToast('Semua data berhasil dihapus', 'warning'); };
  document.getElementById('confirm-modal').showModal();
}

function confirmAction() {
  if (pendingConfirmAction) { pendingConfirmAction(); pendingConfirmAction = null; }
  closeConfirm();
}

function closeConfirm() {
  document.getElementById('confirm-modal').close();
  pendingConfirmAction = null;
}

// ---- Import / Export ----
function exportData() {
  if (!wishlist.length) { showToast('Tidak ada data untuk diekspor', 'info'); return; }
  const blob = new Blob([JSON.stringify(wishlist, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hokvault-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Data berhasil diekspor', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw 0;
      const valid = data.filter(i => i.id && i.name && i.hero);
      if (!valid.length) { showToast('Tidak ada data valid ditemukan', 'error'); return; }
      let n = 0;
      valid.forEach(i => { if (!wishlist.find(w => w.id === i.id)) { wishlist.push(i); n++; } });
      saveData(); renderItems();
      showToast(`${n} skin berhasil diimpor`, 'success');
    } catch { showToast('Format file tidak valid', 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ---- Toast ----
function showToast(message, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `glass-toast toast-${type}`;
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  t.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0" style="opacity:0.8;"></i>
    <span style="flex:1;">${escapeHtml(message)}</span>
    <div class="toast-progress-bar"></div>
  `;
  c.appendChild(t);
  lucide.createIcons();
  setTimeout(() => t.remove(), 3000);
}

// ---- Confetti ----
function spawnConfetti() {
  const colors = ['#f7c948', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = '-10px';
    const s = Math.random() * 7 + 4;
    p.style.width = s + 'px';
    p.style.height = s + 'px';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.animationDuration = (Math.random() * 1 + 1.2) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2800);
  }
}

// ---- Keyboard ----
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search-input').focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAddModal(); }
});
