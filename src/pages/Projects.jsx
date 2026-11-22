import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectMarquee from '../components/ProjectMarquee.jsx';
import { Reveal, Words } from '../components/motion.jsx';
import { ACTIVE_CATEGORIES, PROJECTS } from '../content/projects.js';
import { useTitle } from '../hooks/useTitle.js';

// Short, factual descriptions shown under the heading for the selected category.
const INFO = {
  All: 'Explore our complete portfolio across architecture, interiors and thoughtfully designed environments.',
  Residential: 'A collection of residential spaces shaped around lifestyle, comfort and contemporary architectural expression.',
  Institutional: 'Architecture for learning, working and community environments, with an emphasis on function and thoughtful design.',
  'Public & Landscape': 'Designed environments that connect people, landscape and public life.',
  Commercial: 'Contemporary commercial architecture balancing identity, functionality and spatial experience.',
  Hospitality: 'Welcoming environments designed around experience, atmosphere and thoughtful detailing.',
  Interiors: 'Interior spaces shaped through materiality, light, proportion and carefully considered details.',
};
const sig = (list) => list.map((p) => p.slug).join('|');
const OUT_MS = 380, IN_MS = 1200;

/** Keeps the carousel on screen while the next category is prepared: the current projects ease out, then ONLY the new category's projects
 *  are mounted and enter with a staggered horizontal fade. The stage keeps its size, so nothing jumps. */
function CarouselStage({ projects }) {
  const [shown, setShown] = useState(projects);
  const [target, setTarget] = useState(projects);
  const [phase, setPhase] = useState('idle');          // idle | out | in
  const [seen, setSeen] = useState(sig(projects));
  if (sig(projects) !== seen) {                         // props changed: start leaving (state adjusted during render, no effect needed)
    setSeen(sig(projects)); setTarget(projects); setPhase('out');
  }
  useEffect(() => {
    if (phase === 'out') {
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = window.setTimeout(() => { setShown(target); setPhase('in'); }, instant ? 0 : OUT_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'in') { const t = window.setTimeout(() => setPhase('idle'), IN_MS); return () => window.clearTimeout(t); }
    return undefined;
  }, [phase, target]);
  return (
    <div className="pm-stage" data-phase={phase}>
      <ProjectMarquee key={sig(shown)} projects={shown} coverOnly />
    </div>
  );
}

export default function Projects() {
  useTitle('Projects', 'TOP Architects + Partners design explorations, illustrated with generated architectural renders.');
  const [sp, setSp] = useSearchParams();
  const asked = sp.get('category');
  const cat = ACTIVE_CATEGORIES.includes(asked) ? asked : 'All';
  const pub = useMemo(() => PROJECTS.filter((p) => p.published), []);
  const list = useMemo(() => (cat === 'All' ? [...pub].sort((a, b) => ACTIVE_CATEGORIES.indexOf(a.category) - ACTIVE_CATEGORIES.indexOf(b.category)) : pub.filter((p) => p.category === cat)), [pub, cat]);
  const counts = useMemo(() => Object.fromEntries(['All', ...ACTIVE_CATEGORIES].map((c) => [c, c === 'All' ? pub.length : pub.filter((p) => p.category === c).length])), [pub]);
  const filtersRef = useRef(null);

  // Category is a FILTER of this one page: replace the history entry instead of adding one, so Back never "cycles" through categories
  // and always returns to the page the visitor actually came from.
  const select = (c) => { if (c !== cat) setSp(c === 'All' ? {} : { category: c }, { replace: true }); };

  // Keep the selected chip in view inside the (touch-scrollable) selector.
  useEffect(() => {
    const row = filtersRef.current, el = row?.querySelector('[aria-pressed="true"]');
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [cat]);

  return (
    <>
      <section className="intro intro--projects">
        <div className="wrap intro__grid">
          <div>
            <span className="eyebrow">TOP Architects + Partners · Portfolio</span>
            <Words as="h1" className="intro__big" text="Design explorations." />
          </div>
          <Reveal delay={150}>
            <p className="lead intro__sub">A portfolio of TOP Architects + Partners design explorations across homes, workplaces, civic spaces, hospitality, landscape and interiors. The imagery is illustrative—not photography of completed or commissioned projects.</p>
          </Reveal>
        </div>
      </section>
      <section className="projects-archive" aria-label="Browse TOP design explorations">
        <div className="wrap">
          <div className="filters" role="group" aria-label="Filter design explorations by category" ref={filtersRef}>
            {['All', ...ACTIVE_CATEGORIES].map((category) => (
              <button key={category} type="button" className="chip" aria-pressed={cat === category} onClick={() => select(category)}>
                {category} <span className="chip__n" aria-hidden="true">{counts[category]}</span>
              </button>
            ))}
          </div>
          <div className="pf-info" role="status" aria-live="polite">
            <div className="pf-info__in" key={cat}>
              <h2 className="pf-info__count">{list.length} Design Explorations{cat !== 'All' ? <span> · {cat}</span> : null}</h2>
              <p className="pf-info__desc">{INFO[cat]}</p>
            </div>
          </div>
        </div>
        <CarouselStage projects={list} />
      </section>
    </>
  );
}
