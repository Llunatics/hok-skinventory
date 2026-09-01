// ═══════════════════════════════════════════════════════
//  HoK Vault — Rendering Engine
//  renderItems, renderCard, updateStats, layout, card menu
// ═══════════════════════════════════════════════════════

// ---- Layout ----
function setLayout(mode) {
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
    <div class="skin-card ${ownedCls}" data-rarity="${item.rarity}" onclick="openDetail('${item.id}')">
      <div class="rarity-bar" data-r="${item.rarity}"></div>

      ${item.owned ? '<div class="owned-badge"><i data-lucide="check" class="w-3 h-3"></i> Dimiliki</div>' : ''}

      ${hasImg ? `
        <div class="skin-card-img">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" style="${imgStyle}"
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

          <!-- Options Menu Trigger Button -->
          <button class="glass-btn-icon text-xs w-7 h-7 rounded-full flex items-center justify-center p-0 shadow-md shrink-0 relative z-20"
                  title="Opsi Skin"
                  onclick="openCardMenu(event, '${item.id}')">
            <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Card Menu ----
function openCardMenu(event, id) {
  event.stopPropagation();
  const item = wishlist.find(i => i.id === id);
  if (!item) return;

  document.getElementById('card-menu-title').textContent = item.name;
  document.getElementById('card-menu-hero').textContent = item.hero;

  const editBtn = document.getElementById('card-menu-edit-btn');
  const toggleBtn = document.getElementById('card-menu-toggle-btn');
  const toggleText = document.getElementById('card-menu-toggle-text');
  const toggleIcon = document.getElementById('card-menu-toggle-icon');
  const deleteBtn = document.getElementById('card-menu-delete-btn');

  editBtn.onclick = () => {
    document.getElementById('card-menu-modal').close();
    editItem(id);
  };

  if (item.owned) {
    if (toggleText) toggleText.textContent = 'Tandai Belum Dimiliki';
    if (toggleIcon) toggleIcon.innerHTML = `<i data-lucide="undo-2" class="w-4 h-4 text-emerald-400"></i>`;
  } else {
    if (toggleText) toggleText.textContent = 'Tandai Sudah Dimiliki';
    if (toggleIcon) toggleIcon.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>`;
  }

  toggleBtn.onclick = () => {
    document.getElementById('card-menu-modal').close();
    toggleOwned(id);
  };

  deleteBtn.onclick = () => {
    document.getElementById('card-menu-modal').close();
    confirmDelete(id);
  };

  document.getElementById('card-menu-modal').showModal();
  lucide.createIcons();
}

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
