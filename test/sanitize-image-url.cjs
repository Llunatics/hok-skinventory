// HoK Skinventory — regression test: image URL scheme allowlist.
// Ensures javascript:/data:text/html/vbscript: URLs can never be stored in
// the image field (stored-XSS hardening, deep-5 2026-10-20).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = {};
vm.createContext(ctx);
for (const f of ["js/constants.js", "js/ui-helpers.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), ctx, { filename: f });
}
const { sanitizeImageUrl, sanitizeItem } = ctx;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL | " + name); }
};

// accepted
check("https kept", sanitizeImageUrl("https://example.com/a.jpg") === "https://example.com/a.jpg");
check("http kept", sanitizeImageUrl("http://example.com/a.png") === "http://example.com/a.png");
check("https case-insensitive", sanitizeImageUrl("HTTPS://example.com/a.jpg") === "HTTPS://example.com/a.jpg");
check("data:image kept", sanitizeImageUrl("data:image/png;base64,iVBOR") === "data:image/png;base64,iVBOR");
check("blob kept", sanitizeImageUrl("blob:https://x/y") === "blob:https://x/y");
check("site-relative kept", sanitizeImageUrl("/assets/x.jpg") === "/assets/x.jpg");
check("empty kept", sanitizeImageUrl("") === "");
check("whitespace trimmed", sanitizeImageUrl("  https://example.com/a.jpg  ") === "https://example.com/a.jpg");

// rejected
check("javascript: rejected", sanitizeImageUrl("javascript:window.__xss=1") === "");
check("javascript: case/space rejected", sanitizeImageUrl("  JaVaScRiPt:alert(1)") === "");
check("data:text/html rejected", sanitizeImageUrl("data:text/html,<script>alert(1)</script>") === "");
check("data:image/svg+xml allowed (inert in <img>)",
  sanitizeImageUrl("data:image/svg+xml,<svg onload=alert(1)>") !== "");
check("vbscript: rejected", sanitizeImageUrl("vbscript:msgbox(1)") === "");
check("file: rejected", sanitizeImageUrl("file:///etc/passwd") === "");
check("ftp: rejected", sanitizeImageUrl("ftp://example.com/a.jpg") === "");
check("html injection rejected", sanitizeImageUrl('"><img src=x onerror=alert(1)>') === "");
check("null/undefined safe", sanitizeImageUrl(null) === "" && sanitizeImageUrl(undefined) === "");

// via sanitizeItem (import / cloud-sync path)
const evil = sanitizeItem({
  id: 'x', hero: 'H', name: 'N',
  image: "javascript:window.__xss=1", rarity: "nope", priority: "nope", status: "nope",
});
check("sanitizeItem strips javascript: image", evil.image === "");
check("sanitizeItem falls back rarity", evil.rarity === "epic");
const okItem = sanitizeItem({ id: "a1", image: "https://example.com/a.jpg" });
check("sanitizeItem keeps https image", okItem.image === "https://example.com/a.jpg");

console.log(`sanitize-image-url: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
