// ═══════════════════════════════════════════════════════
//  HoK Vault — Application State
//  Global state variables shared across modules
// ═══════════════════════════════════════════════════════

let wishlist = [];
Object.defineProperty(window, 'wishlist', {
  get() { return wishlist; },
  set(val) { wishlist = Array.isArray(val) ? val : []; },
  configurable: true
});

let currentFilter = 'all';
let currentDetailId = null;
let pendingConfirmAction = null;
let uploadedImageData = null; // For local image uploads

let currentLayout = localStorage.getItem('hokvault-layout') || 'poster';
let currentGridCols = parseInt(localStorage.getItem('hokvault-grid-cols')) || 4;
