import { IMAGES, imgSrc, imgSrcSet } from '../content/images.js';
/** Responsive generated-concept image. `ratio` fixes the box (no layout shift); focal point comes from the registry. */
export default function Img({ id, sizes = '100vw', priority = false, tag = true, className = '', alt, style }) {
  const m = IMAGES[id];
  if (!m) return null;
  return (
    <div className={`img ${className}`} style={style}>
      <img src={imgSrc(id, 1400)} srcSet={imgSrcSet(id)} sizes={sizes} width="2400" height="1500" alt={alt ?? m.alt}
        loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : 'auto'} decoding="async" style={{ objectPosition: m.pos }} />
      {tag && <span className="img__tag">Illustrative render</span>}
    </div>
  );
}
