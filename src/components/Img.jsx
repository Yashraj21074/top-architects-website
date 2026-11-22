import { IMAGES, imgSrc, imgSrcSet } from '../content/images.js';
/** Responsive generated-concept image. `ratio` fixes the box (no layout shift); focal point comes from the registry.
 *  Portfolio images carry their native size: attributes match the file (no layout shift) and images whose shape is far from
 *  16:9 are letter-boxed (data-fit="contain") instead of being cropped. `full` serves the largest (native) derivative. */
export default function Img({ id, sizes = '100vw', priority = false, tag = true, className = '', alt, style, full = false, fit: fitOverride }) {
  const m = IMAGES[id];
  if (!m) return null;
  const ratio = m.w && m.h ? m.w / m.h : null;
  const fit = fitOverride === 'cover' ? undefined : (ratio && (ratio < 1.7 || ratio > 1.9) ? 'contain' : undefined);
  return (
    <div className={`img ${className}`} style={style} data-fit={fit}>
      <img src={imgSrc(id, full ? 1e5 : 1400)} srcSet={full ? undefined : imgSrcSet(id)} sizes={sizes} width={m.w || 2400} height={m.h || 1500} alt={alt ?? m.alt}
        loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : 'auto'} decoding="async" style={{ objectPosition: m.pos }} />
      {tag && <span className="img__tag">Illustrative render</span>}
    </div>
  );
}
