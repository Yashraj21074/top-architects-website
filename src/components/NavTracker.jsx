import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { histIdx, recordLocation, saveScroll, savedScroll } from '../lib/navTrail.js';

/** Mounted once. Records every internal navigation (menu, cards, filters, programmatic links, Back/Forward) and restores scroll on Back/Forward. */
export default function NavTracker() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    try { window.history.scrollRestoration = 'manual'; } catch { /* older browsers */ }
    let timer = 0;
    const onScroll = () => {
      if (timer) return;
      timer = window.setTimeout(() => { timer = 0; saveScroll(histIdx(), window.scrollY, window.location.pathname + window.location.search); }, 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
  }, []);
  useEffect(() => {
    const idx = histIdx();
    recordLocation(idx, location.pathname + location.search, type);
    if (type !== 'POP') return undefined;
    const y = savedScroll(idx);
    if (!y) return undefined;
    // Pages load images/lazy chunks after mount and layout can shift, so keep correcting toward the saved position for ~1.6 s —
    // unless the visitor starts scrolling themselves.
    let t = 0, stopped = false;
    const started = performance.now();
    const stop = () => { stopped = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
    const attempt = () => {
      if (stopped || performance.now() - started > 1600) return;
      if (Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y);
      t = window.setTimeout(attempt, 50);
    };
    attempt();
    return () => { window.clearTimeout(t); stopped = true; ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.removeEventListener(e, stop)); };
  }, [location.key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
