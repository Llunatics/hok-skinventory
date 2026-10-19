# HoK Vault — Skin Wishlist Tracker

Pelacak wishlist skin **Honor of Kings** dalam browser: kartu koleksi berbingkai rarity, filter & sortir, modal detail, studio crop gambar, tema gelap/terang, dan sinkronisasi cloud opsional. 100% berjalan di browser — tanpa build step, tanpa server.

**Live:** https://hok.llunaticsys.web.id

## Fitur

**Koleksi**
- 10 tier rarity: Basic → Rare → Epic → Epic Limited → Legend → Legend Limited → Precious → Flawless → Treasure Flawless → Mythic, masing-masing dengan bingkai kartu khasnya sendiri
- 4 prioritas (Harus Punya / Tinggi / Sedang / Rendah) dan 3 status ketersediaan (Tersedia / Mendatang / Tidak Tersedia)
- Per skin: hero, nama skin, harga (token), rarity, prioritas, status, catatan, dan gambar sampul
- Tandai **sudah dimiliki** — skin owned terpisah dari daftar incaran

**Tampilan**
- Grid kartu vault dengan layer rarity, kartu "Incaran Utama" yang disorot
- Modal detail kaca (glass) per skin: gambar besar, harga, status kepemilikan, catatan, tanggal ditambahkan
- Menu konteks per kartu (klik kanan): ubah, hapus, toggle owned
- Tema gelap / terang

**Studio gambar**
- Upload atau tempel URL gambar, lalu crop langsung di browser: geser, zoom (scale), dan pratinjau live di mockup kartu sebelum disimpan

**Filter & pencarian**
- Cari nama skin/hero, filter rarity / prioritas / status / owned, sortir multi-kriteria

**Data & sinkronisasi**
- Penyimpanan lokal: IndexedDB (`HoKVaultDB`) dengan fallback localStorage — data tetap milikmu, di perangkatmu
- Sinkronisasi cloud **opsional** via Firebase (Firestore + Google sign-in) untuk akses lintas perangkat

## Menjalankan secara lokal

Situs statis murni, tanpa dependensi runtime.

```bash
git clone https://github.com/Llunatics/hok-skinventory.git
cd hok-skinventory
python3 -m http.server 8000
```

Buka http://localhost:8000. (Beberapa CDN — Tailwind, Lucide, Firebase — butuh koneksi internet.)

## Pengujian

```bash
node test/functional.cjs   # uji fungsional headless (butuh Chrome/Chromium + playwright-core)
node qa_runner.cjs         # skenario QA end-to-end (butuh puppeteer-core)
```

`test/functional.cjs` otomatis mendeteksi Chromium yang tersedia dan fallback ke `playwright-core` milik repo siar bila perlu.

## Struktur

```
.
├── index.html        # Halaman utama
├── css/              # base, variables, cards, components, modals, vault, animations
├── js/
│   ├── constants.js  # definisi rarity, prioritas, status, konfigurasi IndexedDB
│   ├── state.js      # state aplikasi
│   ├── storage.js    # persistensi IndexedDB + fallback localStorage
│   ├── crud.js       # tambah / ubah / hapus skin
│   ├── filters.js    # pencarian, filter, sortir
│   ├── render.js     # render grid kartu + hero
│   ├── modals.js     # modal tambah/ubah, detail, konfirmasi, cloud
│   ├── image-handler.js  # studio crop gambar
│   ├── theme.js      # tema gelap/terang
│   ├── ui-helpers.js # utilitas UI
│   └── app.js        # inisialisasi
├── firebase-sync.js  # sinkronisasi cloud opsional (ES module, Firebase 10)
├── test/
│   └── functional.cjs
└── qa_runner.cjs
```

## Teknologi

- HTML, CSS, JavaScript murni (tanpa framework, tanpa build)
- Tailwind CDN + ikon Lucide
- IndexedDB / localStorage untuk data lokal
- Firebase 10 (Auth + Firestore) — hanya untuk sync cloud opsional
- Hosting: Vercel (situs statis)

## Lisensi

Lihat berkas lisensi bila tersedia; seluruh aset skin adalah milik kreator dan pemegang haknya masing-masing.
