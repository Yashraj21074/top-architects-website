import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectMarquee from '../components/ProjectMarquee.jsx';
import { Reveal, Words } from '../components/motion.jsx';
import { CATEGORIES, PROJECTS } from '../content/projects.js';
import { useTitle } from '../hooks/useTitle.js';

export default function Projects() {
  useTitle('Projects', 'TOP Architects + Partners design explorations, illustrated with generated architectural renders.');
  const [sp, setSp] = useSearchParams();
  const cat = sp.get('category') || 'All';
  const pub = PROJECTS.filter((p) => p.published);
  const cats = useMemo(() => CATEGORIES.filter((c) => pub.some((p) => p.category === c)), [pub]);
  const list = cat === 'All' ? pub : pub.filter((p) => p.category === cat);
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
          <div className="filters" role="group" aria-label="Filter design explorations by category">
            {['All', ...cats].map((category) => (
              <button key={category} type="button" className="chip" aria-pressed={cat === category} onClick={() => setSp(category === 'All' ? {} : { category })}>
                {category}
              </button>
            ))}
          </div>
        </div>
        {list.length ? <ProjectMarquee key={cat} projects={list} /> : <div className="wrap"><p className="empty" role="status">No projects in this category yet.</p></div>}
      </section>
    </>
  );
}
