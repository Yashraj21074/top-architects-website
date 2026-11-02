import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import ProjectLightbox from '../components/ProjectLightbox.jsx';
import NotFound from './NotFound.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { PROJECTS, getProject, related } from '../content/projects.js';
import { SERVICES } from '../content/services.js';
import { useTitle } from '../hooks/useTitle.js';

export default function ProjectDetail() {
  const { slug } = useParams();
  const p = getProject(slug);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useTitle(p?.title, p?.summary);
  if (!p) return <NotFound />;
  const list = PROJECTS.filter((x) => x.published), i = list.findIndex((x) => x.slug === p.slug);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const services = SERVICES.filter((x) => x.projects.includes(p.slug)), concept = p.kind === 'concept';
  const facts = [['Category', p.category], ['Type', p.typology], ['Status', concept ? 'TOP design exploration' : p.statusLabel], p.location && !/unspecified/i.test(p.location) && ['Location', p.location], p.year && ['Year', p.year]].filter(Boolean);
  return (
    <>
      <section className="pd-top">
        <div className="wrap">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">Home</Link> / <Link to="/projects">Projects</Link> / <span aria-current="page">{p.title}</span></nav>
          <span className="eyebrow" style={{ display: 'block', marginTop: '2rem' }}>{p.category}{concept ? ' · TOP Design Exploration' : ''}</span>
          <Words as="h1" className="pd-title" text={p.title} />
        </div>
        <Reveal variant="mask"><Parallax speed={60} className="pd-bleed">
          <Img id={p.cover} priority sizes="100vw" />
          <button type="button" className="project-image-open" onClick={() => setLightboxIndex(0)} aria-label={`Open image viewer for ${p.title}`}>View image <span aria-hidden="true">↗</span></button>
        </Parallax></Reveal>
      </section>
      <section className="section--tight"><div className="wrap">
        <dl className="facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {concept && <p className="caption">A TOP Architects + Partners design exploration, illustrated with generated renders—not photography of a completed or commissioned project.</p>}
      </div></section>
      <section className="section"><div className="wrap">
        <Reveal className="cols"><span className="eyebrow">Statement</span><p className="lead" style={{ margin: 0 }}>{p.concept}</p></Reveal>
        <Reveal className="cols" style={{ marginTop: 'var(--s5)' }}><span className="eyebrow">Design idea</span><ul className="ulist">{p.approach.map((a) => <li key={a}>{a}</li>)}</ul></Reveal>
        <Reveal className="cols" style={{ marginTop: 'var(--s5)' }}><span className="eyebrow">Materials</span><p style={{ margin: 0 }}>{p.materials.join(' · ')}</p></Reveal>
        <Reveal className="cols" style={{ marginTop: 'var(--s5)' }}><span className="eyebrow">Site context</span><p style={{ margin: 0 }}>{p.context}</p></Reveal>
        {services.length > 0 && <Reveal className="cols" style={{ marginTop: 'var(--s5)' }}><span className="eyebrow">Services</span><p style={{ margin: 0, display: 'flex', gap: '1.4rem', flexWrap: 'wrap' }}>{services.map((x) => <Link key={x.slug} className="link" to={`/services/${x.slug}`}>{x.title}</Link>)}</p></Reveal>}
      </div></section>
      {p.gallery.length > 1 && <section className="section--tight"><div className="wrap"><h2 className="sr">Gallery</h2><div className="gallery">{p.gallery.slice(1).map((g, k) => <Reveal key={g} variant="mask" className={`gallery__item${k === 0 ? ' gallery__wide' : ''}`}><button type="button" className="gallery__trigger" onClick={() => setLightboxIndex(k + 1)} aria-label={`Open project image ${k + 2} of ${p.gallery.length}`}><Img id={g} className="zoom" sizes="(max-width: 700px) 100vw, 50vw" /><span className="gallery__expand" aria-hidden="true">↗</span></button></Reveal>)}</div></div></section>}
      <section className="section"><div className="wrap pager">
        <Link to={`/projects/${prev.slug}`} className="link">← {prev.title}</Link><Link to="/projects" className="link">All projects</Link><Link to={`/projects/${next.slug}`} className="link">{next.title} →</Link>
      </div></section>
      <section className="section section--stone"><div className="wrap"><div className="head"><div><span className="eyebrow">From the TOP portfolio</span><Words text="Related explorations" /></div></div>
        <div className="jgrid">{related(p).map((r) => <ProjectCard key={r.slug} p={r} sizes="(max-width: 600px) 100vw, 33vw" />)}</div></div></section>
      <ProjectLightbox images={p.gallery} title={p.title} activeIndex={lightboxIndex} onChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
    </>
  );
}
