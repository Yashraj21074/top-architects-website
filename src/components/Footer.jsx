import { STUDIO, telHref } from '../content/studio.js';

export default function Footer() {
  const c = STUDIO.contact;
  const links = Object.entries(STUDIO.social).filter(([, v]) => v.url);
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__min">
          <div className="footer__brand"><img className="logo-day footer__logo" src="/logo/top-logo-trim-sm.png" alt={STUDIO.name} width="529" height="294" loading="lazy" /><img className="logo-night footer__logo" src="/logo/top-logo-trim-sm-night.png" alt="" aria-hidden="true" width="529" height="294" loading="lazy" /><span>Established {STUDIO.established}</span></div>
          <div><span className="footer__k">Email</span><a href={`mailto:${c.email}`}>{c.email}</a></div>
          <div><span className="footer__k">Phone</span>{c.phones.map((p) => <a key={p.number} href={telHref(p.number)}>{p.number}</a>)}</div>
          <div><span className="footer__k">Location</span><span>{c.locationShort}</span>{links.map(([k, v]) => <a key={k} href={v.url} target="_blank" rel="noopener noreferrer" style={{ textTransform: 'capitalize' }}>{k}</a>)}</div>
        </div>
        <div className="footer__base"><span>© {STUDIO.established} {STUDIO.name}</span><span>TOP portfolio imagery is illustrative; it does not depict completed or commissioned work.</span></div>
      </div>
    </footer>
  );
}
