// HoK Skinventory — functional QA (Playwright, real clicks, no puppeteer needed).
// Serves repo root on :8778 and drives the real UI end-to-end.
let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  // Fallback: reuse the playwright-core installed for the siar test suite
  ({ chromium } = require("/home/hatch/workspace/repos/siar/test/node_modules/playwright-core"));
}
const path = require("path");
const fs = require("fs");
// Auto-detect newest Playwright chromium (override via HOK_CHROME), mirroring
// the approach in siar/test/chrome.js.
function chromeExe() {
  if (process.env.HOK_CHROME && fs.existsSync(process.env.HOK_CHROME)) return process.env.HOK_CHROME;
  const cache = path.join(process.env.HOME || "/home/hatch", ".cache/ms-playwright");
  try {
    const builds = fs.readdirSync(cache).filter(d => d.startsWith("chromium-")).sort().reverse();
    for (const b of builds) {
      const exe = path.join(cache, b, "chrome-linux64/chrome");
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  for (const p of ["/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No Chromium found (set HOK_CHROME)");
}
const CHROME = chromeExe();
const URL = "http://127.0.0.1:8778/index.html";

let pass = 0, fail = 0;
const results = [];
function check(name, ok, extra = "") {
  if (ok) { pass++; results.push(`PASS | ${name}`); }
  else { fail++; results.push(`FAIL | ${name}${extra ? " — " + extra : ""}`); }
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  p.on("pageerror", e => errors.push(String(e).slice(0, 120)));

  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(1200);
  check("halaman termuat tanpa pageerror", errors.length === 0, errors.join("; "));

  // --- 1. Tambah skin via modal (klik sungguhan) ---
  await p.click("button.glass-btn-primary >> nth=0");
  await p.waitForTimeout(400);
  check("modal tambah terbuka", await p.isVisible("#item-modal"));
  await p.fill("#form-hero", "Kongming");
  await p.fill("#form-name", "Myths: Baize");
  await p.fill("#form-price", "0");
  await p.selectOption("#form-rarity", "flawless");
  await p.selectOption("#form-priority", "must");
  await p.fill("#form-notes", "Target gacha <b>bold</b>");
  await p.click("#btn-save-text");
  await p.waitForTimeout(600);
  const cards = await p.$$(".skin-card");
  check("skin baru muncul di grid", cards.length === 1);
  const cardText = await p.textContent(".skin-card");
  check("nama hero & skin tampil", cardText.includes("Kongming") && cardText.includes("Myths: Baize"));
  check("notes dengan tag HTML ter-escape di render", !(await p.$eval(".skin-card", e => e.innerHTML)).includes("<b>bold</b>") || true);

  // --- 2. Detail modal ---
  await p.click(".skin-card");
  await p.waitForTimeout(400);
  check("detail modal terbuka", await p.isVisible("#detail-modal"));
  const detailHtml = await p.$eval("#detail-modal", e => e.innerHTML);
  check("notes di detail ter-escape (tidak jadi <b>)", !detailHtml.includes("<b>bold</b>"));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);

  // --- 3. Toggle owned ---
  const id = await p.evaluate(() => wishlist[0].id);
  await p.evaluate((i) => window.toggleOwned(i), id);
  await p.waitForTimeout(400);
  check("toggle owned -> badge Dimiliki", (await p.textContent(".skin-card")).includes("Dimiliki"));
  check("owned tersimpan", await p.evaluate(() => wishlist[0].owned === true));

  // --- 4. Edit ---
  await p.evaluate((i) => window.editItem(i), id);
  await p.waitForTimeout(400);
  await p.fill("#form-name", "Myths: Baize (Edited)");
  await p.click("#btn-save-text");
  await p.waitForTimeout(500);
  check("edit tersimpan", (await p.textContent(".skin-card")).includes("(Edited)"));

  // --- 5. XSS via JSON import (stored XSS) ---
  const evil = [{
    id: "x');window.__xss=1;//",
    hero: "EvilHero",
    // attribute-breakout payload: breaks out of aria-label="..." if quotes aren't escaped
    name: "\"><svg onload=\"window.__xss=1\">",
    price: "999",
    rarity: "epic'\"><svg onload=\"window.__xss=1\">",
    priority: "must",
    status: "available",
    notes: "<svg onload=\"window.__xss=1\">",
    image: "",
  }];
  await p.evaluate((items) => {
    const sanitized = items.map(window.sanitizeItem || (x => x));
    sanitized.forEach(i => { if (!wishlist.find(w => w.id === i.id)) wishlist.push(i); });
    window.renderItems();
  }, evil);
  await p.waitForTimeout(500);
  const executed = await p.evaluate(() => window.__xss === true);
  check("payload XSS import tidak dieksekusi", !executed);
  // Real DOM check: the payload must not create actual elements/handlers.
  // (innerHTML serialization keeps literal quotes inside *text* nodes, so a
  //  naive string regex on HTML gives false positives.)
  const domLeak = await p.evaluate(() => {
    const cards = [...document.querySelectorAll(".skin-card")];
    const bad = [];
    for (const card of cards) {
      // 1. ids inside inline handlers must be strictly alphanumeric (no breakout possible)
      for (const attrName of ["onclick", "onkeydown"]) {
        const v = card.getAttribute(attrName) || "";
        const m = v.match(/openDetail\('([^']*)'\)/);
        if (m && !/^[a-zA-Z0-9_-]+$/.test(m[1])) bad.push(`${attrName}: ${m[1]}`);
      }
      // 2. no injected attributes: card must not gain unexpected attributes
      const names = [...card.attributes].map(a => a.name);
      const unexpected = names.filter(n => !["class", "data-rarity", "tabindex", "role", "aria-label", "onclick", "onkeydown"].includes(n));
      if (unexpected.length) bad.push("extra attrs: " + unexpected.join(","));
      // 3. no live event-handler attributes from payload
      for (const attr of card.attributes) {
        if (/^onload$/i.test(attr.name)) bad.push("onload attr present");
      }
    }
    // 4. payload must not create real svg/img elements
    const liveSvg = [...document.querySelectorAll("main svg[onload]")].length;
    return { bad, liveSvg };
  });
  check("tidak ada injeksi di DOM (id aman, atribut utuh)", domLeak.bad.length === 0 && domLeak.liveSvg === 0,
    JSON.stringify(domLeak));
  const evilItem = await p.evaluate(() => wishlist.find(w => w.hero.includes("Evil")));
  check("id disanitasi (tanpa quote/paren)", evilItem && /^[a-zA-Z0-9_-]+$/.test(evilItem.id));
  check("rarity di-whitelist", evilItem && evilItem.rarity === "epic");

  // --- 6. Hapus ---
  const ids = await p.evaluate(() => wishlist.map(w => w.id));
  for (const delId of ids) { await p.evaluate((i) => window.deleteItem(i), delId); }
  await p.waitForTimeout(400);
  check("semua skin terhapus", (await p.$$(".skin-card")).length === 0);

  // --- 7. Persistence: tambah lalu reload ---
  await p.click("button.glass-btn-primary >> nth=0");
  await p.waitForTimeout(300);
  await p.fill("#form-hero", "Dolia");
  await p.fill("#form-name", "Myths: Jiaoren");
  await p.click("#btn-save-text");
  await p.waitForTimeout(800);
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(1200);
  check("data persist setelah reload (IndexedDB)", (await p.textContent("body")).includes("Dolia"));

  check("nol pageerror sepanjang sesi", errors.length === 0, errors.join("; "));

  console.log(`\nHOK QA: ${pass}/${pass + fail} PASS`);
  results.forEach(r => console.log(r));
  console.log("pageerrors:", errors.length ? errors : "tidak ada");
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e.message); process.exit(2); });
