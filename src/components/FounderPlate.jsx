import { STUDIO } from '../content/studio.js';
/** Large editorial portrait. Uses the supplied portrait when present; otherwise a considered monogram plate (no placeholder wording). */
export default function FounderPlate({ className = '' }) {
  const f = STUDIO.founder, initials = (() => { const w = f.name.replace(/^Ar\.\s*/, '').split(/\s+/); return (w[0][0] + w[w.length - 1][0]).toUpperCase(); })();
  return (
    <figure className={`plate ${className}`}>
      {f.portrait ? <img src={f.portrait} alt={`${f.name}, ${f.title}`} loading="lazy" decoding="async" /> : (
        <div className="plate__mono" role="img" aria-label={`${f.name}, ${f.title}`}><span>{initials}</span><i /></div>
      )}
    </figure>
  );
}
