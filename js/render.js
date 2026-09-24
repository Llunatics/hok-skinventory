// ═══════════════════════════════════════════════════════
//  HoK Vault — Rendering Engine
//  renderItems, renderCard, updateStats, layout, card menu
// ═══════════════════════════════════════════════════════

// ---- Layout ----
function setLayout(mode) {
  if (mode !== 'poster' && mode !== 'list') mode = 'poster';
  currentLayout = mode;
  localStorage.setItem('hokvault-layout', mode);
  document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`layout-btn-${mode}`)?.classList.add('active');
  const grid = document.getElementById('items-grid');
  if (grid) {
    grid.setAttribute('data-layout', mode);
    if (mode === 'list') {
      grid.style.gridTemplateColumns = '';
      document.getElementById('cols-controller-row')?.classList.add('hidden');
    } else {
      grid.style.gridTemplateColumns = `repeat(${currentGridCols}, minmax(0, 1fr))`;
      document.getElementById('cols-controller-row')?.classList.remove('hidden');
    }
  }
}

function updateSliderTrack(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 1;
  const max = parseFloat(slider.max) || 6;
  const val = parseFloat(slider.value) || 4;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--input-bg) ${pct}%, var(--input-bg) 100%)`;
}

function setGridColumns(cols) {
  const c = parseInt(cols) || 4;
  currentGridCols = c;

  const valText = document.getElementById('cols-val-text');
  if (valText) valText.textContent = `${c} Kartu`;

  const slider = document.getElementById('grid-cols-slider');
  if (slider) {
    if (slider.value != c) slider.value = c;
    updateSliderTrack(slider);
  }

  const gridEl = document.getElementById('items-grid');
  if (gridEl) {
    if (currentLayout === 'list') {
      gridEl.style.gridTemplateColumns = '';
    } else {
      if (window.innerWidth <= 640) {
        const mobileCols = Math.min(c, 3);
        gridEl.style.gridTemplateColumns = `repeat(${mobileCols}, minmax(0, 1fr))`;
      } else {
        gridEl.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`;
      }
    }
  }
}

function saveGridColumns(cols) {
  const c = parseInt(cols) || 4;
  localStorage.setItem('hokvault-grid-cols', c);
  if (window.pushWishlistToCloud) window.pushWishlistToCloud();
}

// ---- Rendering ----
function renderItems() {
  const grid = document.getElementById('items-grid');
  if (grid) {
    grid.setAttribute('data-layout', currentLayout);
    if (currentLayout === 'list') {
      grid.style.gridTemplateColumns = '';
      document.getElementById('cols-controller-row')?.classList.add('hidden');
    } else {
      grid.style.gridTemplateColumns = `repeat(${currentGridCols}, minmax(0, 1fr))`;
      document.getElementById('cols-controller-row')?.classList.remove('hidden');
    }
  }
  const emptyState = document.getElementById('empty-state');
  const noResults = document.getElementById('no-results-state');
  const filtered = getFilteredItems();

  if (wishlist.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    noResults.classList.add('hidden');
  } else if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    noResults.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  lucide.createIcons();
  updateStats();
}

