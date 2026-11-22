import { Link } from 'react-router-dom';
export default function PageIntro({ eyebrow, title, lead, crumbs }) {
  return (
    <section className="intro">
      <div className="wrap">
        {crumbs && <nav aria-label="Breadcrumb" className="crumbs">{crumbs.map((c, i) => c.to ? <span key={i}><Link to={c.to}>{c.label}</Link> /</span> : <span key={i} aria-current="page">{c.label}</span>)}</nav>}
        <div className="intro__grid" style={{ marginTop: crumbs ? '2rem' : 0 }}>
          <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
          {lead && <p className="lead" style={{ margin: 0 }}>{lead}</p>}
        </div>
      </div>
    </section>
  );
}
