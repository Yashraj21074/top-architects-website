import { useEffect, useRef } from 'react';

const IMG = {
  src: '/img/hero/hero-1100.webp',
  srcSet: '/img/hero/hero-560.webp 560w, /img/hero/hero-900.webp 900w, /img/hero/hero-1100.webp 1100w, /img/hero/hero-1400.webp 1400w',
  alt: 'A contemporary white sculptural building with sweeping curved structural forms and extensive glazing, overlooking open water and a distant skyline.',
};

/** Optional homepage video layer. With STUDIO.heroVideo unset, the homepage uses the supplied
 *  responsive building still on `.hero2::before`, where CSS applies a restrained push–pull and
 *  2D drift. If a video is configured, this component retains its muted, lazy, off-screen-paused
 *  playback behavior and the same still as its poster; reduced motion / data-saver skips playback. */
export default function HeroMedia({ video }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current; if (!v || !video) return;
    const skip = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
    if (skip) return;                                                                 // poster only
    let loaded = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!loaded) { loaded = true; v.preload = 'auto'; v.load(); }
        v.play().catch(() => {});
      } else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => { io.disconnect(); v.pause(); };
  }, [video]);
  return (
    <figure className="hero2__img">
      {video ? (
        <video ref={ref} muted loop playsInline preload="none" poster={video.poster || IMG.src} aria-label={IMG.alt} width="1400" height="1583">
          {video.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
        </video>
      ) : (
        <img src={IMG.src} srcSet={IMG.srcSet} sizes="100vw" width="1400" height="1583" fetchpriority="high" decoding="async" alt={IMG.alt} />
      )}
    </figure>
  );
}
