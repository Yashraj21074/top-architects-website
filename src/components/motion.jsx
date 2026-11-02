import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollProgress } from '../lib/useScroll.js';

/** Adds `.in` once the element is meaningfully in view. variant: 'rise' (default, subtle) | 'mask' (clip-path image reveal) | 'line' (text slides up from a mask) */
export function Reveal({ as = 'div', variant = 'rise', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const Tag = as;
  return <Tag ref={ref} className={`rv rv--${variant} ${className}`} style={delay ? { '--d': `${delay}ms` } : undefined} {...rest}>{children}</Tag>;
}

/** Heading whose words slide up through a mask, staggered (fast: ~0.6 s total). */
export function Words({ as = 'h2', text, className = '', delay = 0, id }) {
  const words = text.split(' ');
  return (
    <Reveal as={as} variant="words" className={className} aria-label={text} id={id}>
      {words.map((w, i) => <Fragment key={i}><span className="w" aria-hidden="true"><span style={{ '--i': i, '--d': `${delay}ms` }}>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>)}
    </Reveal>
  );
}

/** Wrapper that drifts vertically with scroll (transform only). speed in px of total travel; sign = direction. */
export function Parallax({ speed = 60, className = '', children, as = 'div', ...rest }) {
  const ref = useScrollProgress('pass');
  const Tag = as;
  return <Tag ref={ref} className={`plx ${className}`} style={{ '--speed': speed }} {...rest}>{children}</Tag>;
}

/** Thin reading-progress line at the very top of the viewport (page position indicator). */
export function PageProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const upd = () => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; if (ref.current) ref.current.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
    const on = () => { if (!raf) raf = requestAnimationFrame(upd); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on, { passive: true }); upd();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="page-progress" aria-hidden="true"><i ref={ref} /></div>;
}

/** Quick directional line that sweeps across the top on every route change (≈0.5 s, never blocks content). */
export function RouteSweep() {
  const { pathname } = useLocation();
  return <div className="route-sweep" key={pathname} aria-hidden="true" />;
}

/** Small cursor ring for fine pointers only: grows over links and images. Never on touch, never with reduced motion. */
/** Can this environment show a precise, hovering pointer at all? "any-*" (not just the primary pointer) so a tablet or touchscreen laptop with a mouse attached still counts.
 *  Older browsers without any-hover/any-pointer fall back to the primary-pointer query. Users who prefer reduced motion get the plain system cursor. */
const mq = (q) => typeof matchMedia !== 'undefined' && matchMedia(q);
const FINE = '(any-hover: hover) and (any-pointer: fine)', FINE_PRIMARY = '(hover: hover) and (pointer: fine)', REDUCED = '(prefers-reduced-motion: reduce)';
const canShowCursor = () => { const m = mq(FINE); const fine = m && m.media !== 'not all' ? m.matches : !!mq(FINE_PRIMARY)?.matches; return !!fine && !mq(REDUCED)?.matches; };

/**
 * The golden cursor ring: for a MOUSE or TRACKPAD only.
 *  - Touch-only devices (phones, most tablets): nothing is rendered and no listeners are attached.
 *  - Hybrids (touchscreen laptops, tablets with a mouse): the ring follows the mouse, disappears the moment a finger or pen is used (event.pointerType), and
 *    reappears, snapped to the right place, on the next real mouse movement. It also hides when the mouse leaves the window or the tab loses focus.
 *  - Capability is re-evaluated when the environment changes (a mouse is plugged in, reduced motion toggled).
 *  - A gamepad cannot move this ring: the site's gamepad support moves keyboard focus and the receptionist's gaze, it has no on-screen pointer.
 */
export function Cursor() {
  const ring = useRef(null);
  const [on, setOn] = useState(canShowCursor);
  useEffect(() => {
    const qs = [mq(FINE), mq(FINE_PRIMARY), mq(REDUCED)].filter(Boolean), update = () => setOn(canShowCursor());
    qs.forEach((q) => q.addEventListener('change', update)); update();
    return () => qs.forEach((q) => q.removeEventListener('change', update));
  }, []);
  useEffect(() => {
    if (!on) return;
    const el = ring.current; if (!el) return;
    let x = -100, y = -100, cx = x, cy = y, raf = 0, shown = false;
    const paint = () => { el.style.transform = `translate3d(${cx}px,${cy}px,0)`; };
    const tick = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; paint(); raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.5 ? requestAnimationFrame(tick) : 0; };
    const hide = () => { cancelAnimationFrame(raf); raf = 0; if (!shown) return; shown = false; el.removeAttribute('data-ready'); el.removeAttribute('data-state'); };
    const move = (e) => {
      if (e.pointerType !== 'mouse') { hide(); return; }                                   // finger or pen: no ring, and none left behind
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; paint(); el.setAttribute('data-ready', '1'); }   // snap on (re)appearance: no slide from a stale position
      if (!raf) raf = requestAnimationFrame(tick);
      const t = e.target.closest?.('a, button, [data-cursor]'); el.setAttribute('data-state', t ? (t.dataset.cursor || 'link') : e.target.closest?.('.img') ? 'image' : '');
    };
    const down = (e) => (e.pointerType === 'mouse' ? move(e) : hide());
    const up = (e) => { if (e.pointerType !== 'mouse') hide(); };
    const out = (e) => { if (!e.relatedTarget && e.pointerType === 'mouse') hide(); };       // mouse left the window
    const away = () => hide(), vis = () => { if (document.hidden) hide(); };
    const opt = { passive: true };
    addEventListener('pointermove', move, opt); addEventListener('pointerdown', down, opt); addEventListener('pointerup', up, opt); addEventListener('pointercancel', away, opt);
    addEventListener('pointerout', out, opt); addEventListener('blur', away); document.addEventListener('visibilitychange', vis);
    document.documentElement.addEventListener('mouseleave', away);
    return () => {
      removeEventListener('pointermove', move); removeEventListener('pointerdown', down); removeEventListener('pointerup', up); removeEventListener('pointercancel', away);
      removeEventListener('pointerout', out); removeEventListener('blur', away); document.removeEventListener('visibilitychange', vis);
      document.documentElement.removeEventListener('mouseleave', away); cancelAnimationFrame(raf);
    };
  }, [on]);
  return on ? <div className="cursor" ref={ring} aria-hidden="true"><span /></div> : null;
}

/** Barely-there magnetic pull (max 5 px) for a single primary button on desktop. */
export function useMagnetic() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mv = (e) => { const r = el.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height; el.style.transform = `translate3d(${(dx * 5).toFixed(1)}px,${(dy * 4).toFixed(1)}px,0)`; };
    const lv = () => { el.style.transform = ''; };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerleave', lv); return () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerleave', lv); };
  }, []);
  return ref;
}
