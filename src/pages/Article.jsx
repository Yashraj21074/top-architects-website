import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import NotFound from './NotFound.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { Arrow, Blocks, CREDIT, Meta, ReadingProgress, journalSession } from '../components/journal.jsx';
import { getArticle, related } from '../content/journal.js';
import { getProject } from '../content/projects.js';
import { getService } from '../content/services.js';
import { useTitle } from '../hooks/useTitle.js';

// Four header compositions (a.layout) give the essays their own rhythm: immersive (full-bleed image, title over it),
// split (text beside a tall image), classic (title, then a wide image) and plate (centred title, framed image).
export default function Article() {
  const { slug } = useParams(); const a = getArticle(slug);
  useTitle(a?.title, a?.excerpt);
  const body = useRef(null);
  if (!a) return <NotFound />;
  const studies = (a.projects || []).map(getProject).filter(Boolean), services = (a.services || []).map(getService).filter(Boolean), more = related(a, 3);
  const back = journalSession.read(journalSession.KEY_BACK);
  const backTo = back?.category && back.category !== 'All' ? `/journal?category=${encodeURIComponent(back.category)}` : '/journal';
  const returnToJournal = () => back && journalSession.write(journalSession.KEY_BACK, { ...back, restore: true });
  const layout = a.layout || 'classic';
  return (
    <>
      <ReadingProgress targetRef={body} slug={a.slug} />
      <header className={`ahead ahead--${layout}`}>
        <div className="ahead__media">
          <Reveal variant="mask" className="ahead__frame"><Parallax speed={30} className="ahead__plx"><Img id={a.image} priority sizes={layout === 'split' ? '(max-width: 860px) 100vw, 46vw' : '(max-width: 860px) 100vw, 1400px'} tag={false} /></Parallax></Reveal>
          {layout === 'immersive' && <div className="ahead__scrim" aria-hidden="true" />}
        </div>
        <div className="wrap ahead__text">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">Home</Link> / <Link to={backTo} onClick={returnToJournal}>Journal</Link> / <span aria-current="page">{a.title}</span></nav>
          <div className="ahead__in">
            <Reveal><span className="eyebrow">{a.category}</span></Reveal>
            <Words as="h1" className="ahead__t" text={a.title} />
            <Reveal delay={200}><p className="ahead__x">{a.excerpt}</p></Reveal>
            <Reveal delay={260}><Meta a={a} className="ahead__meta" /></Reveal>
          </div>
        </div>
      </header>
      <div className="wrap"><p className="jhero__cap"><span>Fig. 01</span><span>{a.caption}<span className="credit">{CREDIT}</span></span></p></div>
      <section className="abody" ref={body}>
        <div className="wrap"><div className="art-body"><Blocks blocks={a.body} />
          <aside className="art-end" aria-label="Related portfolio and service">
            {studies.length > 0 && <p><span className="art-end__k">Studies mentioned</span>{studies.map((p, i) => <span key={p.slug}>{i ? ' · ' : ''}<Link to={`/projects/${p.slug}`} className="link">{p.title}</Link></span>)}</p>}
            {services.length > 0 && <p><span className="art-end__k">Related service</span>{services.map((s, i) => <span key={s.slug}>{i ? ' · ' : ''}<Link to={`/services/${s.slug}`} className="link">{s.title}</Link></span>)}</p>}
            <p className="art-end__c"><Link to={a.featured ? '/projects' : '/contact'} className="link">{a.featured ? 'Explore the portfolio' : 'Talk to the studio about a project'}<Arrow /></Link></p>
          </aside>
        </div></div>
      </section>
      {more.length > 0 && (
        <section className="arel section--stone" aria-labelledby="more-t">
          <div className="wrap">
            <div className="head"><div><span className="eyebrow">Continue reading</span><h2 id="more-t">Related stories</h2></div><Link to={backTo} className="link" onClick={returnToJournal}>Back to the Journal</Link></div>
            <div className="arel__grid">{more.map((m) => (
              <Link key={m.slug} to={`/journal/${m.slug}`} className="arel__c" data-cursor="link"><Img id={m.image} tag={false} sizes="(max-width: 860px) 100vw, 33vw" /><span className="eyebrow">{m.category}</span><h3>{m.title}</h3><p>{m.excerpt}</p><span className="jread">Read<Arrow /></span></Link>
            ))}</div>
          </div>
        </section>
      )}
    </>
  );
}
