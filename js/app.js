// ═══════════════════════════════════════════════════════
//  HoK Vault — Application Entry Point
//  Initialization, Keyboard Shortcuts, Window Exports
// ═══════════════════════════════════════════════════════

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  setLayout(currentLayout);
  setGridColumns(currentGridCols);
  await loadData();
  spawnParticles();
  setupDragDrop();
  lucide.createIcons();
});

// ---- Keyboard Shortcuts ----
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search-input').focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAddModal(); }
});

// ---- Window Resize ----
window.addEventListener('resize', () => {
  if (currentLayout === 'poster') {
    setGridColumns(currentGridCols);
  }
});

// ---- Expose to Window for Inline onclick Handlers ----
window.setLayout = setLayout;
window.setGridColumns = setGridColumns;
window.saveGridColumns = saveGridColumns;
window.updateCropPreview = updateCropPreview;
window.resetFramingControls = resetFramingControls;
window.stepCropZoom = stepCropZoom;
window.resetCrop = resetCrop;
window.toggleCardPreviewMock = toggleCardPreviewMock;
window.changeImage = changeImage;
window.removeImagePreview = removeImagePreview;
window.handleUrlInput = handleUrlInput;
window.applyUrlImage = applyUrlImage;
window.switchImageTab = switchImageTab;
window.handleImageUpload = handleImageUpload;
window.openAddModal = openAddModal;
window.closeModal = closeModal;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.togglePurchasedFromDetail = togglePurchasedFromDetail;
window.editFromDetail = editFromDetail;
window.deleteFromDetail = deleteFromDetail;
window.openCardMenu = openCardMenu;
window.closeCardMenu = closeCardMenu;
window.applyScheme = applyScheme;
window.applyAccent = applyAccent;
