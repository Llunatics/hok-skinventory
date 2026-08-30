// ═══════════════════════════════════════════════════════
//  HoK Vault — Firebase Cloud Database & Realtime Sync
//  100% Free Multi-Device Sync (Google Auth + Firestore)
// ═══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Production Firebase Configuration for HoK Vault
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCO0R6UwTdvKnSkr7lKSmyjDqMYEAAfwqw",
  authDomain: "hok-skinventory.firebaseapp.com",
  projectId: "hok-skinventory",
  storageBucket: "hok-skinventory.firebasestorage.app",
  messagingSenderId: "261643615076",
  appId: "1:261643615076:web:ea40272c2555b9a3895871",
  measurementId: "G-3JWM4W1PDB"
};

let firebaseApp = null;
let auth = null;
let db = null;
let googleProvider = null;
let currentUser = null;
let unsubscribeFirestore = null;

// Initialize Firebase
function initFirebase() {
  try {
    const savedConfig = localStorage.getItem('hokvault-firebase-config');
    const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    googleProvider = new GoogleAuthProvider();

    // Check redirect result for mobile browsers
    getRedirectResult(auth).then((result) => {
      if (result && result.user) {
        currentUser = result.user;
        if (window.showToast) window.showToast(`Selamat datang, ${currentUser.displayName}!`, 'success');
      }
    }).catch((err) => {
      console.warn("Mobile redirect auth error:", err);
    });

    // Listen to Auth State Changes
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      updateCloudUI(user);

      if (user) {
        // Start listening to Firestore real-time updates for this user
        subscribeToUserFirestore(user.uid);
      } else {
        if (unsubscribeFirestore) unsubscribeFirestore();
        // Fallback to local storage rendering
        if (window.loadData) window.loadData();
        if (window.renderItems) window.renderItems();
      }
    });
  } catch (err) {
    console.warn("Firebase initialization skipped or using local mode:", err);
  }
}

// Subscribe to User's Cloud Wishlist via Subcollection
function subscribeToUserFirestore(uid) {
  if (!db) return;

  if (unsubscribeFirestore) unsubscribeFirestore();

  // First: check parent doc for theme metadata & legacy array auto-migration
  const userDocRef = doc(db, "users", uid);
  getDoc(userDocRef).then(async (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Auto-migrate legacy single-document wishlist array to subcollection
      if (Array.isArray(data.wishlist) && data.wishlist.length > 0) {
        try {
          const batch = writeBatch(db);
          data.wishlist.forEach(item => {
            if (item && item.id) {
              const itemRef = doc(db, "users", uid, "wishlist", item.id);
              batch.set(itemRef, item);
            }
          });
          batch.update(userDocRef, { wishlist: null });
          await batch.commit();
          console.log("Legacy wishlist array successfully migrated to subcollection.");
        } catch (mErr) {
          console.warn("Legacy migration warning:", mErr);
        }
      }

      if (data.theme) {
        if (data.theme.scheme && window.applyScheme) {
          window.applyScheme(data.theme.scheme);
          localStorage.setItem('hokvault-scheme', data.theme.scheme);
        }
        if (data.theme.accent && window.applyAccent) {
          window.applyAccent(data.theme.accent);
          localStorage.setItem('hokvault-accent', data.theme.accent);
        }
        if (data.theme.gridColumns && window.setGridColumns) {
          window.setGridColumns(data.theme.gridColumns);
        }
      }
    }
  }).catch(err => console.warn("Parent doc read error:", err));

  // Listen to subcollection `users/{uid}/wishlist`
  const wishlistColRef = collection(db, "users", uid, "wishlist");
  unsubscribeFirestore = onSnapshot(wishlistColRef, (snapshot) => {
    const cloudWishlist = [];
    snapshot.forEach(docSnap => {
      cloudWishlist.push(docSnap.data());
    });

    if (cloudWishlist.length > 0 || !snapshot.empty) {
      window.wishlist = cloudWishlist;
      if (window.saveWishlistToIDB) window.saveWishlistToIDB(cloudWishlist);
      else localStorage.setItem('hokvault-data', JSON.stringify(cloudWishlist));

      if (window.renderItems) window.renderItems();
      if (window.updateStats) window.updateStats();
    } else if (snapshot.empty && window.wishlist && window.wishlist.length > 0) {
      pushWishlistToCloud();
    }
  }, (error) => {
    console.error("Firestore snapshot error:", error);
    if (error.code === 'permission-denied') {
      if (window.showToast) window.showToast('Aktifkan Security Rules di Firestore Database Console', 'warning');
    }
  });
}

