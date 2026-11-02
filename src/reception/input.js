import { CONFIG } from './config.js';

/**
 * One input system for every device. Mouse, trackpad, pen, touch and gamepad all end up in
 * `HeadTracker.setTarget(nx, ny)` (normalised, centre = 0, right/up positive) - nothing else moves.
 *
 * `active` remembers which source currently owns the head so that, for example, an idle gamepad
 * reporting "0,0" can never cancel a mouse, and a lifted finger never cancels a newer mouse move.
 */
export class InputManager {
  constructor({ canvas, getTracker, onSource }) {
    this.canvas = canvas; this.getTracker = getTracker; this.onSource = onSource || (() => {});
    this.cfg = CONFIG.input;
    this.active = null;                 // 'mouse' | 'touch' | 'pen' | 'pad' | null
    this.releaseTimer = 0;
    this.lastPointer = { x: 0, y: 0 };
    this.lastReset = { x: 0, y: 0 };
    this.down = new Map();              // touch pointerId -> { t, x, y, moved }
    this.pad = { index: -1 };
    this.ac = new AbortController();
    this._bind();
  }

  _on(target, type, fn, opts = {}) { target.addEventListener(type, fn, { ...opts, signal: this.ac.signal }); }
  dispose() { this.ac.abort(); clearTimeout(this.releaseTimer); }

  // ---- shared helpers -------------------------------------------------------
  _norm(e) {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    return [Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny))];
  }
  _engage(source, nx, ny) {
    const t = this.getTracker(); if (!t) return;
    clearTimeout(this.releaseTimer);
    if (this.active !== source) { this.active = source; this.onSource(source); }
    t.hold = false;
    t.setTarget(nx, ny);
  }
  _release(source) {
    if (source && this.active && this.active !== source) return;   // someone else owns the head now
    clearTimeout(this.releaseTimer);
    this.active = null; this.getTracker()?.release();
  }
  _releaseLater(source, ms) {
    clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(() => this._release(source), ms);
  }

  reset() {
    const t = this.getTracker(); if (!t) return;
    clearTimeout(this.releaseTimer);
    this.lastReset = { ...this.lastPointer };
    this.active = null; t.reset();
  }

  // ---- pointer events (mouse + pen hover, touch drag) ------------------------
  _bind() {
    const c = this.canvas, d = this.cfg;
    this._on(window, 'pointermove', (e) => { this.lastPointer.x = e.clientX; this.lastPointer.y = e.clientY; }, { passive: true });

    this._on(c, 'pointermove', (e) => {
      const t = this.getTracker(); if (!t) return;
      if (e.pointerType === 'touch') {
        const st = this.down.get(e.pointerId); if (!st) return;
        if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > d.tapMaxMovePx) st.moved = true;
        this._engage('touch', ...this._norm(e)); return;
      }
      // mouse / pen: after Reset, ignore tiny jitters until the pointer really moves
      if (t.hold) { if (Math.hypot(e.clientX - this.lastReset.x, e.clientY - this.lastReset.y) < 6) return; t.hold = false; }
      this._engage(e.pointerType === 'pen' ? 'pen' : 'mouse', ...this._norm(e));
    });

    this._on(c, 'pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.down.set(e.pointerId, { t: performance.now(), x: e.clientX, y: e.clientY, moved: false });
        try { c.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
        this._engage('touch', ...this._norm(e));       // attentive response straight away - no drag needed
      } else {
        const t = this.getTracker();
        if (t && !t.hold) this._engage(e.pointerType === 'pen' ? 'pen' : 'mouse', ...this._norm(e));
      }
    });

    const lift = (e) => {
      if (e.pointerType !== 'touch') return;
      const st = this.down.get(e.pointerId); this.down.delete(e.pointerId);
      if (this.down.size) return;                      // another finger is still on the scene
      const quick = st && !st.moved && performance.now() - st.t < d.tapMaxMs;
      this._releaseLater('touch', quick ? d.tapHoldMs : d.touchHoldMs);
    };
    this._on(c, 'pointerup', lift);
    this._on(c, 'pointercancel', (e) => { if (e.pointerType === 'touch') { this.down.delete(e.pointerId); if (!this.down.size) this._releaseLater('touch', 250); } else this._release(); });

    // mouse/pen leaving the scene (also fires when the cursor goes over the HUD). Touch "leave" follows pointerup - ignore it.
    this._on(c, 'pointerleave', (e) => { if (e.pointerType !== 'touch') this._release(e.pointerType === 'pen' ? 'pen' : 'mouse'); });
    this._on(document.documentElement, 'mouseleave', () => this._release('mouse'));
    this._on(window, 'blur', () => this._release());
    this._on(document, 'visibilitychange', () => { if (document.hidden) this._release(); });
    this._on(c, 'contextmenu', (e) => e.preventDefault());   // long-press on touch screens

    // ---- gamepad (optional) ----
    this._on(window, 'gamepadconnected', (e) => { this.pad.index = e.gamepad.index; });
    this._on(window, 'gamepaddisconnected', (e) => {
      if (this.pad.index === e.gamepad.index) { this.pad.index = -1; this._release('pad'); }
    });
  }

  /** Call once per frame. Cheap no-op when no gamepad API / no pad. */
  pollGamepad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads(); let p = null;
    for (const g of pads) if (g && g.connected && (g.axes.length >= 2)) { p = g; break; }
    if (!p) { if (this.active === 'pad') this._release('pad'); return; }
    const ax = p.axes;
    let x = ax[0] || 0, y = -(ax[1] || 0);
    if (ax.length >= 4 && Math.hypot(ax[2], ax[3]) > Math.hypot(x, y)) { x = ax[2]; y = -ax[3]; }   // right stick if it is the one being used
    const dz = this.cfg.gamepadDeadZone, mag = Math.hypot(x, y);
    if (mag < dz) { if (this.active === 'pad') this._release('pad'); return; }
    const k = Math.min(1, (mag - dz) / (1 - dz)) / mag * this.cfg.gamepadMaxScale;   // radial dead zone, rescaled
    this._engage('pad', x * k, y * k);
  }
}
