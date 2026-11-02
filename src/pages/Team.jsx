import { Link } from 'react-router-dom';
import FounderPlate from '../components/FounderPlate.jsx';
import { Parallax, Reveal } from '../components/motion.jsx';
import { STUDIO } from '../content/studio.js';
import { useTitle } from '../hooks/useTitle.js';

export default function Team() {
  useTitle('Team', `${STUDIO.founder.name}, ${STUDIO.founder.title}.`);
  const f = STUDIO.founder;
  return (
    <section className="team-solo">
      <div className="wrap team-solo__in">
        <Reveal variant="mask" className="team-solo__fig"><Parallax speed={40}><FounderPlate /></Parallax></Reveal>
        <div className="team-solo__txt">
          <span className="eyebrow">Team</span>
          <h1 className="team-solo__name"><Reveal as="span" variant="line"><span>{f.name}</span></Reveal></h1>
          <Reveal as="p" variant="line" delay={100} className="founder__title"><span>{f.title}</span></Reveal>
          <Reveal delay={220}>
            <p className="meta-line">{f.qualification}</p>
            <p className="lead">{f.intro}</p>
            <p className="team-solo__links"><Link to="/contact" className="link">Contact</Link><Link to="/studio" className="link">About the studio</Link></p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
