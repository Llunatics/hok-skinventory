// ═══════════════════════════════════════════════════════
//  HoK Vault — Theme Management
//  Scheme (dark/light) & Accent color switching
// ═══════════════════════════════════════════════════════

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
  if (window.pushWishlistToCloud) window.pushWishlistToCloud();
  if (document.activeElement) document.activeElement.blur();
}

function setAccent(accent) {
  applyAccent(accent);
  localStorage.setItem('hokvault-accent', accent);
  if (window.pushWishlistToCloud) window.pushWishlistToCloud();
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
