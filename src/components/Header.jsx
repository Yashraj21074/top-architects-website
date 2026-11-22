import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import ExploreTop from './ExploreTop.jsx';
import { DESTINATIONS } from '../content/destinations.js';
import { ACTIVE_CATEGORIES } from '../content/projects.js';
import { SERVICES, serviceAnchor, serviceHref } from '../content/services.js';
import { ARTICLES } from '../content/journal.js';
import { categoryRoute } from '../lib/siteIndex.js';
import { STUDIO } from '../content/studio.js';
import { unlockSpeech } from '../lib/speech.js';

const LABEL = { about: 'About / Studio', process: 'Our Process' };                 // header wording; every other item uses its navLabel
const CATEGORY_ORDER = ['Residential', 'Commercial', 'Institutional', 'Public & Landscape', 'Interiors', 'Hospitality'];   // order shown in the dropdown (filtered by what the data really has)
const NAV = [{ id: 'home', navLabel: 'Home', route: '/' }, ...DESTINATIONS.filter((d) => d.nav !== false)];

/** Shortcuts shown on hover. Each goes straight to its destination (never to a page where the same item must be chosen again). */
const SHORTCUTS = {
  projects: () => CATEGORY_ORDER.filter((c) => ACTIVE_CATEGORIES.includes(c)).map((c) => ({ key: c, label: c, to: categoryRoute(c), current: (l) => l.pathname === '/projects' && new URLSearchParams(l.search).get('category') === c })),
  services: () => SERVICES.map((s) => ({ key: s.slug, label: s.title, to: serviceHref(s), current: (l) => l.pathname === '/services' && l.hash === `#${serviceAnchor(s)}` })),
  journal: () => ARTICLES.filter((a) => a.published).map((a) => ({ key: a.slug, label: a.title, to: `/journal/${a.slug}`, current: (l) => l.pathname === `/journal/${a.slug}` })),
};

/** A parent link that is always directly clickable, plus a compact panel of shortcuts: opens on hover (with a short grace period so the pointer can
 *  cross to the panel without it flickering shut), on the small chevron button (keyboard + touch) and on ArrowDown; Esc closes and returns focus. */
function NavDropdown({ d, items, loc }) {
  const where = loc.pathname + loc.search + loc.hash, [openAt, setOpenAt] = useState(null), open = openAt === where;   // open only for the page it was opened on, so any navigation closes it
  const setOpen = (v) => setOpenAt(v ? where : null);
  const timer = useRef(0), root = useRef(null), btn = useRef(null), panel = useRef(null), id = `dd-${d.id}`;
  const show = () => { window.clearTimeout(timer.current); setOpen(true); };
  const hideSoon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 160); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const links = () => [...panel.current.querySelectorAll('a')];
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); btn.current?.focus(); return; }
    if (e.key === 'ArrowDown' && (e.target === btn.current || e.target.closest('.nav-dd__parent'))) { e.preventDefault(); show(); requestAnimationFrame(() => links()[0]?.focus()); return; }
    if (panel.current?.contains(e.target)) {
      const l = links(), i = l.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? btn.current : l[i - 1]).focus(); }
      else if (e.key === 'Home') { e.preventDefault(); l[0].focus(); } else if (e.key === 'End') { e.preventDefault(); l[l.length - 1].focus(); }
    }
  };
  return (
    <div className="nav-dd" data-journal={d.id === 'journal'} data-open={open} ref={root} onMouseEnter={show} onMouseLeave={hideSoon} onKeyDown={onKeyDown}
      onBlur={(e) => { if (!root.current.contains(e.relatedTarget)) setOpen(false); }}>
      <span className="nav-dd__parent">
        <NavLink to={d.route}>{LABEL[d.id] || d.navLabel}</NavLink>
        <button type="button" className="nav-dd__btn" ref={btn} aria-expanded={open} aria-controls={id} aria-label={`${LABEL[d.id] || d.navLabel}: shortcuts`} onClick={() => (open ? setOpen(false) : show())}><span aria-hidden="true" /></button>
      </span>
      <ul className="nav-dd__panel" id={id} ref={panel} aria-label={`${LABEL[d.id] || d.navLabel} shortcuts`}>
        {items.map((it) => <li key={it.key}><Link to={it.to} aria-current={it.current(loc) ? 'page' : undefined} onClick={() => setOpen(false)}>{it.label}</Link></li>)}
      </ul>
    </div>
  );
}

/** Desktop (≥1241px): logo, direct links with hover shortcuts, Enter 3D Reception. Tablet / mobile: logo + the EXPLORE TOP control. */
export default function Header() {
  const loc = useLocation(), { pathname, search } = loc;
  const [openAt, setOpenAt] = useState(null);
  const where = pathname + search;
  const open = openAt === where;                                          // EXPLORE TOP belongs to the page it was opened on: any route change closes it
  const toggleRef = useRef(null), wasOpen = useRef(false);
  const close = useCallback(() => setOpenAt(null), []);
  useEffect(() => { if (wasOpen.current && !open) toggleRef.current?.focus(); wasOpen.current = open; }, [open]);   // focus returns to the trigger
  return (
    <header className="header">
      <div className="wrap header__in">
        <Link to="/" className="brand" aria-label={`${STUDIO.name} — home`}>
          <img className="logo-day" src="/logo/top-logo-trim-sm.png" alt={STUDIO.name} width="529" height="294" />
          <img className="logo-night" src="/logo/top-logo-trim-sm-night.png" alt="" aria-hidden="true" width="529" height="294" />
        </Link>
        <button type="button" className="xt-trigger" ref={toggleRef} aria-expanded={open} aria-controls="explore-top" aria-haspopup="dialog" onClick={() => setOpenAt(where)}>
          <span className="xt-trigger__lines" aria-hidden="true"><i /><i /><i /></span>Explore TOP
        </button>
        <nav className="nav" aria-label="Primary">
          {NAV.map((d) => (SHORTCUTS[d.id] ? <NavDropdown key={d.id} d={d} items={SHORTCUTS[d.id]()} loc={loc} /> : <NavLink key={d.id} to={d.route} end={d.route === '/'}>{LABEL[d.id] || d.navLabel}</NavLink>))}
          <Link to="/reception" className="btn btn--sm" onClick={unlockSpeech}>Enter 3D Reception</Link>
        </nav>
      </div>
      {open && <ExploreTop onClose={close} pathname={pathname} search={search} />}
    </header>
  );
}
