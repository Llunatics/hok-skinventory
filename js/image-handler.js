// ═══════════════════════════════════════════════════════
//  HoK Vault — Image Handler & Direct Manipulation Crop
//  Upload, Drag & Drop, Direct Framing Workspace, Zoom
// ═══════════════════════════════════════════════════════

let cropScale = 100;
let cropPosX = 50;
let cropPosY = 15;
let isCropEditorInitialized = false;
let cropInteractingTimeout = null;

// ---- Image Tab Switch ----
function switchImageTab(tab) {
  const urlTab = document.getElementById('img-tab-url');
  const fileTab = document.getElementById('img-tab-file');
  const urlInput = document.getElementById('img-input-url');
  const fileInput = document.getElementById('img-input-file');

  if (urlTab) urlTab.classList.toggle('active', tab === 'url');
  if (fileTab) fileTab.classList.toggle('active', tab === 'file');
  if (urlInput) urlInput.classList.toggle('hidden', tab !== 'url');
  if (fileInput) fileInput.classList.toggle('hidden', tab !== 'file');
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
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 900;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      uploadedImageData = canvas.toDataURL('image/webp', 0.82);
      showImagePreview(uploadedImageData);
    };
    img.onerror = () => {
      showToast('Gagal memproses file gambar', 'error');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- URL Image Handling ----
function handleUrlInput(event) {
  const url = event.target.value.trim();
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
    // If user hit enter or pasted a long url
    if (event.type === 'change') {
      applyUrlImage();
    }
  }
}

function applyUrlImage() {
  const urlInput = document.getElementById('form-image');
  if (!urlInput) return;
  const url = urlInput.value.trim();
  if (!url) {
    showToast('Silakan masukkan link URL gambar', 'warning');
    return;
  }

  const img = new Image();
  img.onload = () => {
    uploadedImageData = null;
    showImagePreview(url);
    showToast('Gambar berhasil dimuat', 'success');
  };
  img.onerror = () => {
    showToast('Gagal memuat gambar dari URL. Pastikan URL dapat diakses publik.', 'error');
  };
  img.src = url;
}

// ---- Show & Hide Image in Framing Studio ----
function showImagePreview(src) {
  const studioWrap = document.getElementById('crop-studio-wrap');
  const uploadSection = document.getElementById('image-upload-section');
  const cropImg = document.getElementById('crop-image');

  if (cropImg) cropImg.src = src;
  if (studioWrap) studioWrap.classList.remove('hidden');
  if (uploadSection) uploadSection.classList.add('hidden');

  // Synchronize image reference so saveItem() always retains it
  if (src && src.startsWith('data:')) {
    uploadedImageData = src;
  } else if (src) {
    uploadedImageData = null;
    const urlInput = document.getElementById('form-image');
    if (urlInput) urlInput.value = src;
  }

  // Read current or stored values
  const scaleEl = document.getElementById('form-image-scale');
  const posXEl = document.getElementById('form-image-pos-x');
  const posYEl = document.getElementById('form-image-pos-y');

  cropScale = scaleEl ? parseInt(scaleEl.value) || 100 : 100;
  cropPosX = posXEl ? parseInt(posXEl.value) || 50 : 50;
  cropPosY = posYEl ? parseInt(posYEl.value) || 15 : 15;

  applyCropStyles();
  initCropEditor();
  updateMockOverlayText();
  lucide.createIcons();
}

function changeImage() {
  const studioWrap = document.getElementById('crop-studio-wrap');
  const uploadSection = document.getElementById('image-upload-section');
  if (studioWrap) studioWrap.classList.add('hidden');
  if (uploadSection) uploadSection.classList.remove('hidden');
}

function removeImagePreview() {
  uploadedImageData = null;
  const studioWrap = document.getElementById('crop-studio-wrap');
  const uploadSection = document.getElementById('image-upload-section');
  const cropImg = document.getElementById('crop-image');
  const urlInput = document.getElementById('form-image');
  const fileInput = document.getElementById('form-image-file');

  if (cropImg) cropImg.src = '';
  if (urlInput) urlInput.value = '';
  if (fileInput) fileInput.value = '';

  if (studioWrap) studioWrap.classList.add('hidden');
  if (uploadSection) uploadSection.classList.remove('hidden');

  resetFramingControls();
  lucide.createIcons();
}

// ---- Direct Manipulation Crop Engine ----
function initCropEditor() {
  const viewport = document.getElementById('crop-viewport');
  if (!viewport || isCropEditorInitialized) return;

  isCropEditorInitialized = true;
  let isDragging = false;
  let startX = 0, startY = 0;
  let startPosX = 50, startPosY = 15;
  let activePointers = new Map();
  let startPinchDistance = 0;
  let startPinchScale = 100;

  function onPointerDown(e) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (activePointers.size === 1) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPosX = cropPosX;
      startPosY = cropPosY;
      viewport.setPointerCapture(e.pointerId);
      triggerInteractingState(true);
    } else if (activePointers.size === 2) {
      isDragging = false;
      const pts = Array.from(activePointers.values());
      startPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      startPinchScale = cropScale;
    }
  }

  function onPointerMove(e) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (startPinchDistance > 0) {
        const factor = dist / startPinchDistance;
        cropScale = Math.max(100, Math.min(300, Math.round(startPinchScale * factor)));
        applyCropStyles();
      }
      return;
    }

    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Direct pan physics:
    // Dragging right pulls left image portion into view (cropPosX decreases)
    // Dragging down pulls top image portion into view (cropPosY decreases)
    const zoomRatio = cropScale / 100;
    const sensitivity = 0.85 / zoomRatio;
    const dxPercent = (deltaX / rect.width) * 100 * sensitivity;
    const dyPercent = (deltaY / rect.height) * 100 * sensitivity;

    cropPosX = Math.max(0, Math.min(100, Math.round(startPosX - dxPercent)));
    cropPosY = Math.max(0, Math.min(100, Math.round(startPosY - dyPercent)));

    applyCropStyles();
  }

  function onPointerUp(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) {
      isDragging = false;
      triggerInteractingState(false);
      try {
        if (viewport.hasPointerCapture(e.pointerId)) {
          viewport.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    } else if (activePointers.size === 1) {
      const remaining = activePointers.values().next().value;
      startX = remaining.x;
      startY = remaining.y;
      startPosX = cropPosX;
      startPosY = cropPosY;
      isDragging = true;
    }
  }

  // Wheel zoom with passive: false to prevent scrolling modal
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 10 : -10;
    stepCropZoom(zoomDelta);
    triggerInteractingState(true, 400);
  }, { passive: false });

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
}

