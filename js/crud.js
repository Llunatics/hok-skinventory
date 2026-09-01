// ═══════════════════════════════════════════════════════
//  HoK Vault — CRUD Operations
//  Add, Edit, Save, Delete, Toggle Owned
// ═══════════════════════════════════════════════════════

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Tambah Skin Baru';
  document.getElementById('btn-save-text').textContent = 'Simpan';
  document.getElementById('item-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('form-rarity').value = 'epic';
  document.getElementById('form-priority').value = 'medium';
  document.getElementById('form-status').value = 'available';
  resetFramingControls();
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

  const scaleEl = document.getElementById('form-image-scale');
  const posYEl = document.getElementById('form-image-pos-y');
  const posXEl = document.getElementById('form-image-pos-x');
  if (scaleEl) scaleEl.value = item.imageScale || 100;
  if (posYEl) posYEl.value = item.imagePosY !== undefined ? item.imagePosY : (item.imagePos !== undefined ? item.imagePos : 15);
  if (posXEl) posXEl.value = item.imagePosX !== undefined ? item.imagePosX : 50;

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
  updateCropPreview();

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

  const scaleEl = document.getElementById('form-image-scale');
  const posYEl = document.getElementById('form-image-pos-y');
  const posXEl = document.getElementById('form-image-pos-x');

  const imageScale = scaleEl ? parseInt(scaleEl.value) : 100;
  const imagePosY = posYEl ? parseInt(posYEl.value) : 15;
  const imagePosX = posXEl ? parseInt(posXEl.value) : 50;

  // Determine image source
  let image = '';
  if (uploadedImageData) {
    image = uploadedImageData;
  } else {
    image = document.getElementById('form-image').value.trim();
  }

  if (!hero) {
    showToast('Nama hero wajib diisi', 'error');
    return;
  }

  let savedItemObj = null;
  if (id) {
    const idx = wishlist.findIndex(i => i.id === id);
    if (idx !== -1) {
      savedItemObj = { ...wishlist[idx], hero, name, price, rarity, priority, status, image, imageScale, imagePosY, imagePosX, notes, updatedAt: new Date().toISOString() };
      wishlist[idx] = savedItemObj;
      showToast('Skin berhasil diperbarui', 'success');
    }
  } else {
    savedItemObj = {
      id: generateId(), hero, name, price, rarity, priority, status, image, imageScale, imagePosY, imagePosX, notes,
      owned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    wishlist.push(savedItemObj);
    showToast('Skin berhasil ditambahkan', 'success');
  }

  if (savedItemObj && window.saveCloudItem) {
    window.saveCloudItem(savedItemObj);
  }

  saveData();
  closeModal();
  renderItems();
}

function deleteItem(id) {
  wishlist = wishlist.filter(i => i.id !== id);
  if (window.deleteCloudItem) window.deleteCloudItem(id);
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

  if (window.saveCloudItem) window.saveCloudItem(item);
  saveData();
  renderItems();

  if (item.owned) {
    showToast(`${item.name} sekarang dimiliki!`, 'success');
    spawnConfetti();
  } else {
    showToast(`${item.name} dikembalikan ke wishlist`, 'info');
  }
}
