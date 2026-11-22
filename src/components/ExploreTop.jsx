import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SITE_INDEX, TYPE_LABEL, categoryRoute } from '../lib/siteIndex.js';
import { searchSite } from '../lib/siteSearch.js';
import { ACTIVE_CATEGORIES } from '../content/projects.js';
import { STUDIO } from '../content/studio.js';
import { unlockSpeech } from '../lib/speech.js';

export const DESKTOP_MQ = '(min-width: 1241px)';
const byType = (t) => SITE_INDEX.filter((e) => e.type === t);

/** Where the visitor is, from the real route hierarchy: Home / Projects / Residential / Project name. Levels that do not exist are not invented. */
export function locationTrail(pathname, search = '') {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const trail = [{ label: 'Home', route: '/' }];
  if (clean === '/') return trail;
  const page = SITE_INDEX.find((e) => e.type === 'page' && e.route === clean);
  if (page) { trail.push({ label: page.title, route: page.route }); const c = new URLSearchParams(search).get('category'); if (clean === '/projects' && ACTIVE_CATEGORIES.includes(c)) trail.push({ label: c, route: categoryRoute(c) }); return trail; }
  const m = clean.match(/^\/(projects|services|journal)\/([^/]+)$/);
  if (m) {
    const hub = SITE_INDEX.find((e) => e.type === 'page' && e.route === `/${m[1]}`); trail.push({ label: hub.title, route: hub.route });
    const hit = SITE_INDEX.find((e) => e.route === clean);
    if (hit?.type === 'project') trail.push({ label: hit.category, route: categoryRoute(hit.category) });
    if (hit) trail.push({ label: hit.title, route: hit.route });
  }
  return trail;
}

function Item({ e, pathname, search, onClose, n, showType }) {
  const here = e.route.includes('?') ? pathname + search === e.route : pathname === e.route;
  return (
    <li>
      <Link to={e.route} className="xt-link" aria-current={here ? 'page' : undefined} onClick={() => { if (e.route === '/reception') unlockSpeech(); onClose(); }}>
        {n != null && <span className="xt-n" aria-hidden="true">{String(n).padStart(2, '0')}</span>}
        <span className="xt-t">{e.title}</span>
        {showType ? <span className="xt-type">{TYPE_LABEL[e.type]}</span> : e.sub ? <span className="xt-sub">{e.sub}</span> : null}
        <span className="xt-arrow" aria-hidden="true">→</span>
      </Link>
    </li>
  );
}

/** EXPLORE TOP: the full-screen navigation for tablet and mobile (desktop shows direct links in the header). Rendered in a portal on <body>
 *  because the header's backdrop-filter would otherwise turn it into a header-sized containing block. */
