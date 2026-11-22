import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import { Reveal } from './motion.jsx';
export default function ProjectCard({ p, sizes = '(max-width: 860px) 100vw, 50vw', tall = false }) {
  const place = p.location && !/unspecified/i.test(p.location) ? p.location : '';   // shown only where the project record has one (year: none recorded)
  return (
    <Link to={`/projects/${p.slug}`} className={`pcard ${tall ? 'pcard--tall' : ''}`}>
      <Reveal variant="mask"><Img id={p.cover} sizes={sizes} className="zoom" tag={false} /></Reveal>
      <div className="pcard__meta">
        <div><h3>{p.title}</h3><p className="pcard__sub">{p.category}{place ? <span className="pcard__place"> · {place}</span> : null}</p></div>
        <span className="meta-k">{p.kind === 'concept' ? 'TOP · Design exploration' : ''}</span>
      </div>
    </Link>
  );
}
