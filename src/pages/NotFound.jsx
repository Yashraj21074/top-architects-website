import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle.js';
export default function NotFound() {
  useTitle('Page not found', undefined, { noindex: true });
  return (
    <section className="section"><div className="wrap notfound">
      <span className="eyebrow">404</span>
      <h1 style={{ fontSize: 'clamp(2.4rem,6vw,4.5rem)' }}>This page can’t be found.</h1>
      <p>The address may have changed or never existed. These will get you back on track.</p>
      <p className="notfound__links"><Link to="/" className="btn btn--solid">Return home</Link> <Link to="/projects" className="btn">View projects</Link> <Link to="/services" className="btn">Our services</Link> <Link to="/contact" className="btn">Contact</Link></p>
      <p className="notfound__hint">On a phone or tablet, <strong>Explore TOP</strong> in the header lists every page, project and article.</p>
    </div></section>
  );
}
