import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { PROCESS, PROCESS_INTRO } from '../content/process.js';
import { useTitle } from '../hooks/useTitle.js';

const dir = '/img/process/';
/** The supplied artwork. Stages 1–5: WebP variants + the original PNG. Stage 6 (`original`): the client's JPEG exactly as supplied. */
function Picture({ im, eager = false, sizes }) {
  const img = <img src={`${dir}${im.file}.${im.ext}`} width={im.w} height={im.h} alt={im.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchpriority={eager ? 'high' : undefined} />;
  if (im.original) return img;
  return (
    <picture>
      <source type="image/webp" srcSet={`${dir}${im.file}-800.webp 800w, ${dir}${im.file}-1400.webp 1400w, ${dir}${im.file}-full.webp ${im.w}w`} sizes={sizes} />
      {img}
    </picture>
  );
}

const Details = ({ s }) => (
  <details className="pst__more">
    <summary><span className="pst__plus" aria-hidden="true" /><span className="pst__show">Stage details</span><span className="pst__hide">Hide details</span></summary>
    <ul>{s.details.map((d) => <li key={d}>{d}</li>)}</ul>
  </details>
);

export default function Process() {
  useTitle('Our Process', 'From first conversation to completion: the six stages of an architectural project at TOP Architects + Partners.');
  const steps = PROCESS.filter((s) => s.offered), [active, setActive] = useState(0), els = useRef([]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)); }), { rootMargin: '-42% 0px -42% 0px' });
    els.current.forEach((el) => el && io.observe(el)); return () => io.disconnect();
  }, []);
  const cur = steps[active] || steps[0], last = steps.length - 1;
  return (
    <>
      {/* opening */}
      <header className="pintro">
        <div className="wrap">
          <Reveal><span className="eyebrow">Our Process</span></Reveal>
          <Words as="h1" className="pintro__h" text="From First Conversation to Completion" />
          <Reveal delay={200}><p className="pintro__p">{PROCESS_INTRO}</p></Reveal>
          <Reveal variant="rule" className="pintro__rule" />
        </div>
      </header>

      {/* progress through the six stages: a thin gold strip that stays under the header while the stages scroll past */}
      <nav className="pprog" aria-label="The six stages">
        <div className="wrap pprog__in">
          <p className="pprog__now" aria-hidden="true"><b>{cur.n}</b><span> / {String(steps.length).padStart(2, '0')}</span> {cur.title}</p>
          <ol className="pprog__list">
            {steps.map((s, i) => (
              <li key={s.key} data-state={i < active ? 'done' : i === active ? 'now' : 'next'}>
                <a href={`#stage-${i + 1}`} aria-current={i === active ? 'step' : undefined}><span className="pprog__n">{s.n}</span><span className="pprog__t">{s.title}</span><i aria-hidden="true" /></a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* stages 01–05 */}
      {steps.slice(0, last).map((s, i) => (
        <section key={s.key} id={`stage-${i + 1}`} className="pst" data-i={i} data-on={i === active} data-flip={i % 2} ref={(el) => { els.current[i] = el; }} aria-labelledby={`st-${s.key}`}>
          <div className="wrap pst__grid">
            <figure className="pst__media">
              <Reveal variant={i % 2 ? 'maskxr' : 'maskx'} className="pst__fig"><Picture im={s.image} eager={i === 0} sizes="(max-width: 900px) 100vw, 58vw" /></Reveal>
              <figcaption>{s.image.note}</figcaption>
            </figure>
            <div className="pst__txt">
              <Parallax speed={-26}><span className="pst__num" aria-hidden="true">{s.n}</span></Parallax>
              <Reveal delay={80}><p className="pst__sub">{s.subtitle}</p></Reveal>
              <Words as="h2" className="pst__t" id={`st-${s.key}`} text={s.title} delay={120} />
              <Reveal delay={260}><p className="pst__d">{s.text}</p></Reveal>
              <Reveal delay={340}><Details s={s} /></Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* stage 06: the finale */}
      {(() => { const s = steps[last]; return (
        <section id={`stage-${last + 1}`} className="pfin" data-i={last} data-on={last === active} ref={(el) => { els.current[last] = el; }} aria-labelledby={`st-${s.key}`}>
          <div className="wrap pfin__grid">
            <figure className="pfin__media">
              <Reveal variant="iris" className="pfin__fig"><Picture im={s.image} sizes="(max-width: 900px) 92vw, 44vw" /></Reveal>
              <figcaption>{s.image.note}</figcaption>
            </figure>
            <div className="pfin__txt">
              <Reveal variant="rule" className="pfin__rule" />
              <span className="pst__num pfin__num" aria-hidden="true">{s.n}</span>
              <Reveal delay={100}><p className="pst__sub">{s.subtitle}</p></Reveal>
              <Words as="h2" className="pst__t" id={`st-${s.key}`} text={s.title} delay={160} />
              <Reveal delay={320}><p className="pst__d">{s.text}</p></Reveal>
              <Reveal delay={400}><Details s={s} /></Reveal>
            </div>
          </div>
        </section>
      ); })()}

      {/* closing */}
      <section className="pcta" aria-labelledby="pcta-t">
        <div className="wrap">
          <Words as="h2" className="pcta__h" id="pcta-t" text="Have a Project in Mind?" />
          <Reveal delay={150}><p className="pcta__p">Every meaningful project begins with a conversation. Tell us what you are imagining, and let us explore the possibilities together.</p></Reveal>
          <Reveal delay={250}><Link to="/contact" className="btn btn--solid" data-cursor="link">Start a Conversation<span className="arrow" aria-hidden="true">→</span></Link></Reveal>
        </div>
      </section>
    </>
  );
}