function triggerInteractingState(active, autoDismissMs = 0) {
  const viewport = document.getElementById('crop-viewport');
  const hintBadge = document.getElementById('crop-hint-badge');
  if (!viewport) return;

  if (cropInteractingTimeout) {
    clearTimeout(cropInteractingTimeout);
    cropInteractingTimeout = null;
  }

  if (active) {
    viewport.classList.add('is-interacting');
    if (hintBadge) hintBadge.style.opacity = '0';
    if (autoDismissMs > 0) {
      cropInteractingTimeout = setTimeout(() => {
        viewport.classList.remove('is-interacting');
      }, autoDismissMs);
    }
  } else {
    viewport.classList.remove('is-interacting');
  }
}

// ---- Apply & Sync Crop Settings ----
function applyCropStyles() {
  const cropImg = document.getElementById('crop-image');
  const scaleBadge = document.getElementById('crop-scale-badge');
  const scaleInput = document.getElementById('form-image-scale');
  const posXInput = document.getElementById('form-image-pos-x');
  const posYInput = document.getElementById('form-image-pos-y');

  if (cropImg) {
    cropImg.style.objectPosition = `${cropPosX}% ${cropPosY}%`;
    cropImg.style.transform = `scale(${cropScale / 100})`;
    cropImg.style.transformOrigin = `${cropPosX}% ${cropPosY}%`;
  }

  if (scaleBadge) {
    scaleBadge.textContent = `${(cropScale / 100).toFixed(1)}x`;
  }

  if (scaleInput) scaleInput.value = cropScale;
  if (posXInput) posXInput.value = cropPosX;
  if (posYInput) posYInput.value = cropPosY;
}

function stepCropZoom(delta) {
  cropScale = Math.max(100, Math.min(300, cropScale + delta));
  applyCropStyles();
  triggerInteractingState(true, 300);
}

function resetCrop(mode = 'default') {
  if (mode === 'fit') {
    cropScale = 100;
    cropPosX = 50;
    cropPosY = 50;
  } else {
    // Default portrait framing focusing on upper face
    cropScale = 100;
    cropPosX = 50;
    cropPosY = 15;
  }
  applyCropStyles();
  triggerInteractingState(true, 400);
}

function resetFramingControls() {
  cropScale = 100;
  cropPosX = 50;
  cropPosY = 15;
  applyCropStyles();
}

function updateCropPreview() {
  // Backwards compatibility with any calls
  const scaleInput = document.getElementById('form-image-scale');
  const posXInput = document.getElementById('form-image-pos-x');
  const posYInput = document.getElementById('form-image-pos-y');

  if (scaleInput) cropScale = parseInt(scaleInput.value) || 100;
  if (posXInput) cropPosX = parseInt(posXInput.value) || 50;
  if (posYInput) cropPosY = parseInt(posYInput.value) || 15;

  applyCropStyles();
  updateMockOverlayText();
}

// ---- Optional Card Preview Mock Overlay ----
function toggleCardPreviewMock() {
  const overlay = document.getElementById('crop-mock-card-overlay');
  const toggleBtn = document.getElementById('crop-toggle-mock-btn');
  if (!overlay) return;

  const isHidden = overlay.classList.contains('hidden');
  if (isHidden) {
    overlay.classList.remove('hidden');
    if (toggleBtn) toggleBtn.classList.add('active');
    updateMockOverlayText();
  } else {
    overlay.classList.add('hidden');
    if (toggleBtn) toggleBtn.classList.remove('active');
  }
}

function updateMockOverlayText() {
  const heroInput = document.getElementById('form-hero')?.value.trim();
  const nameInput = document.getElementById('form-name')?.value.trim();
  const mockHero = document.getElementById('crop-mock-hero');
  const mockName = document.getElementById('crop-mock-name');

  if (mockHero) mockHero.textContent = heroInput ? heroInput.toUpperCase() : 'PREVIEW HERO';
  if (mockName) mockName.textContent = nameInput ? nameInput : 'Preview Nama Skin';
}

// ---- Drag & Drop for Upload Zone ----
function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) processImageFile(files[0]);
  });
}

// Synchronize mock preview on text inputs
document.addEventListener('DOMContentLoaded', () => {
  const heroInput = document.getElementById('form-hero');
  const nameInput = document.getElementById('form-name');
  if (heroInput) heroInput.addEventListener('input', updateMockOverlayText);
  if (nameInput) nameInput.addEventListener('input', updateMockOverlayText);
});
