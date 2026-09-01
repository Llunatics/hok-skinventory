// ═══════════════════════════════════════════════════════
//  HoK Vault — Constants & Configuration
//  Rarity, Priority, Status definitions & DB config
// ═══════════════════════════════════════════════════════

const RARITIES = {
  basic:             { label: 'Basic',             icon: '◇',  order: 9 },
  rare:              { label: 'Rare',              icon: '◆',  order: 8 },
  epic:              { label: 'Epic',              icon: '✦',  order: 7 },
  epic_limited:      { label: 'Epic Limited',      icon: '✦⚜', order: 6 },
  legend:            { label: 'Legend',             icon: '★',  order: 5 },
  legend_limited:    { label: 'Legend Limited',     icon: '★⚜', order: 4 },
  precious:          { label: 'Precious',           icon: '♛',  order: 3 },
  flawless:          { label: 'Flawless',           icon: '❖',  order: 2 },
  treasure_flawless: { label: 'Treasure Flawless',  icon: '✪',  order: 1 },
  mythic:            { label: 'Mythic',             icon: '⚝',  order: 0 },
};

const PRIORITIES = {
  must:   { label: 'Harus Punya', order: 0 },
  high:   { label: 'Tinggi',      order: 1 },
  medium: { label: 'Sedang',      order: 2 },
  low:    { label: 'Rendah',      order: 3 },
};

const STATUSES = {
  available: { label: 'Tersedia',       cssClass: 'sb-available' },
  upcoming:  { label: 'Mendatang',      cssClass: 'sb-upcoming' },
  expired:   { label: 'Tidak Tersedia', cssClass: 'sb-expired' },
};

// IndexedDB Configuration
const DB_NAME = 'HoKVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'wishlistStore';
