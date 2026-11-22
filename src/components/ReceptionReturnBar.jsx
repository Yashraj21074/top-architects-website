import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACTIVE_CATEGORIES, PROJECTS } from '../content/projects.js';
import { SERVICES } from '../content/services.js';
import { ARTICLES } from '../content/journal.js';
import { histIdx, previousEntry, recordLocation } from '../lib/navTrail.js';
import { unlockSpeech } from '../lib/speech.js';

const FIXED = { '/': 'Home', '/reception': 'Reception', '/studio': 'About', '/projects': 'Projects', '/services': 'Services', '/process': 'Process', '/team': 'Team', '/journal': 'Journal', '/contact': 'Contact' };
/** Human label for a path, taken from the page the visitor actually came from. */
export function labelFor(path = '') {
  const [pathname] = path.split('?');
  const clean = pathname.replace(/\/+$/, '') || '/';
  // Category filters (?category=…) are filters of ONE page, never a Back destination: /projects is always "Projects".
  const cat = new URLSearchParams(path.split('?')[1] || '').get('category');
  if (clean === '/projects' && ACTIVE_CATEGORIES.includes(cat)) return cat;           // came from a filtered collection: "Return to Residential"
  const m = clean.match(/^\/(projects|services|journal)\/([^/]+)$/);
  if (m) {
    const hit = m[1] === 'projects' ? PROJECTS.find((p) => p.slug === m[2]) : m[1] === 'services' ? SERVICES.find((s) => s.slug === m[2]) : ARTICLES.find((a) => a.slug === m[2]);
    return hit?.title || FIXED[`/${m[1]}`];
  }
  return FIXED[clean] || 'Previous page';
}
/** No internal history (page opened directly): project pages -> Projects, articles -> Journal, everything else -> Home. */
const fallbackFor = (pathname) => {
  if (/^\/projects\/[^/]+/.test(pathname)) return { path: '/projects', label: 'Projects' };
  if (/^\/journal\/[^/]+/.test(pathname)) return { path: '/journal', label: 'Journal' };
  return { path: '/', label: 'Home' };
};

/** Sticky Back bar on every inner page. Always means "go back to the page I just came from" (real browser history). */
export default function ReceptionReturnBar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const show = pathname !== '/';
  const ref = useRef(null);
  const idx = histIdx();
  recordLocation(idx, pathname + search, 'REPLACE');       // idempotent: makes sure this position is on the trail before we read the previous one
  const prev = previousEntry(idx);
  const target = prev ? { path: prev.path, label: labelFor(prev.path), history: true } : { ...fallbackFor(pathname), history: false };
  useEffect(() => {
    if (!show) return;
    const root = document.documentElement, el = ref.current;
    root.setAttribute('data-return-bar', '');                                   // lets sticky stages (Services) sit below the bar
    const measure = () => root.style.setProperty('--bar-h', `${el.offsetHeight}px`);
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    return () => { ro.disconnect(); root.removeAttribute('data-return-bar'); root.style.removeProperty('--bar-h'); };
  }, [show]);
  if (!show) return null;
  const go = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;   // let "open in new tab" work
    event.preventDefault();
    if (target.path.split('?')[0] === '/reception') unlockSpeech();
    if (target.history) navigate(-1); else navigate(target.path);
  };
  return (
    <div className="return-bar" ref={ref} role="navigation" aria-label={`Return to ${target.label}`}>
      <div className="wrap return-bar__in">
        <a href={target.path} className="return-link" onClick={go} aria-label={`Return to ${target.label}`}><span className="return-link__arrow" aria-hidden="true">←</span><span className="return-link__line" aria-hidden="true" /><span className="return-link__label">Return to {target.label}</span></a>
        {target.history && target.path === '/reception' && <span className="return-bar__hint">You opened this page from the 3D reception.</span>}
      </div>
    </div>
  );
}
