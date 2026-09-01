// ═══════════════════════════════════════════════════════
//  HoK Vault — Data Persistence
//  IndexedDB + LocalStorage Fallback
// ═══════════════════════════════════════════════════════

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getWishlistFromIDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB load error, fallback to localStorage:", e);
    const data = localStorage.getItem('hokvault-data');
    return data ? JSON.parse(data) : [];
  }
}

async function saveWishlistToIDB(items) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
    for (const item of items) {
      store.put(item);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    try {
      localStorage.setItem('hokvault-data', JSON.stringify(items));
    } catch (e) {
      console.warn("localStorage backup skipped due to size:", e);
    }
  } catch (e) {
    console.error("Failed to save to IndexedDB:", e);
    try {
      localStorage.setItem('hokvault-data', JSON.stringify(items));
    } catch (err) {
      showToast("Penyimpanan lokal penuh!", "error");
    }
  }
}

async function loadData() {
  try {
    const idbData = await getWishlistFromIDB();
    if (idbData && idbData.length > 0) {
      wishlist = idbData;
    } else {
      const data = localStorage.getItem('hokvault-data');
      wishlist = data ? JSON.parse(data) : [];
      if (wishlist.length > 0) {
        await saveWishlistToIDB(wishlist);
      }
    }
  } catch (err) {
    console.warn("loadData error:", err);
    try {
      const data = localStorage.getItem('hokvault-data');
      wishlist = data ? JSON.parse(data) : [];
    } catch { wishlist = []; }
  }
  renderItems();
  updateStats();
}

async function saveData() {
  await saveWishlistToIDB(wishlist);
  if (window.pushWishlistToCloud) {
    window.pushWishlistToCloud();
  }
}

window.saveWishlistToIDB = saveWishlistToIDB;
window.getWishlistFromIDB = getWishlistFromIDB;
