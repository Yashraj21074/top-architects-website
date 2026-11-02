import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import NotFound from './NotFound.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { Arrow, Blocks, Meta, ReadingProgress, journalSession } from '../components/journal.jsx';
import { getArticle, related } from '../content/journal.js';
import { getProject } from '../content/projects.js';
import { useTitle } from '../hooks/useTitle.js';

export default function Article() {
  const { slug } = useParams(); const a = getArticle(slug);
  useTitle(a?.title, a?.excerpt);
  const body = useRef(null);
  if (!a) return <NotFound />;
  const pr = a.project && getProject(a.project), more = related(a, 3);
  const back = journalSession.read(journalSession.KEY_BACK);
  const backTo = back?.category && back.category !== 'All' ? `/journal?category=${encodeURIComponent(back.category)}` : '/journal';
  const returnToJournal = () => back && journalSession.write(journalSession.KEY_BACK, { ...back, restore: true });
  return (
    <>
      <ReadingProgress targetRef={body} slug={a.slug} />
      <header className="ahead">
        <div className="wrap">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">Home</Link> / <Link to={backTo} onClick={returnToJournal}>Journal</Link> / <span aria-current="page">{a.title}</span></nav>
          <div className="ahead__in">
            <Reveal><span className="eyebrow">{a.category}</span></Reveal>
            <Words as="h1" className="ahead__t" text={a.title} />
            <Reveal delay={200}><p className="ahead__x">{a.excerpt}</p></Reveal>
            <Reveal delay={260}><Meta a={a} className="ahead__meta" /></Reveal>
          </div>
        </div>
      </header>
      <div className="wrap">
        <Reveal variant="mask" className="ahead__frame"><Parallax speed={30} className="ahead__plx"><Img id={a.image} priority sizes="(max-width: 860px) 100vw, 1400px" /></Parallax></Reveal>
        <p className="jhero__cap"><span>Fig. 01</span><span>{a.caption}</span></p>
      </div>
      <section className="abody" ref={body}>
        <div className="wrap"><div className="art-body"><Blocks blocks={a.body} />
          {pr && <p className="art-rel">Related study: <Link to={`/projects/${pr.slug}`} className="link">{pr.title}</Link></p>}
          <p className="art-note">{a.demo ? 'This article is illustrative placeholder writing, not a previously published piece.' : ''}</p>
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
      {!more.length && <section className="arel"><div className="wrap"><Link to={backTo} className="link" onClick={returnToJournal}>Back to the Journal</Link></div></section>}
    </>
  );
}