function renderCard(item) {
  const rar = RARITIES[item.rarity] || RARITIES.epic;
  const pri = PRIORITIES[item.priority] || PRIORITIES.medium;
  const status = STATUSES[item.status] || STATUSES.available;
  const hasImg = item.image && item.image.trim();
  const ownedCls = item.owned ? 'owned' : '';

  const scale = (item.imageScale || 100) / 100;
  const posX = item.imagePosX !== undefined ? item.imagePosX : 50;
  const posY = item.imagePosY !== undefined ? item.imagePosY : (item.imagePos !== undefined ? item.imagePos : 15);
  const imgStyle = `object-position: ${posX}% ${posY}%; transform: scale(${scale}); transform-origin: ${posX}% ${posY}%;`;

  return `
    <div class="skin-card ${ownedCls}" data-rarity="${item.rarity}" tabindex="0" role="button" aria-label="Detail skin ${escapeHtml(item.hero)} - ${escapeHtml(item.name || item.hero)}" onclick="openDetail('${item.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){if(!event.target.closest('.card-menu-trigger')){event.preventDefault();openDetail('${item.id}');}}">
      ${item.owned ? '<div class="owned-badge"><i data-lucide="check" class="w-3 h-3"></i> Dimiliki</div>' : ''}

      ${hasImg ? `
        <div class="skin-card-img">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || item.hero)}" loading="lazy" style="${imgStyle}"
               onerror="this.closest('.skin-card-img').outerHTML='<div class=\\'skin-card-placeholder\\' data-r=\\'${item.rarity}\\'><span class=\\'skin-card-placeholder-icon\\'>${rar.icon}</span></div>'" />
        </div>
      ` : `
        <div class="skin-card-placeholder" data-r="${item.rarity}">
          <span class="skin-card-placeholder-icon">${rar.icon}</span>
        </div>
      `}

      <div class="skin-card-body">
        <div class="flex items-end justify-between gap-2 w-full">
          <div class="min-w-0 flex-1">
            ${item.name && item.name.trim() ? `<div class="skin-card-hero">${escapeHtml(item.hero)}</div>` : ''}
            <div class="skin-card-name">${escapeHtml(item.name && item.name.trim() ? item.name : item.hero)}</div>
            
            <div class="flex items-center gap-1.5 flex-wrap mt-1">
              <span class="rarity-badge rb-${item.rarity}">${rar.icon} ${rar.label}</span>
              <span class="priority-dot pd-${item.priority}" title="${pri.label}"></span>
              ${item.price ? `<span class="skin-card-price">${formatPrice(item.price)} <span class="price-unit">Token</span></span>` : ''}
            </div>
          </div>

          <!-- Options Menu Trigger Button (Liquid Glass) -->
          <button type="button" class="card-menu-trigger"
                  title="Menu Opsi Skin"
                  aria-label="Menu opsi skin"
                  aria-haspopup="true"
                  onclick="openCardMenu(event, '${item.id}')">
            <i data-lucide="more-vertical" class="w-3.5 h-3.5 pointer-events-none"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Anchored Card Context Menu ----
let activeContextTrigger = null;
let contextMenuOpenTime = 0;

function openCardMenu(event, id) {
  event.stopPropagation();
  const item = wishlist.find(i => i.id === id);
  if (!item) return;

  const menu = document.getElementById('card-context-menu');
  if (!menu) return;

  const triggerBtn = event.currentTarget;

  // If already open for this same button, toggle close
  if (!menu.classList.contains('hidden') && activeContextTrigger === triggerBtn) {
    closeCardMenu();
    return;
  }

  activeContextTrigger = triggerBtn;
  contextMenuOpenTime = Date.now();

  const editBtn = document.getElementById('context-menu-edit-btn');
  const toggleBtn = document.getElementById('context-menu-toggle-btn');
  const toggleText = document.getElementById('context-menu-toggle-text');
  const toggleIcon = document.getElementById('context-menu-toggle-icon');
  const deleteBtn = document.getElementById('context-menu-delete-btn');

  if (editBtn) {
    editBtn.onclick = () => {
      closeCardMenu();
      editItem(id);
    };
  }

  if (item.owned) {
    if (toggleText) toggleText.textContent = 'Batalkan Kepemilikan';
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'undo-2');
  } else {
    if (toggleText) toggleText.textContent = 'Tandai Sudah Dimiliki';
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'check');
  }

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      closeCardMenu();
      toggleOwned(id);
    };
  }

  if (deleteBtn) {
    deleteBtn.onclick = () => {
      closeCardMenu();
      confirmDelete(id);
    };
  }

  lucide.createIcons();

  // Position anchored menu with viewport awareness & dynamic transform-origin
  menu.classList.remove('hidden');

  const rect = triggerBtn.getBoundingClientRect();
  const menuWidth = 205;
  const menuHeight = 135;

  let top = rect.bottom + 6;
  let isAbove = false;
  if (top + menuHeight > window.innerHeight - 10) {
    top = Math.max(10, rect.top - menuHeight - 6);
    isAbove = true;
  }

  let left = rect.right - menuWidth;
  let isFlippedX = false;
  if (left < 10) {
    left = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.left));
    isFlippedX = true;
  }

  const originY = isAbove ? 'bottom' : 'top';
  const originX = isFlippedX ? 'left' : 'right';
  menu.style.transformOrigin = `${originY} ${originX}`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;

  if (editBtn) editBtn.focus();
}

function closeCardMenu() {
  const menu = document.getElementById('card-context-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    if (activeContextTrigger) {
      activeContextTrigger = null;
    }
  }
}

// Global outside click & Escape listener for context menu
document.addEventListener('pointerdown', (e) => {
  if (Date.now() - contextMenuOpenTime < 80) return;
  const menu = document.getElementById('card-context-menu');
  if (menu && !menu.classList.contains('hidden')) {
    if (!menu.contains(e.target) && (!activeContextTrigger || !activeContextTrigger.contains(e.target))) {
      closeCardMenu();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCardMenu();
  }
});

window.addEventListener('resize', closeCardMenu);
window.addEventListener('scroll', () => {
  if (Date.now() - contextMenuOpenTime < 150) return;
  closeCardMenu();
}, true);

// ---- Stats ----
function updateStats() {
  const total = wishlist.length;
  const owned = wishlist.filter(i => i.owned).length;
  const totalVal = wishlist.reduce((s, i) => s + (i.price || 0), 0);
  const progress = total > 0 ? Math.round((owned / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-value').textContent = formatPrice(totalVal);
  document.getElementById('stat-owned').textContent = owned;
  document.getElementById('stat-progress').textContent = progress + '%';
  document.getElementById('progress-bar').style.width = progress + '%';
}
