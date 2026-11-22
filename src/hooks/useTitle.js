import { useEffect } from 'react';
import { STUDIO } from '../content/studio.js';
const setMeta = (sel, attr, val) => { const m = document.querySelector(sel); if (m && val) m.setAttribute(attr, val); };
/** Per-page title + description. Also keeps the Open Graph / Twitter tags and the canonical URL (present only when SITE_URL was set at build) in step. */
export function useTitle(title, description, { noindex = false } = {}) {
  useEffect(() => {
    const full = title ? `${title} — ${STUDIO.name}` : `${STUDIO.name} — ${STUDIO.headline}`;
    document.title = full;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', full);
    setMeta('meta[name="twitter:title"]', 'content', full);
    if (description) { setMeta('meta[property="og:description"]', 'content', description); setMeta('meta[name="twitter:description"]', 'content', description); }
    const canon = document.querySelector('link[rel="canonical"][data-base]');
    if (canon) { const url = canon.dataset.base.replace(/\/$/, '') + location.pathname.replace(/\/$/, ''); canon.setAttribute('href', url || canon.dataset.base); setMeta('meta[property="og:url"]', 'content', canon.getAttribute('href')); }
    let robots = document.querySelector('meta[name="robots"]');
    if (noindex) { if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); } robots.content = 'noindex'; }
    return () => { if (noindex) document.querySelector('meta[name="robots"]')?.remove(); };
  }, [title, description, noindex]);
}
