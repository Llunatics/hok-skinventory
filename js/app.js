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

// ---- Expose to Window for Inline onclick Handlers ----
window.setLayout = setLayout;
window.setGridColumns = setGridColumns;
window.saveGridColumns = saveGridColumns;
window.updateCropPreview = updateCropPreview;
window.resetFramingControls = resetFramingControls;
window.applyScheme = applyScheme;
window.applyAccent = applyAccent;
