// ═══════════════════════════════════════════════════════
//  HoK Vault — UI Helpers
//  Toast, Confetti, Particles, Utilities
// ═══════════════════════════════════════════════════════

// ---- Helpers ----
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatPrice(num) {
  if (!num || num === 0) return '0';
  return Number(num).toLocaleString('id-ID');
}

// Step price up/down for custom spinner buttons
function stepPrice(dir) {
  const input = document.getElementById('form-price');
  if (!input) return;
  let val = parseInt(input.value) || 0;
  val = Math.max(0, val + dir);
  input.value = val;
  input.dispatchEvent(new Event('input', { bubbles: true }));
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
