// ═══════════════════════════════════════════════════════
//  HoK Vault — Filters & Sorting
//  Filter, search, and sort logic
// ═══════════════════════════════════════════════════════

function setFilter(filter) {
  currentFilter = filter;
  // Desktop
  document.querySelectorAll('.nav-pill').forEach(t => t.classList.remove('active'));
  const map = { all: 'nav-all', active: 'nav-wishlist', purchased: 'nav-owned' };
  document.getElementById(map[filter])?.classList.add('active');
  // Mobile
  document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
  const mMap = { all: 'm-all', active: 'm-wishlist', purchased: 'm-owned' };
  document.getElementById(mMap[filter])?.classList.add('active');
  renderItems();
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-rarity').value = 'all';
  document.getElementById('filter-priority').value = 'all';
  document.getElementById('sort-by').value = 'newest';
  setFilter('all');
}

function getFilteredItems() {
  const search = document.getElementById('search-input').value.toLowerCase().trim();
  const rarity = document.getElementById('filter-rarity').value;
  const priority = document.getElementById('filter-priority').value;
  const sortBy = document.getElementById('sort-by').value;

  let items = [...wishlist];
  if (currentFilter === 'active') items = items.filter(i => !i.owned);
  if (currentFilter === 'purchased') items = items.filter(i => i.owned);
  if (rarity !== 'all') items = items.filter(i => i.rarity === rarity);
  if (priority !== 'all') items = items.filter(i => i.priority === priority);

  if (search) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(search) ||
      i.hero.toLowerCase().includes(search) ||
      (i.notes && i.notes.toLowerCase().includes(search))
    );
  }

  switch (sortBy) {
    case 'newest':     items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest':     items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'price-high': items.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    case 'price-low':  items.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case 'priority':   items.sort((a, b) => (PRIORITIES[a.priority]?.order ?? 9) - (PRIORITIES[b.priority]?.order ?? 9)); break;
    case 'name':       items.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  return items;
}
