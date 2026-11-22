// ═══════════════════════════════════════════════════════════════
//  HoK Vault — Motion Engine (js/motion.js)
//  SATU tempat untuk semua logika gerak halaman ini:
//  spring Bencho (springOf/step) · glide pill (Arc) · tilt (Bencho) ·
//  count-up (beUI AnimatedNumber) · slide-confirm (Bencho) ·
//  exit modal (beUI MorphingModal).
//  Semua animasi JS/rAF di-gate prefers-reduced-motion.
//  Catatan: spring commit/return SlideConfirm memakai rumus k/c/m
//  §5.2 brief (critically damped eksak) — springOf/step tidak bisa
//  menyatakan zeta tepat 1.0 (tune 0 → zeta ~0.85), jadi rumus
//  SlideConfirm yang lebih spesifik yang dipakai di sana.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Reduced motion ──────────────────────────────────────────────
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMQ.matches;

  // ── Bencho spring (§3.6 SKILL) — SATU model spring halaman ini ──
  // tune 0..100 → zeta ~0.85 (berat) .. ~0.20 (lively); 50 → ~0.41.
  const springOf = (tune) => ({
    k: 0.08 + (tune / 100) * 0.16,
    d: 0.62 + (tune / 100) * 0.2,
  });
  function step(cur, vel, target, k, d, dt) {
    vel += (target - cur) * k * dt;
    vel *= Math.pow(d, dt);
    cur += vel * dt;
    return [cur, vel];
  }
  const SNAP = 0.02;

  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ── Glide pill (Arc segmented-control, vanilla) ─────────────────
  // Satu pill absolut yang meluncur mengikuti tombol aktif.
  const pillGroups = [];

  function initGlidePill(container) {
    if (!container) return null;
    let pill = container.querySelector(':scope > .glide-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'glide-pill';
      pill.setAttribute('aria-hidden', 'true');
      container.prepend(pill);
    }
    const move = () => {
      const active = container.querySelector('.active');
      if (!active || active.offsetWidth === 0) return; // container tersembunyi
      pill.style.width = active.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    };
    // Klik: inline onclick (setFilter/setLayout/switchImageTab) jalan dulu,
    // baru pill diukur di frame berikutnya.
    container.addEventListener('click', () => requestAnimationFrame(move));
    // Perubahan class programatik (mis. clearFilters, openAddModal).
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'class') { move(); break; }
      }
    });
    obs.observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });
    const group = { container, pill, move };
    pillGroups.push(group);
    return group;
  }

  function refreshPills() {
    pillGroups.forEach((g) => g.move());
  }

  // ── Bencho Tilt (§3.5.2) — kartu MENENGELAM di bawah pointer ────
  // rx = -sy·max, ry = sx·max, perspective 800, sink translateZ(-14px).
  // Hover-only; touch datar; reduced motion datar.
  const Tilt = {
    grid: null,
    active: new Set(),
    states: new WeakMap(),
    raf: 0,
    last: 0,
    MAX: 6,
    SINK: 14,
    SHADE: 60, // 0..100

    init(grid) {
      if (!grid) return;
      if (!window.matchMedia('(hover: hover)').matches) return;
      this.grid = grid;
      grid.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
      grid.addEventListener('pointerout', (e) => this.onOut(e));
      grid.addEventListener('pointercancel', () => this.releaseAll());
      grid.addEventListener('pointerdown', (e) => this.onPress(e, true));
      grid.addEventListener('pointerup', (e) => this.onPress(e, false));
    },

    stateFor(card) {
      let s = this.states.get(card);
      if (!s) {
        s = {
          sx: 0, sy: 0, lit: 0, vx: 0, vy: 0, vlit: 0,
          tx: 0, ty: 0, tlit: 0, px: 0.5, py: 0.5,
          pressed: false, rect: null,
          shade: card.querySelector('.tilt-shade'),
        };
        this.states.set(card, s);
      }
      return s;
    },

    onMove(e) {
      if (reduced() || e.pointerType !== 'mouse') return;
      if (!this.grid || this.grid.getAttribute('data-layout') !== 'poster') return;
      const card = e.target && e.target.closest ? e.target.closest('.skin-card') : null;
      if (!card || !this.grid.contains(card)) { this.releaseAll(); return; }
      const s = this.stateFor(card);
      // Ukur dari frame (rect di-cache saat masuk kartu — kartu yang
      // berotasi tidak bisa mengukur dirinya sendiri).
      if (!s.rect) s.rect = card.getBoundingClientRect();
      const r = s.rect;
      const px = clamp((e.clientX - r.left) / r.width, 0, 1);
      const py = clamp((e.clientY - r.top) / r.height, 0, 1);
      s.px = px; s.py = py;
      s.tx = px * 2 - 1;
      s.ty = py * 2 - 1;
      s.tlit = 1;
      this.active.add(card);
      this.kick();
    },

    onOut(e) {
      const card = e.target && e.target.closest ? e.target.closest('.skin-card') : null;
      if (!card) return;
      // Containment test: masih di dalam kartu yang sama → abaikan.
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;
      this.release(card);
    },

    onPress(e, down) {
      if (e.pointerType !== 'mouse') return;
      const card = e.target && e.target.closest ? e.target.closest('.skin-card') : null;
      if (!card) return;
      const s = this.stateFor(card);
      s.pressed = down;
      if (down) { this.active.add(card); this.kick(); }
    },

    release(card) {
      const s = this.states.get(card);
      if (!s) return;
      s.tx = 0; s.ty = 0; s.tlit = 0; s.pressed = false; s.rect = null;
      this.active.add(card);
      this.kick();
    },

    releaseAll() {
      this.active.forEach((card) => this.release(card));
    },

    // Reduced motion / unmount: datar seketika, tanpa spring.
    snapFlat() {
      this.active.forEach((card) => {
        const s = this.states.get(card);
        if (!s) return;
        s.sx = 0; s.sy = 0; s.lit = 0; s.vx = 0; s.vy = 0; s.vlit = 0;
        s.tx = 0; s.ty = 0; s.tlit = 0; s.pressed = false; s.rect = null;
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.willChange = '';
        if (s.shade) s.shade.style.backgroundImage = '';
      });
      this.active.clear();
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    },

    kick() {
      if (!this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame((t) => this.loop(t));
      }
    },

    loop(now) {
      this.raf = 0;
      const dt = clamp((now - this.last) / 16.667, 0.25, 3); // dt dalam frame
      this.last = now;
      const { k, d } = springOf(50); // tune 50, zeta ~0.41
      let anyLive = false;

      this.active.forEach((card) => {
        if (!card.isConnected) { this.active.delete(card); return; }
        const s = this.states.get(card);
        if (!s) { this.active.delete(card); return; }

        let r = step(s.sx, s.vx, s.tx, k, d, dt); s.sx = r[0]; s.vx = r[1];
        r = step(s.sy, s.vy, s.ty, k, d, dt); s.sy = r[0]; s.vy = r[1];
        r = step(s.lit, s.vlit, s.tlit, k, d, dt); s.lit = r[0]; s.vlit = r[1];

        const settled =
          Math.abs(s.sx - s.tx) < SNAP && Math.abs(s.vx) < SNAP &&
          Math.abs(s.sy - s.ty) < SNAP && Math.abs(s.vy) < SNAP &&
          Math.abs(s.lit - s.tlit) < SNAP && Math.abs(s.vlit) < SNAP;

        if (settled) {
          s.sx = s.tx; s.sy = s.ty; s.lit = s.tlit;
          s.vx = 0; s.vy = 0; s.vlit = 0;
        }

        if (s.lit < 0.005 && s.sx === 0 && s.sy === 0) {
          card.style.transform = '';
          card.style.boxShadow = '';
          card.style.willChange = '';
          if (s.shade) s.shade.style.backgroundImage = '';
          this.active.delete(card);
          return;
        }

        anyLive = true;
        card.style.willChange = 'transform';
        const rx = -s.sy * this.MAX;
        const ry = s.sx * this.MAX;
        card.style.transform =
          'perspective(800px) translateZ(' + (-this.SINK * s.lit).toFixed(2) + 'px)' +
          ' rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';

        // Dent (bayangan di pointer) + rim (cahaya di titik cermin) — monokrom.
        if (s.shade) {
          const depth = (this.SHADE / 100) * 0.55 * s.lit;
          const rim = (this.SHADE / 100) * 0.34 * s.lit;
          const px = (s.px * 100).toFixed(1);
          const py = (s.py * 100).toFixed(1);
          const mx = (100 - s.px * 100).toFixed(1);
          const my = (100 - s.py * 100).toFixed(1);
          s.shade.style.backgroundImage =
            'radial-gradient(circle at ' + px + '% ' + py + '%, rgba(0,0,0,' + depth.toFixed(3) + '), transparent 60%),' +
            ' radial-gradient(circle at ' + mx + '% ' + my + '%, rgba(255,255,255,' + rim.toFixed(3) + '), transparent 60%)';
        }

        // Shadow mengetat saat ditekan (offset 20→9, blur 44→24, op .22→.15).
        const off = s.pressed ? 9 : 20;
        const blur = s.pressed ? 24 : 44;
        const op = (s.pressed ? 0.15 : 0.22) * s.lit;
        card.style.boxShadow = '0 ' + off + 'px ' + blur + 'px rgba(0,0,0,' + op.toFixed(3) + ')';
      });

      if (anyLive && this.active.size > 0) {
        this.raf = requestAnimationFrame((t) => this.loop(t));
      }
    },
  };

  // ── Count-up (beUI AnimatedNumber, vanilla) ─────────────────────
  // rAF + easeOutCubic 1.2 detik, Intl.NumberFormat, tabular-nums,
  // menganimasikan DARI nilai sebelumnya; reduced → nilai akhir langsung.
  // Nilai akhir dirender di span sr-only, salinan animasi aria-hidden.
  function animateNumber(animEl, finalEl, value, format) {
    if (!animEl) return;
    const prev = parseFloat(animEl.dataset.prev || '0') || 0;
    animEl.dataset.prev = String(value);
    if (finalEl) finalEl.textContent = format(value);
    if (reduced() || prev === value) {
      animEl.textContent = format(value);
      return;
    }
    if (animEl._raf) cancelAnimationFrame(animEl._raf);
    const from = prev;
    const start = performance.now();
    const DUR = 1200;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / DUR);
      animEl.textContent = format(from + (value - from) * easeOutCubic(p));
      if (p < 1) animEl._raf = requestAnimationFrame(tick);
      else animEl._raf = 0;
    };
    animEl._raf = requestAnimationFrame(tick);
  }

  const fmtInt = (n) => Math.round(n).toLocaleString('id-ID');
  const fmtPct = (n) => Math.round(n) + '%';

  // ── Bencho SlideConfirm (§3.5.3, vanilla) ───────────────────────
  // Commit HANYA di ujung track. Handle mengembang ke kiri saat commit
  // (width = GRIP + (anchor - x), tepi kanan diam secara aritmetik).
  // Drag diikuti di window; grab offset di move pertama; pointer capture
  // di try/catch; touch-action: none di handle DAN track.
  function createSlideConfirm(root, opts) {
    const o = opts || {};
    const onCommit = o.onCommit || function () {};
    const speed = o.speed !== undefined ? o.speed : 50;
    const track = root.querySelector('.slide-confirm-track');
    const handle = root.querySelector('.slide-confirm-handle');
    const fill = root.querySelector('.slide-confirm-fill');
    const label = root.querySelector('.slide-confirm-label');
    if (!track || !handle) return null;

    const PAD = 4;
    const GRIP = 48;
    // Spring commit: exactly critically damped (§5.2 brief).
    const K = 260 + (speed / 100) * 640;
    const M = 0.9;
    const C_COMMIT = 2 * Math.sqrt(K * M);
    const C_RETURN = 0.62 * C_COMMIT;

    let x = 0, vx = 0, squash = 0;
    let dragging = false, grabOffset = null, committed = false;
    let mode = null; // 'commit' | 'return' | null
    let anchor = 0;
    let raf = 0;
    let trackRect = null;

    const travel = () => Math.max(0, track.clientWidth - PAD * 2 - GRIP);

    function render() {
      const t = travel() || 1;
      handle.style.transform =
        'translateX(' + x.toFixed(2) + 'px) scaleX(' + (1 - squash).toFixed(4) + ')';
      handle.style.transformOrigin = 'left center';
      handle.style.width = mode === 'commit'
        ? (GRIP + (anchor - x)).toFixed(2) + 'px'
        : GRIP + 'px';
      fill.style.width = (x + GRIP).toFixed(2) + 'px';
      fill.style.opacity = mode === 'commit' ? '0' : '1';
      const fade = clamp(1 - (x / t) * 1.5, 0, 1);
      label.style.opacity = mode === 'commit' ? '0' : String(fade);
      const icon = handle.querySelector('svg');
      if (icon) icon.style.opacity = mode === 'commit' ? '0' : String(fade);
    }

    function setHandleIcon(name) {
      handle.innerHTML = '<i data-lucide="' + name + '" class="w-5 h-5"></i>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Integrator detik (k/c/m) — rumus §5.2, bukan springOf/step.
    // PENTING: integrator Euler semi-implisit dengan dt frame (s.d. 1/30)
    // TIDAK STABIL untuk konstanta §5.2 (b·dt = 50.8/30 ≈ 1.69 > 1 →
    // eigenvalue −1.06 → osilasi yang MEMBESAR, commit tidak pernah settle;
    // terbukti di probe 22 Nov 2026: handle berayun 276 → −206 px).
    // Perbaikan: substep dt menjadi ≤ 1/240 dtk per langkah — nilai K/C/M
    // §5.2 tetap persis, hanya integrasinya yang diperhalus.
    function runSpring(target, c, onSettle) {
      if (raf) cancelAnimationFrame(raf);
      let last = performance.now();
      const stepFn = (now) => {
        // Clamp dt 1/15 dtk (bukan 1/30): pada perangkat lambat rAF hanya
        // ~7–14 fps sehingga frame interval nyata 70–140 ms; clamp 1/30
        // membuat waktu simulasi maju setengah/ seperempat kecepatan nyata
        // dan spring commit terasa "macet" ~2 dtk (terbukti di VM 22 Nov
        // 2026). Substep ≤ 1/240 dtk tetap menjaga integrator stabil
        // berapapun dt-nya, jadi 1/15 aman dan spring jalan real-time
        // sampai 15 fps.
        const dt = Math.min((now - last) / 1000, 1 / 15);
        last = now;
        const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / sub;
        for (let i = 0; i < sub; i++) {
          const F = -K * (x - target) - c * vx;
          vx += (F / M) * h;
          x += vx * h;
          // Dinding: overshoot return menjadi squash (max 8%).
          if (mode === 'return' && x <= 0 && vx < 0) {
            squash = Math.min(0.08, -vx * 0.02);
            x = 0; vx = 0;
          }
        }
        if (squash > 0.0005) squash *= Math.pow(0.5, (dt * 60) / 8);
        else squash = 0;
        render();
        if (Math.abs(x - target) < 0.5 && Math.abs(vx) < 0.5 && squash < 0.001) {
          x = target; vx = 0; squash = 0;
          render();
          raf = 0;
          if (onSettle) onSettle();
          return;
        }
        raf = requestAnimationFrame(stepFn);
      };
      raf = requestAnimationFrame(stepFn);
    }

    function commit() {
      mode = 'commit';
      anchor = x;
      runSpring(0, C_COMMIT, () => {
        committed = true;
        root.classList.add('committed');
        setHandleIcon('check');
        // Settle pulse: track dips ~2.6%, peak di 0.62 × 0.42s, delay 0.1s.
        if (track.animate) {
          track.animate(
            [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.974)', offset: 0.62 }, { transform: 'scaleY(1)' }],
            { duration: 420, delay: 100, easing: 'ease-out' }
          );
        }
        setTimeout(() => { if (committed) onCommit(); }, 160);
      });
    }

    function startReturn() {
      mode = 'return';
      runSpring(0, C_RETURN, () => { mode = null; x = 0; vx = 0; render(); });
    }

    function onPointerMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      if (grabOffset === null) {
        grabOffset = e.clientX - (trackRect.left + PAD + x);
      }
      const t = travel();
      x = clamp(e.clientX - trackRect.left - PAD - grabOffset, 0, t);
      vx = 0;
      render();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      const t = travel();
      if (x >= t - 0.5) commit();
      else startReturn();
    }

    function onPointerDown(e) {
      if (committed) return;
      e.preventDefault();
      dragging = true;
      grabOffset = null;
      trackRect = track.getBoundingClientRect();
      try { track.setPointerCapture(e.pointerId); } catch (_) { /* best-effort */ }
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { once: true });
      window.addEventListener('pointercancel', onPointerUp, { once: true });
    }

    track.addEventListener('pointerdown', onPointerDown);

    function reset() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      dragging = false; committed = false; mode = null;
      x = 0; vx = 0; squash = 0; grabOffset = null;
      root.classList.remove('committed');
      setHandleIcon('chevrons-right');
      render();
    }

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
    }

    render();
    return { reset, destroy, get committed() { return committed; } };
  }

  // ── Modal exit (beUI MorphingModal: exit 180ms EASE_OUT) ────────
  const EXIT_MS = 180;
  const pendingCloses = new Map();

  function exitMs() { return reduced() ? 0 : EXIT_MS; }

  function closeDialogAnimated(dlg) {
    if (!dlg || !dlg.open) return false;
    if (reduced()) { dlg.close(); return true; }
    if (pendingCloses.has(dlg)) return true;
    dlg.classList.add('modal-closing');
    const t = setTimeout(() => {
      pendingCloses.delete(dlg);
      dlg.classList.remove('modal-closing');
      if (dlg.open) dlg.close();
    }, EXIT_MS);
    pendingCloses.set(dlg, t);
    return true;
  }

  function cancelPendingClose(dlg) {
    const t = pendingCloses.get(dlg);
    if (t !== undefined) {
      clearTimeout(t);
      pendingCloses.delete(dlg);
      dlg.classList.remove('modal-closing');
    }
  }

  // Guard: showModal saat exit animation masih berjalan → batalkan
  // penutupan tertunda, jangan lempar InvalidStateError.
  let showModalWrapped = false;
  function wrapShowModal() {
    if (showModalWrapped) return;
    showModalWrapped = true;
    const orig = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function () {
      cancelPendingClose(this);
      return orig.call(this);
    };
  }

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    initGlidePill(document.querySelector('.nav-pill-container'));
    initGlidePill(document.querySelector('.mobile-tabs'));
    initGlidePill(document.querySelector('.layout-switcher-bar'));
    initGlidePill(document.querySelector('.image-input-tabs'));
    refreshPills();
    window.addEventListener('resize', refreshPills);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshPills);
    }
    // Image tabs hidup di dalam dialog: ukur ulang saat dialog dibuka.
    const itemModal = document.getElementById('item-modal');
    if (itemModal) {
      new MutationObserver(() => refreshPills())
        .observe(itemModal, { attributes: true, attributeFilter: ['open'] });
    }
    Tilt.init(document.getElementById('items-grid'));
    wrapShowModal();
    reduceMQ.addEventListener('change', () => {
      if (reduced()) Tilt.snapFlat();
      refreshPills();
    });
  }

  window.Motion = {
    init,
    reduced,
    exitMs,
    springOf,
    step,
    refreshPills,
    animateNumber,
    fmtInt,
    fmtPct,
    createSlideConfirm,
    closeDialogAnimated,
    cancelPendingClose,
    Tilt,
  };
})();
