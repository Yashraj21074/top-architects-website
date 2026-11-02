import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle.js';
export default function NotFound() {
  useTitle('Page not found');
  return <section className="section"><div className="wrap notfound"><span className="eyebrow">404</span><h1 style={{ fontSize: 'clamp(2.4rem,6vw,4.5rem)' }}>This page can’t be found.</h1><Link to="/" className="btn btn--solid">Return home</Link></div></section>;
}
