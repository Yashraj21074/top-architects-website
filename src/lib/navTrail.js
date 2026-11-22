// Navigation trail: remembers, per browser tab, which page sat at each position of the browser history,
// together with its scroll position and (on Projects) the gallery position. The Back bar uses it to say
// "Back to <the page you actually came from>" and to restore where you were.
//
// Keyed by React Router's history index (window.history.state.idx), which the browser keeps in step with Back/Forward/reload,
// so the trail can never disagree with real history. Stored in sessionStorage (per tab, survives reload).
const KEY = 'top.trail.v1';
export const histIdx = () => { const i = window.history.state?.idx; return Number.isInteger(i) ? i : 0; };
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (t) => { try { sessionStorage.setItem(KEY, JSON.stringify(t)); } catch { /* storage blocked: Back falls back to Projects / Home */ } };

/** Idempotent. PUSH discards the forward entries; REPLACE/POP keep what is known about this position. */
export function recordLocation(idx, path, type) {
  const t = read();
  if (type === 'PUSH') for (const k of Object.keys(t)) if (Number(k) > idx) delete t[k];
  const prev = t[idx];
  const same = prev && prev.path === path;
  t[idx] = { path, scroll: same ? prev.scroll || 0 : 0, gallery: same ? prev.gallery : undefined };
  write(t);
}
export const previousEntry = (idx) => (idx > 0 ? read()[idx - 1] || null : null);
export function saveScroll(idx, y, path) { const t = read(); t[idx] = { ...(t[idx] || { path }), scroll: Math.round(y) }; write(t); }
export const savedScroll = (idx) => read()[idx]?.scroll || 0;
export function saveGallery(idx, offset, path) { const t = read(); if (!t[idx]) t[idx] = { path, scroll: 0 }; t[idx].gallery = Math.round(offset * 10) / 10; write(t); }
export const savedGallery = (idx) => { const g = read()[idx]?.gallery; return Number.isFinite(g) ? g : 0; };
