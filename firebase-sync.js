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
  onSnapshot,
  getDoc
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

// Subscribe to User's Cloud Wishlist
function subscribeToUserFirestore(uid) {
  if (!db) return;
  const userDocRef = doc(db, "users", uid);

  if (unsubscribeFirestore) unsubscribeFirestore();

  unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.wishlist)) {
        window.wishlist = data.wishlist;
        localStorage.setItem('hokvault-data', JSON.stringify(data.wishlist));
        if (window.renderItems) window.renderItems();
        if (window.updateStats) window.updateStats();
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
    } else {
      // First time user cloud setup: push current local wishlist to cloud
      pushWishlistToCloud();
    }
  }, (error) => {
    console.error("Firestore snapshot error:", error);
    if (error.code === 'permission-denied') {
      if (window.showToast) window.showToast('Aktifkan Security Rules di Firestore Database Console', 'warning');
    }
  });
}

// Push local wishlist to Cloud Firestore
export async function pushWishlistToCloud() {
  if (!db || !currentUser) return;
  try {
    const scheme = localStorage.getItem('hokvault-scheme') || 'dark';
    const accent = localStorage.getItem('hokvault-accent') || 'gold';
    const gridColumns = parseInt(localStorage.getItem('hokvault-grid-cols')) || 4;

    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      wishlist: window.wishlist || [],
      theme: { scheme, accent, gridColumns },
      updatedAt: new Date().toISOString(),
      email: currentUser.email,
      displayName: currentUser.displayName
    }, { merge: true });
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
