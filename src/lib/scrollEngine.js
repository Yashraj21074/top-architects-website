/**
 * One shared, passive scroll loop for every scroll-driven effect on the site.
 * Elements register with a mode and receive a CSS custom property --p (0..1) written once per animation frame.
 * Only transform / opacity / clip-path are driven from CSS, so no layout work happens while scrolling.
 *   mode 'exit'  : 0 when the element's top is at the viewport top, 1 when it has fully scrolled out (hero)
 *   mode 'pass'  : 0 when its top enters at the bottom of the viewport, 1 when its bottom leaves at the top (parallax)
 *   mode 'pin'   : for tall sections containing a sticky stage: 0 at the start of the pin, 1 at its end
 * Elements outside the viewport (IntersectionObserver) are skipped. Disabled entirely for prefers-reduced-motion.
 */
const items = new Set();
let ticking = false, io = null;
const clamp = (v) => Math.min(1, Math.max(0, v));
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function frame() {
  ticking = false;
  const vh = window.innerHeight;
  for (const it of items) {
    if (!it.active) continue;
    const r = it.el.getBoundingClientRect(); let p;
    if (it.mode === 'exit') p = clamp(-r.top / Math.max(1, r.height));
    else if (it.mode === 'pin') p = clamp(-r.top / Math.max(1, r.height - vh));
    else p = clamp((vh - r.top) / (vh + r.height));
    if (Math.abs(p - it.last) > 0.0004) { it.last = p; it.el.style.setProperty('--p', p.toFixed(4)); it.onChange?.(p, it.el); }
  }
}
const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
function ensureIO() {
  if (io) return io;
  io = new IntersectionObserver((entries) => { for (const e of entries) { const it = e.target.__scrollItem; if (it) { it.active = e.isIntersecting; if (it.active) schedule(); } } }, { rootMargin: '25% 0px 25% 0px' });
  window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule, { passive: true });
  return io;
}
export function track(el, { mode = 'pass', onChange } = {}) {
  if (!el || reducedMotion() || typeof IntersectionObserver === 'undefined') return () => {};
  const it = { el, mode, onChange, active: false, last: -1 }; el.__scrollItem = it; items.add(it); ensureIO().observe(el); schedule();
  return () => { items.delete(it); io?.unobserve(el); delete el.__scrollItem; };
}
