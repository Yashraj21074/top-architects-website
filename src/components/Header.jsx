import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { DESTINATIONS } from '../content/destinations.js';
import { STUDIO } from '../content/studio.js';
import { unlockSpeech } from '../lib/speech.js';

const NAV = [{ id: 'home', navLabel: 'Home', label: 'Home', route: '/' }, ...DESTINATIONS.filter((d) => d.nav !== false)];
const DESKTOP = '(min-width: 1241px)';

/** Full-viewport navigation overlay. Rendered in a portal on <body>: the header uses backdrop-filter, which would otherwise become the
 *  containing block of any position:fixed descendant and squash the overlay into the 64 px header bar. */
function MobileMenu({ onClose, pathname }) {
  const ref = useRef(null), closeRef = useRef(null);
  useEffect(() => {
    const root = document.documentElement, body = document.body, prev = [root.style.overflow, body.style.overflow];
    root.style.overflow = 'hidden'; body.style.overflow = 'hidden';                    // no background scrolling while open; restored on close
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = [...ref.current.querySelectorAll('a[href], button')]; if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const mq = matchMedia(DESKTOP), onMq = () => mq.matches && onClose();
    document.addEventListener('keydown', onKey); mq.addEventListener('change', onMq);
    return () => { document.removeEventListener('keydown', onKey); mq.removeEventListener('change', onMq); root.style.overflow = prev[0]; body.style.overflow = prev[1]; };
  }, [onClose]);
  return createPortal(
    <div className="mnav" id="site-nav" role="dialog" aria-modal="true" aria-label="Site navigation" ref={ref}>
      <div className="mnav__bar">
        <Link to="/" className="brand" onClick={onClose} aria-label={`${STUDIO.name} — home`}>
          <img className="logo-day" src="/logo/top-logo-trim-sm.png" alt="" width="529" height="294" />
          <img className="logo-night" src="/logo/top-logo-trim-sm-night.png" alt="" aria-hidden="true" width="529" height="294" />
        </Link>
        <button type="button" className="mnav__close" ref={closeRef} onClick={onClose}>Close</button>
      </div>
      <ul className="mnav__list">
        {NAV.map((d, i) => (
          <li key={d.id}>
            <NavLink to={d.route} end={d.route === '/'} onClick={onClose} aria-current={(d.route === '/' ? pathname === '/' : pathname === d.route || pathname.startsWith(d.route + '/')) ? 'page' : undefined}>
              <span className="mnav__n" aria-hidden="true">0{i + 1}</span><span className="mnav__t">{d.label}</span><span className="mnav__a" aria-hidden="true">→</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mnav__foot"><Link to="/reception" className="btn btn--sm" onClick={() => { unlockSpeech(); onClose(); }}>Enter 3D Reception</Link></div>
    </div>, document.body);
}

export default function Header() {
  const { pathname } = useLocation();
  const [openAt, setOpenAt] = useState(null);
  const open = openAt === pathname;                                       // the menu belongs to the page it was opened on: any route change closes it
  const toggleRef = useRef(null), wasOpen = useRef(false);
  const close = useCallback(() => setOpenAt(null), []);
  useEffect(() => { if (wasOpen.current && !open) toggleRef.current?.focus(); wasOpen.current = open; }, [open]);
  return (
    <header className="header">
      <div className="wrap header__in">
        <Link to="/" className="brand" aria-label={`${STUDIO.name} — home`}>
          <img className="logo-day" src="/logo/top-logo-trim-sm.png" alt={STUDIO.name} width="529" height="294" />
          <img className="logo-night" src="/logo/top-logo-trim-sm-night.png" alt="" aria-hidden="true" width="529" height="294" />
        </Link>
        <button className="nav-toggle" ref={toggleRef} aria-expanded={open} aria-controls="site-nav" aria-haspopup="dialog" onClick={() => setOpenAt(pathname)}>Menu</button>
        <nav className="nav" aria-label="Primary">
          {NAV.map((d) => <NavLink key={d.id} to={d.route} end={d.route === '/'}>{d.navLabel}</NavLink>)}
          <Link to="/reception" className="btn btn--sm" onClick={unlockSpeech}>Enter 3D Reception</Link>
        </nav>
      </div>
      {open && <MobileMenu onClose={close} pathname={pathname} />}
    </header>
  );
}
