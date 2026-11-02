import { Link, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NotFound from './NotFound.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { SERVICES, getService } from '../content/services.js';
import { getProject } from '../content/projects.js';
import { useTitle } from '../hooks/useTitle.js';

export default function ServiceDetail() {
  const { slug } = useParams(); const s = getService(slug);
  useTitle(s?.title, s?.lead);
  if (!s) return <NotFound />;
  const i = SERVICES.indexOf(s), next = SERVICES[(i + 1) % SERVICES.length];
  return (
    <>
      <section className="intro"><div className="wrap">
        <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">Home</Link> / <Link to="/services">Services</Link> / <span aria-current="page">{s.title}</span></nav>
        <div className="intro__grid" style={{ marginTop: '2rem' }}><div><span className="eyebrow">0{i + 1} — {s.tag}</span><h1 style={{ fontSize: 'clamp(2.4rem,6vw,5.4rem)' }}>{s.title}</h1></div><p className="lead" style={{ margin: 0 }}>{s.lead}</p></div>
      </div></section>
      <section className="section--tight"><div className="wrap"><Reveal variant="mask"><Parallax speed={40}><Img id={s.image} priority className="pd-hero" sizes="100vw" /></Parallax></Reveal></div></section>
      <section className="section"><div className="wrap">
        <div className="head"><div><span className="eyebrow">Related</span><Words text="Conceptual studies" /></div><Link to="/projects" className="link">All projects</Link></div>
        <div className="jgrid">{s.projects.map(getProject).filter(Boolean).map((p) => <ProjectCard key={p.slug} p={p} sizes="(max-width: 600px) 100vw, 33vw" />)}</div>
      </div></section>
      <section className="section section--stone"><div className="wrap pager"><Link to="/services" className="link">All services</Link><Link to="/services" className="link">Next: {next.title} →</Link><Link to="/contact" className="link">Start a conversation</Link></div></section>
    </>
  );
}
