// ═══════════════════════════════════════════════════════
//  HoK Vault — Image Handler
//  Upload, Drag & Drop, Preview, Framing Controls
// ═══════════════════════════════════════════════════════

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
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Compress/resize image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      uploadedImageData = canvas.toDataURL('image/webp', 0.65);
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

// ---- Crop / Framing Preview ----
function updateCropPreview() {
  const scaleEl = document.getElementById('form-image-scale');
  const posYEl = document.getElementById('form-image-pos-y');
  const posXEl = document.getElementById('form-image-pos-x');
  
  const scale = scaleEl ? parseInt(scaleEl.value) : 100;
  const posY = posYEl ? parseInt(posYEl.value) : 15;
  const posX = posXEl ? parseInt(posXEl.value) : 50;

  const scaleText = document.getElementById('scale-val-text');
  if (scaleText) scaleText.textContent = `${(scale / 100).toFixed(1)}x`;

  const posYText = document.getElementById('pos-y-val-text');
  if (posYText) posYText.textContent = `${posY}% (${posY < 35 ? 'Atas/Wajah' : posY > 65 ? 'Bawah' : 'Tengah'})`;

  const posXText = document.getElementById('pos-x-val-text');
  if (posXText) posXText.textContent = `${posX}% (${posX < 35 ? 'Kiri' : posX > 65 ? 'Kanan' : 'Tengah'})`;

  const imgEl = document.getElementById('image-preview-img');
  if (imgEl) {
    imgEl.style.objectPosition = `${posX}% ${posY}%`;
    imgEl.style.transform = `scale(${scale / 100})`;
    imgEl.style.transformOrigin = `${posX}% ${posY}%`;
  }

  // Update mock preview text
  const heroInput = document.getElementById('form-hero')?.value.trim();
  const nameInput = document.getElementById('form-name')?.value.trim();
  const mockHero = document.getElementById('mock-preview-hero');
  const mockName = document.getElementById('mock-preview-name');
  if (mockHero) mockHero.textContent = heroInput ? heroInput.toUpperCase() : 'PREVIEW HERO';
  if (mockName) mockName.textContent = nameInput ? nameInput : 'Preview Nama Skin';
}

function resetFramingControls() {
  const scaleEl = document.getElementById('form-image-scale');
  const posYEl = document.getElementById('form-image-pos-y');
  const posXEl = document.getElementById('form-image-pos-x');
  if (scaleEl) scaleEl.value = 100;
  if (posYEl) posYEl.value = 15;
  if (posXEl) posXEl.value = 50;
  updateCropPreview();
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
