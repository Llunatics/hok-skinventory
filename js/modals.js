// ═══════════════════════════════════════════════════════
//  HoK Vault — Modals & Dialogs
//  Detail, Confirm, Import/Export
// ═══════════════════════════════════════════════════════

// ---- Item Modal ----
function closeModal() {
  document.getElementById('item-modal').close();
  uploadedImageData = null;
}

// ---- Detail Modal ----
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

// ---- Confirm Modal ----
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
