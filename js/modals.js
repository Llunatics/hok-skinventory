// ═══════════════════════════════════════════════════════
//  HoK Vault — Modals & Dialogs
//  Detail Dialog, Confirm, Scroll Locking, Import/Export
// ═══════════════════════════════════════════════════════

// ---- Scroll Lock Helpers ----
function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  // Only remove if no modal dialog is open
  const openModals = document.querySelectorAll('dialog[open]');
  if (openModals.length === 0) {
    document.body.classList.remove('modal-open');
  }
}

// Auto-unlock on dialog close event
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => {
      unlockBodyScroll();
    });
  });
});

// ---- Item Modal (Add / Edit) ----
function closeModal() {
  const modal = document.getElementById('item-modal');
  if (modal) modal.close();
  uploadedImageData = null;
  unlockBodyScroll();
}

// ---- Detail Modal (2-Column Premium View) ----
function openDetail(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;
  currentDetailId = id;

  const rar = RARITIES[item.rarity] || RARITIES.epic;
  const pri = PRIORITIES[item.priority] || PRIORITIES.medium;
  const status = STATUSES[item.status] || STATUSES.available;

  const modal = document.getElementById('detail-modal');
  const imgEl = document.getElementById('detail-image');
  const placeholderEl = document.getElementById('detail-placeholder');
  const placeholderIcon = document.getElementById('detail-placeholder-icon');
  const placeholderLabel = document.getElementById('detail-placeholder-label');
  const posterWrap = document.getElementById('detail-poster-wrap');

  const heroNameEl = document.getElementById('detail-hero-name');
  const skinNameEl = document.getElementById('detail-skin-name');
  const rarityBadge = document.getElementById('detail-rarity-badge');
  const statusBadge = document.getElementById('detail-status-badge');
  const priceValEl = document.getElementById('detail-price-val');
  const priorityDot = document.getElementById('detail-priority-dot');
  const priorityLabel = document.getElementById('detail-priority-label');

  const availText = document.getElementById('detail-availability-text');
  const ownershipStatusText = document.getElementById('detail-ownership-status-text');
  const createdText = document.getElementById('detail-created-text');
  const ownedRow = document.getElementById('detail-owned-row');
  const ownedText = document.getElementById('detail-owned-text');

  const notesWrap = document.getElementById('detail-notes-wrap');
  const notesText = document.getElementById('detail-notes-text');
  const ownershipCta = document.getElementById('detail-ownership-cta');
  const ownershipCtaText = document.getElementById('detail-ownership-cta-text');

  // Text contents
  if (heroNameEl) heroNameEl.textContent = item.hero;
  if (skinNameEl) skinNameEl.textContent = item.name && item.name.trim() ? item.name : item.hero;

  // Price
  if (priceValEl) {
    if (item.price && item.price > 0) {
      priceValEl.textContent = formatPrice(item.price);
    } else {
      priceValEl.textContent = 'Gratis';
    }
  }

  // Priority
  if (priorityDot) priorityDot.className = `priority-dot pd-${item.priority}`;
  if (priorityLabel) priorityLabel.textContent = pri.label;

  // Badges
  if (rarityBadge) {
    rarityBadge.className = `rarity-badge rb-${item.rarity} shadow-md`;
    rarityBadge.innerHTML = `${rar.icon} ${rar.label}`;
  }
  if (statusBadge) {
    statusBadge.className = `status-badge ${status.cssClass} shadow-md`;
    statusBadge.textContent = status.label;
  }

  // Explicit Availability vs Ownership
  if (availText) {
    let dotColor = '#10b981';
    if (item.status === 'upcoming') dotColor = '#6366f1';
    if (item.status === 'expired') dotColor = '#ef4444';
    availText.innerHTML = `<span class="w-2 h-2 rounded-full inline-block" style="background:${dotColor};"></span> ${status.label}`;
  }

  if (ownershipStatusText) {
    if (item.owned) {
      ownershipStatusText.innerHTML = `<span class="w-2 h-2 rounded-full inline-block bg-emerald-400"></span> <span class="text-emerald-400 font-bold">Sudah Dimiliki</span>`;
    } else {
      ownershipStatusText.innerHTML = `<span class="w-2 h-2 rounded-full inline-block bg-slate-500"></span> <span class="text-secondary font-medium">Dalam Wishlist</span>`;
    }
  }

  // Dates
  if (createdText) {
    createdText.textContent = new Date(item.createdAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  if (ownedRow && ownedText) {
    if (item.owned && item.ownedAt) {
      ownedRow.classList.remove('hidden');
      ownedText.textContent = new Date(item.ownedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else {
      ownedRow.classList.add('hidden');
    }
  }

  // Notes
  if (notesWrap && notesText) {
    if (item.notes && item.notes.trim()) {
      notesText.textContent = item.notes;
      notesWrap.classList.remove('hidden');
    } else {
      notesWrap.classList.add('hidden');
    }
  }

  // Poster Image & Custom Framing
  const scale = (item.imageScale || 100) / 100;
  const posX = item.imagePosX !== undefined ? item.imagePosX : 50;
  const posY = item.imagePosY !== undefined ? item.imagePosY : (item.imagePos !== undefined ? item.imagePos : 15);

  if (item.image && item.image.trim()) {
    if (imgEl) {
      imgEl.src = item.image;
      imgEl.alt = item.name || item.hero;
      imgEl.style.objectPosition = `${posX}% ${posY}%`;
      imgEl.style.transform = `scale(${scale})`;
      imgEl.style.transformOrigin = `${posX}% ${posY}%`;
      imgEl.classList.remove('hidden');
      imgEl.onerror = () => {
        imgEl.classList.add('hidden');
        if (placeholderEl) placeholderEl.classList.remove('hidden');
      };
    }
    if (placeholderEl) placeholderEl.classList.add('hidden');
  } else {
    if (imgEl) imgEl.classList.add('hidden');
    if (placeholderEl) {
      placeholderEl.classList.remove('hidden');
      if (placeholderIcon) placeholderIcon.textContent = rar.icon;
      if (placeholderLabel) placeholderLabel.textContent = rar.label;
    }
  }

  // Poster Ambient Depth (Natural, Restrained, No White Inset Outline)
  if (posterWrap) {
    const rarityAmbient = {
      basic: 'rgba(148, 163, 184, 0.08)',
      rare: 'rgba(59, 130, 246, 0.10)',
      epic: 'rgba(139, 92, 246, 0.12)',
      epic_limited: 'rgba(168, 85, 247, 0.14)',
      legend: 'rgba(240, 180, 41, 0.12)',
      legend_limited: 'rgba(245, 158, 11, 0.14)',
      precious: 'rgba(236, 72, 153, 0.12)',
      flawless: 'rgba(6, 182, 212, 0.12)',
      treasure_flawless: 'rgba(245, 158, 11, 0.14)',
      mythic: 'rgba(239, 68, 68, 0.14)',
    };
    const ambient = rarityAmbient[item.rarity] || 'transparent';
    posterWrap.style.boxShadow = `0 20px 48px -10px rgba(0,0,0,0.7), 0 0 24px ${ambient}`;
  }

  // Ownership Action Button
  if (ownershipCta) {
    if (item.owned) {
      ownershipCta.className = 'w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 detail-btn-owned transition-all duration-300';
      ownershipCta.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i><span>✓ Sudah Dimiliki (Klik untuk Batalkan)</span>';
    } else {
      ownershipCta.className = 'w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 detail-btn-unowned transition-all duration-300';
      ownershipCta.innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4"></i><span>+ Tandai Sudah Dimiliki</span>';
    }
  }

  modal.showModal();
  lockBodyScroll();
  lucide.createIcons();
}

function closeDetail() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function togglePurchasedFromDetail() {
  if (!currentDetailId) return;
  toggleOwned(currentDetailId);
  // Re-render detail modal with new state
  openDetail(currentDetailId);
}

function editFromDetail() {
  if (!currentDetailId) return;
  const id = currentDetailId;
  closeDetail();
  editItem(id);
}

function deleteFromDetail() {
  if (!currentDetailId) return;
  const id = currentDetailId;
  closeDetail();
  confirmDelete(id);
}

// ---- Confirm Modal ----
function confirmDelete(id) {
  const item = wishlist.find(i => i.id === id);
  if (!item) return;

  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const btnEl = document.getElementById('confirm-btn');

  if (titleEl) titleEl.textContent = 'Hapus Skin?';
  if (msgEl) msgEl.textContent = `"${item.hero} — ${item.name || item.hero}" akan dihapus dari inventory.`;
  if (btnEl) btnEl.textContent = 'Hapus';

  pendingConfirmAction = () => deleteItem(id);
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) {
    confirmModal.showModal();
    lockBodyScroll();
  }
}

function confirmClearAll() {
  if (!wishlist.length) {
    showToast('Wishlist sudah kosong', 'info');
    return;
  }
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const btnEl = document.getElementById('confirm-btn');

  if (titleEl) titleEl.textContent = 'Hapus Semua Data?';
  if (msgEl) msgEl.textContent = `Semua ${wishlist.length} skin akan dihapus permanen dari inventory.`;
  if (btnEl) btnEl.textContent = 'Hapus Semua';

  pendingConfirmAction = () => {
    wishlist = [];
    saveData();
    renderItems();
    showToast('Semua data berhasil dihapus', 'warning');
  };
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) {
    confirmModal.showModal();
    lockBodyScroll();
  }
}

function confirmAction() {
  if (pendingConfirmAction) {
    pendingConfirmAction();
    pendingConfirmAction = null;
  }
  closeConfirm();
}

function closeConfirm() {
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) confirmModal.close();
  pendingConfirmAction = null;
  unlockBodyScroll();
}

// ---- Import / Export ----
function exportData() {
  if (!wishlist.length) {
    showToast('Tidak ada data untuk diekspor', 'info');
    return;
  }
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
      const valid = data.filter(i => i.id && (i.name || i.hero));
      if (!valid.length) {
        showToast('Tidak ada data valid ditemukan', 'error');
        return;
      }
      let n = 0;
      valid.forEach(i => {
        if (!wishlist.find(w => w.id === i.id)) {
          wishlist.push(i);
          n++;
        }
      });
      saveData();
      renderItems();
      showToast(`${n} skin berhasil diimpor`, 'success');
    } catch {
      showToast('Format file tidak valid', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
