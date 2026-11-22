import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import { IMAGES } from '../content/images.js';
import { useNavigationType } from 'react-router-dom';
import { histIdx, saveGallery, savedGallery } from '../lib/navTrail.js';

// Motion model (time-based, so speed is identical on 60/120/144 Hz screens):
// position += (autoDirection * BASE_SPEED * speedFactor + inertia) * dt
const BASE_SPEED = 40;          // px/s on desktop/tablet (brief: 35–45)
const BASE_SPEED_SMALL = 30;    // px/s on phones (<= 700px)
const SLOW_FACTOR = 0.3;        // speed multiplier while hovered / touched / focused (never 0)
const EASE_TAU = 0.45;          // s — smoothing of speed changes (slow-down and restore)
const INERTIA_TAU = 0.55;       // s — decay of flick momentum
const MAX_FLICK = 2400;         // px/s cap on release velocity
const TOUCH_HOLD_MS = 900;      // keep the gentle speed briefly after a finger lifts
const STEP = 220;               // keyboard arrow nudge

// Cards are 16:10. Images within ~±11% of that shape fill the card; very different shapes are letter-boxed (never stretched or heavily cropped).
const fitFor = (id) => { const m = IMAGES[id]; const r = m?.w && m?.h ? m.w / m.h : 0; return r >= 1.45 && r <= 1.95 ? 'cover' : undefined; };

function wrapOffset(value, width) {
  if (!width) return value;
  const mod = ((value % width) + width) % width;
  return mod > 0 ? mod - width : 0;
}

function ProjectCycle({ items, duplicate = false, cycleRef, amplitude }) {
  const waveAt = (index) => {
    if (items.length < 2) return 0;
    if (items.length === 2) return index === 0 ? -0.35 : 0.35;
    return Math.sin((Math.PI * index) / (items.length - 1));
  };
  return (
    <div ref={cycleRef} className="project-marquee__cycle" aria-hidden={duplicate || undefined}>
      {items.map((item, index) => {
        const { project, imageId } = item;
        const previousWave = waveAt(Math.max(0, index - 1));
        const nextWave = waveAt(Math.min(items.length - 1, index + 1));
        const curveY = waveAt(index) * amplitude;
        return <Link
          key={`${project.slug}-${imageId}-${index}`}
          className="project-marquee__card"
          to={`/projects/${project.slug}`}
          tabIndex={duplicate ? -1 : undefined}
          draggable="false"
          style={{ '--i': index, '--curve-y': `${curveY.toFixed(1)}px`, '--caption-counter': `${(-curveY).toFixed(1)}px`, '--curve-tilt': `${((nextWave - previousWave) * 2.8).toFixed(2)}deg` }}
        >
          <span className="project-marquee__photo">
            <Img id={imageId} tag={false} fit={fitFor(imageId)} sizes="(max-width: 700px) 86vw, 40vw" />
            <span className="project-marquee__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="project-marquee__caption">
              <span className="project-marquee__category">{project.category}</span>{' '}
              <span className="project-marquee__title">{project.title}</span>
              <span className="project-marquee__arrow" aria-hidden="true">↗</span>
            </span>
          </span>
        </Link>;
      })}
    </div>
  );
}

