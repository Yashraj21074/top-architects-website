import { Link } from 'react-router-dom';
import FounderPlate from '../components/FounderPlate.jsx';
import Img from '../components/Img.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { STUDIO } from '../content/studio.js';
import { useTitle } from '../hooks/useTitle.js';

export default function Studio() {
  useTitle('About', `${STUDIO.name}, established ${STUDIO.established}. Founder & Principal: ${STUDIO.founder.name}.`);
  const f = STUDIO.founder;
  return (
    <>
      <section className="intro intro--statement">
        <div className="wrap">
          <span className="eyebrow">About</span>
          <h1 className="statement-h1"><Reveal as="span" variant="line"><span>TOP ARCHITECTS</span></Reveal><Reveal as="span" variant="line" delay={90}><span>+ PARTNERS</span></Reveal></h1>
          <Reveal delay={200}><p className="meta-line">Established {STUDIO.established}</p></Reveal>
        </div>
      </section>

      <section className="section founder">
        <div className="wrap split">
          <Reveal variant="mask" className="a"><Parallax speed={50}><FounderPlate /></Parallax></Reveal>
          <div className="b">
            <span className="eyebrow">Founder &amp; Principal</span>
            <Reveal as="h2" variant="line" className="founder__name"><span>{f.name}</span></Reveal>
            <Reveal as="p" variant="line" delay={120} className="founder__title"><span>{f.title}</span></Reveal>
            <Reveal delay={260}><p className="meta-line">{f.qualification}</p><p className="lead">{f.intro}</p><Link to="/team" className="link">Founder profile</Link></Reveal>
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap">
          <Reveal className="bodies">
            <span className="eyebrow">Professional bodies</span>
            <ul>{STUDIO.professionalBodies.map((b) => <li key={b}>{b}</li>)}</ul>
          </Reveal>
        </div>
      </section>

      <section className="band">
        <Parallax speed={120} className="band__img"><Img id="landscape-garden" sizes="100vw" /></Parallax>
      </section>

      <section className="section">
        <div className="wrap disciplines">
          <Words as="h2" text="Architecture, interiors, planning, visualization and consultancy." />
          <Reveal className="disciplines__links"><Link to="/services" className="link">Services</Link><Link to="/projects" className="link">Projects</Link><Link to="/contact" className="link">Contact</Link></Reveal>
        </div>
      </section>
    </>
  );
}
