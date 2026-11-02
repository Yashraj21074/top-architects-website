import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import { Reveal } from './motion.jsx';
import { readingTime } from '../content/journal.js';

const KEY_BACK = 'top.journal.back', KEY_PROG = 'top.journal.progress';
const read = (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* session storage unavailable: features degrade silently */ } };
export const journalSession = { read, write, KEY_BACK, KEY_PROG };

/** Remember where the visitor was in the Journal list so "Back to Journal" can bring them back to the same category and scroll position (this tab only). */
export const rememberJournal = (category) => write(KEY_BACK, { category, y: Math.round(window.scrollY), at: Date.now() });

export const when = (a) => (a.demo ? 'Illustrative' : new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
/** Metadata line: only the fields that exist. */
export const Meta = ({ a, className = 'meta-line' }) => { const bits = [when(a), a.readingTime || `${readingTime(a)} min read`].filter(Boolean); return <p className={className}>{bits.join(' · ')}</p>; };
export const Arrow = () => <span className="jarrow" aria-hidden="true">→</span>;

/** Category filter: thin typographic bar, horizontally scrollable on narrow screens, with a gold underline that draws in under the active item. */
export function CategoryNav({ cats, counts, active, onSelect }) {
  const ref = useRef(null);
  useEffect(() => { const b = ref.current?.querySelector('[aria-pressed="true"]'); b?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [active]);
  return (
    <nav className="jcats" aria-label="Filter stories by category">
      <div className="jcats__row" ref={ref}>
        {['All', ...cats].map((c) => (
          <button key={c} type="button" className="jcats__b" aria-pressed={active === c} onClick={() => onSelect(c)}>
            <span>{c === 'All' ? 'All Stories' : c}</span><sup aria-hidden="true">{c === 'All' ? counts.All : counts[c]}</sup>
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Story card: the image and headline are the links; the card itself is not a button. `variant` sets the editorial layout. */
export function StoryCard({ a, i, variant, category }) {
  const to = `/journal/${a.slug}`, go = () => rememberJournal(category);
  const side = variant === 'wide' ? 'maskx' : i % 2 ? 'maskxr' : 'maskx';
  return (
    <article className={`jst jst--${variant}`}>
      <Reveal variant={side} className="jst__fig">
        <Link to={to} tabIndex={-1} aria-hidden="true" className="jst__imglink" onClick={go} data-cursor="link"><Img id={a.image} sizes={variant === 'wide' ? '(max-width: 860px) 100vw, 58vw' : '(max-width: 860px) 100vw, 50vw'} tag={false} /></Link>
      </Reveal>
      <Reveal className="jst__txt" delay={120}>
        <p className="jst__top"><span className="jst__n" aria-hidden="true">{String(i + 2).padStart(2, '0')}</span><span className="eyebrow">{a.category}</span></p>
        <h3 className="jst__t"><Link to={to} onClick={go} data-cursor="link">{a.title}</Link></h3>
        <p className="jst__x">{a.excerpt}</p>
        <Meta a={a} />
        <Link to={to} className="jread" onClick={go} data-cursor="link" aria-label={`Read ${a.title}`}>Read<Arrow /></Link>
      </Reveal>
    </article>
  );
}

/** Keep the list's height while the filtered stories swap, so the page below does not jump. */
export function useStableHeight(ref, dep) {
  const last = useRef(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.minHeight = last.current ? `${last.current}px` : '';
    const id = requestAnimationFrame(() => { last.current = el.scrollHeight; el.style.minHeight = ''; });
    return () => cancelAnimationFrame(id);
  }, [dep, ref]);
}

/** Thin gold progress line for the article body (not the whole page). Reads the real scroll position; no re-renders; throttled with rAF; remembers progress for "Continue reading". */
export function ReadingProgress({ targetRef, slug }) {
  const bar = useRef(null);
  useEffect(() => {
    const el = targetRef.current; if (!el) return;
    let raf = 0, saved = -1, lastSave = 0;
    const calc = () => {
      raf = 0; const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / Math.max(1, r.height)));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      const now = performance.now();
      if (Math.abs(p - saved) > 0.02 && now - lastSave > 400) {
        saved = p; lastSave = now;
        const prev = read(KEY_PROG), furthest = Math.max(p, prev?.slug === slug ? prev.p : 0);       // scrolling back up never loses the furthest point read
        if (furthest >= 0.96) { if (prev?.slug === slug) write(KEY_PROG, null); }                     // finished: nothing to continue
        else if (furthest > 0.04) write(KEY_PROG, { slug, p: Math.round(furthest * 100) / 100 });
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [targetRef, slug]);
  return <div className="read-progress" aria-hidden="true"><i ref={bar} /></div>;
}

/** Article body blocks: one template renders every story. */
export function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.t === 'h2') return <h2 key={i} className="art-h">{b.x}</h2>;
    if (b.t === 'quote') return <Reveal key={i} as="blockquote" className="art-quote"><p>{b.x}</p></Reveal>;
    if (b.t === 'list') return <ul key={i} className="art-list">{b.items.map((x) => <li key={x}>{x}</li>)}</ul>;
    if (b.t === 'figure') return <figure key={i} className="art-fig"><Reveal variant="mask"><Img id={b.image} sizes="(max-width: 860px) 100vw, 1100px" tag={false} /></Reveal><figcaption>{b.caption}</figcaption></figure>;
    if (b.t === 'pair') return <div key={i} className="art-pair">{b.items.map((m, j) => <figure key={j}><Reveal variant={j ? 'maskxr' : 'maskx'}><Img id={m.image} sizes="(max-width: 860px) 100vw, 540px" tag={false} /></Reveal><figcaption>{m.caption}</figcaption></figure>)}</div>;
    return <p key={i}>{b.x}</p>;
  });
}