export default function ProjectMarquee({ projects, coverOnly = false }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const cycleRef = useRef(null);
  const cycleWidthRef = useRef(0);
  const navType = useNavigationType();
  const offsetRef = useRef(navType === 'POP' ? savedGallery(histIdx()) : 0);   // Back/Forward returns to the same place in the gallery
  const savedAtRef = useRef(0);
  const velocityRef = useRef(0);        // inertial px/s from a flick
  const dirRef = useRef(-1);            // automatic direction: -1 = right→left (default), +1 = left→right
  const factorRef = useRef(1);          // current speed multiplier (eased)
  const draggingRef = useRef(false);
  const hoverRef = useRef(false);       // mouse hover / keyboard focus inside the gallery
  const touchHoldRef = useRef(false);   // finger down (or just lifted)
  const touchTimerRef = useRef(0);
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);
  const dragRef = useRef(null);
  const draggedClickRef = useRef(false);
  const [copies, setCopies] = useState(2);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [dragging, setDragging] = useState(false);
  const mediaItems = useMemo(() => projects.flatMap((project) => {
    const gallery = [...new Set([project.cover, ...(project.gallery || [])].filter(Boolean))];
    // coverOnly: one card per project (its cover); otherwise one card per gallery image.
    return (coverOnly ? gallery.slice(0, 1) : gallery).map((imageId, imageIndex) => ({ project, imageId, imageIndex, imageCount: gallery.length }));
  }), [projects, coverOnly]);
  const curveAmplitude = viewportWidth <= 700 ? 30 : 62;

  const paint = () => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${offsetRef.current.toFixed(2)}px, 0, 0)`;
  };

  // Reduced motion: no automatic drift (the visitor can still drag/swipe). Follows live changes of the OS setting.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const onChange = (event) => { reducedRef.current = event.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
  }, []);

  // Measure the loop width and keep enough copies that the viewport never shows a gap.
  useEffect(() => {
    const measure = () => {
      const cycleWidth = cycleRef.current?.getBoundingClientRect().width || 0;
      const vw = viewportRef.current?.clientWidth || 0;
      setViewportWidth((current) => (current === window.innerWidth ? current : window.innerWidth));
      if (!cycleWidth || !vw) return;
      if (cycleWidthRef.current && Math.abs(cycleWidthRef.current - cycleWidth) > 1) offsetRef.current *= cycleWidth / cycleWidthRef.current; // keep the same visual position when cards resize
      cycleWidthRef.current = cycleWidth;
      offsetRef.current = wrapOffset(offsetRef.current, cycleWidth);
      paint();
      const requiredCopies = Math.max(2, Math.ceil(vw / cycleWidth) + 2);
      setCopies((current) => (current === requiredCopies ? current : requiredCopies));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    if (observer && cycleRef.current) observer.observe(cycleRef.current);
    window.addEventListener('resize', measure, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [projects]);

  // Only animate while the gallery is on screen (saves battery; no work when scrolled away).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One animation loop per mounted gallery.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const width = cycleWidthRef.current;
      if (width && !draggingRef.current && visibleRef.current && document.visibilityState !== 'hidden') {
        const target = hoverRef.current || touchHoldRef.current ? SLOW_FACTOR : 1;
        factorRef.current += (target - factorRef.current) * (1 - Math.exp(-dt / EASE_TAU));   // smooth slow-down / restore
        const base = reducedRef.current ? 0 : (window.innerWidth <= 700 ? BASE_SPEED_SMALL : BASE_SPEED);
        const velocity = velocityRef.current;
        offsetRef.current = wrapOffset(offsetRef.current + (dirRef.current * base * factorRef.current + velocity) * dt, width);
        velocityRef.current = Math.abs(velocity) < 3 ? 0 : velocity * Math.exp(-dt / INERTIA_TAU);
        paint();
        if (now - savedAtRef.current > 400) { savedAtRef.current = now; saveGallery(histIdx(), offsetRef.current, window.location.pathname + window.location.search); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(touchTimerRef.current); };
  }, []);

  const nudge = (direction) => {
    velocityRef.current = 0;
    dirRef.current = direction > 0 ? 1 : -1;
    offsetRef.current = wrapOffset(offsetRef.current + direction * STEP, cycleWidthRef.current);
    paint();
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const captureTarget = event.target.closest('a') || viewportRef.current;
    draggingRef.current = true;
    setDragging(true);
    velocityRef.current = 0;
    if (event.pointerType === 'touch') { window.clearTimeout(touchTimerRef.current); touchHoldRef.current = true; }
    dragRef.current = { pointerId: event.pointerId, captureTarget, startX: event.clientX, lastX: event.clientX, lastTime: performance.now(), startOffset: offsetRef.current, moved: false, speed: 0, pointerType: event.pointerType };
    try { captureTarget.setPointerCapture(event.pointerId); } catch { /* optional on older browsers */ }
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    const dx = event.clientX - drag.lastX;
    const total = event.clientX - drag.startX;
    if (Math.abs(total) > 6) drag.moved = true;
    if (drag.moved) {
      offsetRef.current = wrapOffset(drag.startOffset + total, cycleWidthRef.current);   // 1:1 with the pointer
      drag.speed = drag.speed * 0.6 + ((dx / elapsed) * 1000) * 0.4;                      // smoothed px/s
      drag.lastMove = now;
      paint();
      if (event.pointerType !== 'touch') event.preventDefault();
    }
    drag.lastX = event.clientX;
    drag.lastTime = now;
  };

  const finishPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    draggingRef.current = false;
    setDragging(false);
    if (drag.moved) {
      draggedClickRef.current = true;
      const total = drag.lastX - drag.startX;
      const fresh = performance.now() - (drag.lastMove || 0) < 90;                          // finger/mouse still moving at release?
      velocityRef.current = fresh ? Math.max(-MAX_FLICK, Math.min(MAX_FLICK, drag.speed)) : 0;
      dirRef.current = (Math.abs(drag.speed) > 60 && fresh ? Math.sign(drag.speed) : Math.sign(total)) || dirRef.current; // keep drifting the way the visitor moved it
      factorRef.current = Math.min(factorRef.current, SLOW_FACTOR);
    }
    if (drag.pointerType === 'touch') { window.clearTimeout(touchTimerRef.current); touchTimerRef.current = window.setTimeout(() => { touchHoldRef.current = false; }, TOUCH_HOLD_MS); }
    try { if (drag.captureTarget.hasPointerCapture?.(drag.pointerId)) drag.captureTarget.releasePointerCapture(drag.pointerId); } catch { /* capture can already be released after pointer cancellation */ }
    dragRef.current = null;
    window.setTimeout(() => { draggedClickRef.current = false; }, 0);
  };

  const onClickCapture = (event) => {
    if (!draggedClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedClickRef.current = false;
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudge(-1); }
  };

  const onPointerEnter = (event) => { if (event.pointerType !== 'touch') hoverRef.current = true; };
  const onPointerLeave = (event) => { if (event.pointerType !== 'touch') hoverRef.current = false; };
  const onBlurCapture = (event) => { if (!event.currentTarget.contains(event.relatedTarget)) hoverRef.current = false; };

  return (
    <section className="project-marquee" aria-label="Project image gallery">
      <div
        ref={viewportRef}
        className="project-marquee__viewport"
        data-dragging={dragging}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="TOP Architects + Partners design explorations. Drag or swipe to browse; the left and right arrow keys also work."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onLostPointerCapture={finishPointer}
        onClickCapture={onClickCapture}
        onFocusCapture={() => { hoverRef.current = true; }}
        onBlurCapture={onBlurCapture}
        onKeyDown={onKeyDown}
      >
        <div ref={trackRef} className="project-marquee__track">
          {Array.from({ length: copies }, (_, index) => (
            <ProjectCycle key={`${index}-${mediaItems.map((item) => `${item.project.slug}-${item.imageId}`).join('|')}`} cycleRef={index === 0 ? cycleRef : undefined} items={mediaItems} duplicate={index > 0} amplitude={curveAmplitude} coverOnly={coverOnly} />
          ))}
        </div>
        <svg className="project-marquee__curve project-marquee__curve--top" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0H1440V50C1440 50 1200 100 720 100C240 100 0 50 0 50V0Z" />
        </svg>
        <svg className="project-marquee__curve project-marquee__curve--bottom" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 100H1440V50C1440 50 1200 0 720 0C240 0 0 50 0 50V100Z" />
        </svg>
      </div>
      <p className="project-marquee__hint wrap"><span className="project-marquee__hint-mark" aria-hidden="true">↔</span> Drag or swipe to explore</p>
    </section>
  );
}
