import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { histIdx, savedScroll } from '../lib/navTrail.js';

/**
 * Scrolls to the element named by the URL hash (/services#architecture): on arrival from another page, on a direct load / refresh and when
 * the hash changes on the same page. The target keeps correcting for ~1.6 s because images and lazy chunks shift the layout after mount,
 * and stops the moment the visitor scrolls. Back/Forward to a spot the visitor already scrolled to keeps that position (NavTracker).
 * The destination stops below the sticky header through the target's scroll-margin-top.
 */
export default function HashScroll() {
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType(), prev = useRef(pathname);
  useEffect(() => {
    const samePage = prev.current === pathname; prev.current = pathname;
    const id = decodeURIComponent(hash.slice(1)); if (!id) return undefined;
    if (type === 'POP' && savedScroll(histIdx())) return undefined;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0, stopped = false; const started = performance.now(); let smoothed = false;
    const stop = () => { stopped = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
    const attempt = () => {
      if (stopped || performance.now() - started > 1600) return;
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
        if (samePage && !reduced && !smoothed) { smoothed = true; el.scrollIntoView({ block: 'start', behavior: 'smooth' }); stopped = true; return; }   // same page: a short smooth scroll
        if (Math.abs(top) > 3) el.scrollIntoView({ block: 'start', behavior: 'instant' });                                                                 // arriving: land there at once
      }
      t = window.setTimeout(attempt, 80);
    };
    t = window.setTimeout(attempt, 0);                   // after Layout's own scroll-to-top for the new route
    return () => { window.clearTimeout(t); stopped = true; ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.removeEventListener(e, stop)); };
  }, [pathname, hash, key, type]);
  return null;
}
