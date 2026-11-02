// Where did this visit start? 'home' (normal homepage) or 'reception' (the 3D reception).
// Stored per tab in sessionStorage, separately from the current route, so it survives navigation between internal pages and refreshes.
//  - Opening a URL directly (typed / bookmarked / external link) re-establishes the origin from that URL: /reception → reception, anything else → home.
//  - Reload and back/forward keep the stored origin.
//  - Deliberately visiting the homepage or the reception sets the origin to that place.
const KEY = 'top.origin';
const valid = (v) => v === 'home' || v === 'reception';
export const getOrigin = () => { try { const v = sessionStorage.getItem(KEY); return valid(v) ? v : 'home'; } catch { return 'home'; } };
export const setOrigin = (v) => { if (!valid(v)) return; try { if (sessionStorage.getItem(KEY) !== v) sessionStorage.setItem(KEY, v); } catch { /* storage blocked: defaults to home */ } };
const hasStored = () => { try { return valid(sessionStorage.getItem(KEY)); } catch { return false; } };
const navType = () => {
  const e = performance.getEntriesByType?.('navigation')?.[0];
  if (e?.type) return e.type;                                   // 'navigate' | 'reload' | 'back_forward' | 'prerender'
  const t = performance.navigation?.type; return t === 1 ? 'reload' : t === 2 ? 'back_forward' : 'navigate';
};
/** Call once at startup, before the first render. */
export function initOrigin(pathname) {
  const keep = (navType() === 'reload' || navType() === 'back_forward') && hasStored();
  if (!keep) setOrigin(pathname.replace(/\/+$/, '') === '/reception' ? 'reception' : 'home');
}
