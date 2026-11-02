import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { Arrow, CategoryNav, Meta, StoryCard, journalSession, rememberJournal, useStableHeight } from '../components/journal.jsx';
import { ARTICLES, NOTES, categories, getArticle } from '../content/journal.js';
import { destById } from '../content/destinations.js';
import { useTitle } from '../hooks/useTitle.js';

const VARIANTS = ['med', 'tall', 'wide'];             // position in the collection decides the composition, so the layout stays curated after filtering
const CLOSE = ['projects', 'services', 'about'].map(destById).filter(Boolean);

export default function Journal() {
  useTitle('Journal', 'Ideas, observations and explorations from the world of architecture, interiors and the built environment.');
  const [params, setParams] = useSearchParams();
  const list = useMemo(() => ARTICLES.filter((a) => a.published), []);
  const cover = list.find((a) => a.featured) || list[0];
  const cats = useMemo(() => categories(), []);
  const asked = params.get('category');
  const category = cats.includes(asked) ? asked : 'All';
  const counts = useMemo(() => ({ All: list.length, ...Object.fromEntries(cats.map((c) => [c, list.filter((a) => a.category === c).length])) }), [list, cats]);
  const shown = list.filter((a) => a !== cover && (category === 'All' || a.category === category));
  const listRef = useRef(null);
  useStableHeight(listRef, category);
  const select = (c) => setParams(c === 'All' ? {} : { category: c }, { replace: true });

  // Back from an article: restore the same scroll position (the Layout resets to the top on every route change, so wait a beat).
  useEffect(() => {
    const b = journalSession.read(journalSession.KEY_BACK); if (!b?.restore) return;
    journalSession.write(journalSession.KEY_BACK, null);
    const id = setTimeout(() => window.scrollTo({ top: b.y, behavior: 'instant' }), 80);
    return () => clearTimeout(id);
  }, []);
  const resume = journalSession.read(journalSession.KEY_PROG); const resumeA = resume && getArticle(resume.slug);

  return (
    <>
      {/* 1 — editorial opening */}
      <header className="jhero">
        <div className="wrap">
          <div className="jhero__top">
            <div>
              <Reveal><span className="eyebrow">Thinking / Making / Observing</span></Reveal>
              <Words as="h1" className="jhero__h" text="Architecture is a conversation between space, material and life." />
            </div>
            <Reveal delay={200}><p className="jhero__lede">Ideas, observations and explorations from the world of architecture, interiors and the built environment.</p></Reveal>
          </div>
          <Reveal variant="mask" className="jhero__frame">
            <Parallax speed={36} className="jhero__plx"><Img id="villa-dusk" priority sizes="(max-width: 860px) 100vw, 1400px" /></Parallax>
          </Reveal>
          <p className="jhero__cap"><span>Fig. 00</span><span>A conceptual study of a cantilevered house at dusk</span></p>
        </div>
      </header>

      {/* 2 — cover story */}
      <section className="jlead" aria-labelledby="lead-t">
        <div className="wrap jlead__grid">
          <Reveal variant="maskx" className="jlead__fig">
            <Link to={`/journal/${cover.slug}`} tabIndex={-1} aria-hidden="true" className="jlead__imglink" onClick={() => rememberJournal(category)} data-cursor="link"><Img id={cover.image} priority sizes="(max-width: 860px) 100vw, 66vw" tag={false} /></Link>
            <p className="jlead__cap">{cover.caption}</p>
          </Reveal>
          <Reveal className="jlead__txt" delay={160}>
            <p className="jlead__idx"><span aria-hidden="true">01</span><span className="eyebrow">Cover story · {cover.category}</span></p>
            <h2 id="lead-t" className="jlead__t"><Link to={`/journal/${cover.slug}`} onClick={() => rememberJournal(category)} data-cursor="link">{cover.title}</Link></h2>
            <p className="jlead__x">{cover.excerpt}</p>
            <hr className="jrule" />
            <Meta a={cover} />
            <Link to={`/journal/${cover.slug}`} className="jread" onClick={() => rememberJournal(category)} data-cursor="link">Read the essay<Arrow /></Link>
          </Reveal>
        </div>
      </section>

      {/* 3 — categories + the collection */}
      <section className="jcol" aria-label="All stories">
        <div className="wrap">
          <CategoryNav cats={cats} counts={counts} active={category} onSelect={select} />
          {resumeA && resumeA !== undefined && (
            <p className="jresume"><span className="eyebrow">Continue reading</span><Link to={`/journal/${resumeA.slug}`} onClick={() => rememberJournal(category)}>{resumeA.title}<span aria-hidden="true"> · {Math.round(resume.p * 100)}% read</span></Link></p>
          )}
          <div className="jcol__list" ref={listRef} key={category} data-n={shown.length}>
            {shown.length ? shown.map((a, i) => <StoryCard key={a.slug} a={a} i={list.indexOf(a) - 1} variant={shown.length === 1 ? 'wide' : VARIANTS[i % 3]} category={category} />) : (
              <div className="jempty" role="status">
                <p>The cover story above is the only {category.toLowerCase()} story so far.</p>
                <button type="button" className="jread" onClick={() => select('All')}>Show all stories<Arrow /></button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4 — short observations */}
      {NOTES.length > 0 && (
        <section className="jnotes section--stone" aria-labelledby="notes-t">
          <div className="wrap">
            <div className="jnotes__head">
              <Words as="h2" className="jnotes__h" text="Notes from the built world" />
              <Reveal delay={150}><p className="jnotes__sub">Small details. Larger questions. New ways of seeing space.</p></Reveal>
            </div>
            <ol className="jnotes__grid" id="notes-t">
              {NOTES.map((n, i) => (
                <Reveal as="li" key={n.n} className="jnote" delay={(i % 3) * 90}>
                  {n.image && <div className="jnote__img"><Img id={n.image} sizes="(max-width: 700px) 100vw, 30vw" tag={false} /></div>}
                  <span className="jnote__n" aria-hidden="true">{String(n.n).padStart(2, '0')}</span>
                  <h3>{n.title}</h3><p>{n.text}</p><span className="jnote__tag">Illustrative note</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 5 — a deliberate way out */}
      <section className="jclose" aria-labelledby="close-t">
        <div className="wrap">
          <Words as="h2" className="jclose__h" text="Good architecture leaves you with questions worth exploring." />
          <Reveal delay={150}><p className="jclose__x">Continue discovering the projects, ideas and services behind our practice.</p></Reveal>
          <Reveal delay={250}><ul className="jclose__links">{CLOSE.map((d) => <li key={d.id}><Link to={d.route} data-cursor="link">{d.label}<Arrow /></Link></li>)}</ul></Reveal>
        </div>
      </section>
    </>
  );
}