// Push local wishlist to Cloud Firestore Subcollection
export async function pushWishlistToCloud() {
  if (!db || !currentUser) return;
  try {
    const scheme = localStorage.getItem('hokvault-scheme') || 'dark';
    const accent = localStorage.getItem('hokvault-accent') || 'gold';
    const gridColumns = parseInt(localStorage.getItem('hokvault-grid-cols')) || 4;

    // Save user theme/metadata
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      theme: { scheme, accent, gridColumns },
      updatedAt: new Date().toISOString(),
      email: currentUser.email,
      displayName: currentUser.displayName
    }, { merge: true });

    // Sync all wishlist items into subcollection
    const items = window.wishlist || [];
    const wishlistColRef = collection(db, "users", currentUser.uid, "wishlist");

    const existingSnap = await getDocs(wishlistColRef);
    const existingIds = new Set();
    existingSnap.forEach(d => existingIds.add(d.id));

    const currentIds = new Set(items.map(i => i.id));
    const batch = writeBatch(db);

    // Delete items removed locally
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        batch.delete(doc(db, "users", currentUser.uid, "wishlist", id));
      }
    });

    // Save/update active items
    items.forEach(item => {
      if (item && item.id) {
        batch.set(doc(db, "users", currentUser.uid, "wishlist", item.id), item);
      }
    });

    await batch.commit();
  } catch (err) {
    console.error("Gagal sync ke cloud:", err);
    if (err.code === 'permission-denied') {
      if (window.showToast) window.showToast('Izin Firestore ditolak. Buka tab Rules di Console', 'error');
    }
  }
}

// Login Google (Supports Popup & Fallback Redirect)
export async function loginGoogle() {
  if (!auth || !googleProvider) {
    if (window.showToast) window.showToast('Firebase belum terkonfigurasi', 'warning');
    return;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    updateCloudUI(currentUser);
    if (window.showToast) window.showToast(`Selamat datang, ${currentUser.displayName}!`, 'success');
    closeCloudModal();
  } catch (err) {
    console.warn("Popup login gagal, mencoba redirect...", err);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (redirectErr) {
      console.error("Redirect login gagal:", redirectErr);
      if (window.showToast) window.showToast('Login Google gagal: ' + (redirectErr.message || ''), 'error');
    }
  }
}

// Logout Google
export async function logoutGoogle() {
  if (!auth) return;
  try {
    await signOut(auth);
    currentUser = null;
    if (window.showToast) window.showToast('Berhasil keluar dari akun Google', 'info');
    closeCloudModal();
  } catch (err) {
    console.error("Logout gagal:", err);
  }
}

// Save Custom Firebase Config
export function saveFirebaseConfig(configJsonStr) {
  try {
    const parsed = JSON.parse(configJsonStr);
    if (!parsed.apiKey || !parsed.projectId) throw new Error("Invalid config");
    localStorage.setItem('hokvault-firebase-config', JSON.stringify(parsed));
    if (window.showToast) window.showToast('Konfigurasi Firebase berhasil disimpan!', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch {
    if (window.showToast) window.showToast('Format JSON Firebase config tidak valid', 'error');
  }
}

// Update UI
function updateCloudUI(user) {
  const cloudBtnText = document.getElementById('cloud-status-text');
  const loggedOutView = document.getElementById('cloud-user-logged-out');
  const loggedInView = document.getElementById('cloud-user-logged-in');
  const avatarImg = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');

  if (user) {
    if (cloudBtnText) cloudBtnText.textContent = `☁️ ${user.displayName.split(' ')[0]}`;
    if (loggedOutView) loggedOutView.classList.add('hidden');
    if (loggedInView) loggedInView.classList.remove('hidden');
    if (avatarImg) avatarImg.src = user.photoURL || '';
    if (userName) userName.textContent = user.displayName;
    if (userEmail) userEmail.textContent = user.email;
  } else {
    if (cloudBtnText) cloudBtnText.textContent = 'Cloud Sync';
    if (loggedOutView) loggedOutView.classList.remove('hidden');
    if (loggedInView) loggedInView.classList.add('hidden');
  }
}

function closeCloudModal() {
  document.getElementById('cloud-modal')?.close();
}

// Expose to window for inline onclick handlers
window.loginGoogle = loginGoogle;
window.logoutGoogle = logoutGoogle;
window.saveFirebaseConfig = saveFirebaseConfig;
window.pushWishlistToCloud = pushWishlistToCloud;

// Auto init on load
document.addEventListener('DOMContentLoaded', initFirebase);