export default function ExploreTop({ onClose, pathname, search }) {
  const ref = useRef(null), closeRef = useRef(null), inputRef = useRef(null);
  const [q, setQ] = useState('');
  const results = useMemo(() => searchSite(q, 12), [q]);
  const trail = useMemo(() => locationTrail(pathname, search), [pathname, search]);
  const searching = q.trim().length > 0;

  useEffect(() => {
    const root = document.documentElement, body = document.body, prev = [root.style.overflow, body.style.overflow];
    root.style.overflow = 'hidden'; body.style.overflow = 'hidden';                    // no background scrolling while open
    (matchMedia('(pointer: fine)').matches ? inputRef : closeRef).current?.focus();      // touch devices: don't pop the on-screen keyboard
    const focusables = () => [...ref.current.querySelectorAll('a[href], button:not([disabled]), input')].filter((n) => n.offsetParent !== null);
    const onKey = (e) => {
      if (e.key === 'Escape') { if (inputRef.current?.value && document.activeElement === inputRef.current) { setQ(''); return; } onClose(); return; }
      const f = focusables(); if (!f.length) return;
      if (e.key === 'Tab') {                                                          // keep focus inside the dialog
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      }
      // Arrow keys (keyboard and TV-remote d-pad): move between destinations in reading order without scrolling the page behind.
      const typing = document.activeElement === inputRef.current;
      if (typing && e.key === 'ArrowDown') { e.preventDefault(); ref.current.querySelector('.xt-results a, .xt-cols a')?.focus(); return; }       // from the search box straight to the first result / destination
      if (e.key === 'ArrowUp' && document.activeElement === ref.current.querySelector('.xt-results a, .xt-cols a')) { e.preventDefault(); inputRef.current?.focus(); return; }   // back up to the search box
      const step = e.key === 'ArrowDown' || (!typing && e.key === 'ArrowRight') ? 1 : e.key === 'ArrowUp' || (!typing && e.key === 'ArrowLeft') ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const i = f.indexOf(document.activeElement); f[Math.min(f.length - 1, Math.max(0, (i < 0 ? 0 : i + step)))].focus();
    };
    const mq = matchMedia(DESKTOP_MQ), onMq = () => mq.matches && onClose();
    document.addEventListener('keydown', onKey); mq.addEventListener('change', onMq);
    return () => { document.removeEventListener('keydown', onKey); mq.removeEventListener('change', onMq); root.style.overflow = prev[0]; body.style.overflow = prev[1]; };
  }, [onClose]);

  const pages = byType('page');
  const common = { pathname, search, onClose };
  return createPortal(
    <div className="xt" id="explore-top" role="dialog" aria-modal="true" aria-label="Explore TOP" ref={ref}>
      <div className="xt-bar">
        <Link to="/" className="brand" onClick={onClose} aria-label={`${STUDIO.name} — home`}>
          <img className="logo-day" src="/logo/top-logo-trim-sm.png" alt="" width="529" height="294" />
          <img className="logo-night" src="/logo/top-logo-trim-sm-night.png" alt="" aria-hidden="true" width="529" height="294" />
        </Link>
        <span className="xt-title" aria-hidden="true"><i />Explore TOP</span>
        <button type="button" className="xt-close" ref={closeRef} onClick={onClose}>Close <span aria-hidden="true">×</span></button>
      </div>
      <div className="xt-body">
        <div className="xt-top">
          <form className="xt-search" role="search" onSubmit={(e) => { e.preventDefault(); const first = ref.current.querySelector('.xt-results a'); first?.click(); }}>
            <label htmlFor="xt-q" className="xt-label">Search projects, services, categories and journal</label>
            <div className="xt-field">
              <input id="xt-q" ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — e.g. house, interiors, hotel" autoComplete="off" autoCorrect="off" spellCheck="false" enterKeyHint="search" />
              {searching && <button type="button" className="xt-clear" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear search">Clear</button>}
            </div>
          </form>
          <nav className="xt-trail" aria-label="You are here">
            <span className="xt-trail__k">You are here</span>
            <ol>{trail.map((t, i) => <li key={t.route + i}>{i === trail.length - 1 ? <span aria-current="location">{t.label}</span> : <Link to={t.route} onClick={onClose}>{t.label}</Link>}</li>)}</ol>
          </nav>
        </div>

        {searching ? (
          <section className="xt-results" aria-label="Search results">
            <p className="xt-status" role="status" aria-live="polite">{results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}</p>
            {results.length ? <ul className="xt-list">{results.map((e) => <Item key={e.type + e.id} e={e} showType {...common} />)}</ul>
              : <div className="xt-empty"><p>Nothing matches “{q.trim()}”.</p><p className="xt-empty__s">Try a place type such as house, office or hotel, or a service such as interior design.</p><button type="button" className="btn btn--sm" onClick={() => { setQ(''); inputRef.current?.focus(); }}>Clear search</button></div>}
          </section>
        ) : (
          <section aria-labelledby="xt-h-pages" className="xt-main">
            <h2 id="xt-h-pages" className="xt-h">Explore</h2>
            <ul className="xt-list">{pages.map((e, i) => <Item key={e.id} e={e} n={i + 1} {...common} />)}</ul>
            <p className="xt-hint">Projects, services and journal stories are on their pages, or search above to open one directly.</p>
          </section>
        )}
      </div>
      <div className="xt-foot"><Link to="/reception" className="btn btn--sm btn--solid" onClick={() => { unlockSpeech(); onClose(); }}>Enter 3D Reception</Link></div>
    </div>, document.body);
}
