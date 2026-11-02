import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img.jsx';

const FRAME_MS = 1000 / 60;
const AUTO_SPEED = 0.8; // px per 60 Hz frame; follows the reference's 0.8 px/frame at a stable rate
const FRICTION = 0.95;
const THRESHOLD = 0.1;
const STEP = 220;

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
        const { project, imageId, imageIndex, imageCount } = item;
        const previousWave = waveAt(Math.max(0, index - 1));
        const nextWave = waveAt(Math.min(items.length - 1, index + 1));
        const curveY = waveAt(index) * amplitude;
        return <Link
          key={`${project.slug}-${imageId}-${index}`}
          className="project-marquee__card"
          to={`/projects/${project.slug}`}
          tabIndex={duplicate ? -1 : undefined}
          aria-label={`TOP design exploration: ${project.title}, view ${imageIndex + 1} of ${imageCount}, ${project.typology}`}
          draggable="false"
          style={{ '--curve-y': `${curveY.toFixed(1)}px`, '--caption-counter': `${(-curveY).toFixed(1)}px`, '--curve-tilt': `${((nextWave - previousWave) * 2.8).toFixed(2)}deg` }}
        >
          <span className="project-marquee__photo">
            <Img id={imageId} tag={false} sizes="(max-width: 700px) 64vw, 22vw" />
            <span className="project-marquee__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="project-marquee__caption">
              <span className="project-marquee__category">{project.category}</span>
              <span className="project-marquee__title">{project.title}</span>
              <span className="project-marquee__arrow" aria-hidden="true">↗</span>
            </span>
          </span>
        </Link>;
      })}
    </div>
  );
}

export default function ProjectMarquee({ projects }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const cycleRef = useRef(null);
  const cycleWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const interactionRef = useRef(false);
  const dragRef = useRef(null);
  const draggedClickRef = useRef(false);
  const playingRef = useRef(false);
  const [copies, setCopies] = useState(2);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [dragging, setDragging] = useState(false);
  const mediaItems = useMemo(() => projects.flatMap((project) => {
    const gallery = [...new Set([project.cover, ...(project.gallery || [])].filter(Boolean))];
    return gallery.map((imageId, imageIndex) => ({ project, imageId, imageIndex, imageCount: gallery.length }));
  }), [projects]);
  const curveAmplitude = viewportWidth <= 700 ? 28 : 54;

  const paint = () => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${offsetRef.current.toFixed(2)}px, 0, 0)`;
  };

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pauseForPreference = (event) => {
      if (event.matches) setPlaying(false);
    };
    if (motionPreference.addEventListener) motionPreference.addEventListener('change', pauseForPreference);
    else motionPreference.addListener(pauseForPreference);
    return () => {
      if (motionPreference.removeEventListener) motionPreference.removeEventListener('change', pauseForPreference);
      else motionPreference.removeListener(pauseForPreference);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const cycleWidth = cycleRef.current?.getBoundingClientRect().width || 0;
      const viewportWidth = viewportRef.current?.clientWidth || 0;
      setViewportWidth((current) => current === window.innerWidth ? current : window.innerWidth);
      if (!cycleWidth || !viewportWidth) return;
      cycleWidthRef.current = cycleWidth;
      offsetRef.current = wrapOffset(offsetRef.current, cycleWidth);
      paint();
      const requiredCopies = Math.max(2, Math.ceil(viewportWidth / cycleWidth) + 2);
      setCopies((current) => current === requiredCopies ? current : requiredCopies);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    if (observer && cycleRef.current) observer.observe(cycleRef.current);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [projects]);

  useEffect(() => {
    let raf = 0;
    let lastFrame = performance.now();
    const tick = (now) => {
      const elapsed = Math.min(48, Math.max(0, now - lastFrame));
      const frames = elapsed / FRAME_MS;
      lastFrame = now;
      const width = cycleWidthRef.current;
      if (width && !draggingRef.current && document.visibilityState !== 'hidden') {
        if (Math.abs(velocityRef.current) > THRESHOLD && !interactionRef.current) {
          offsetRef.current += velocityRef.current * frames;
          velocityRef.current *= FRICTION ** frames;
          if (Math.abs(velocityRef.current) <= THRESHOLD) velocityRef.current = 0;
        } else if (interactionRef.current) {
          velocityRef.current = 0;
        } else if (playingRef.current) {
          offsetRef.current -= AUTO_SPEED * frames;
        }
        offsetRef.current = wrapOffset(offsetRef.current, width);
        paint();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (direction) => {
    velocityRef.current = 0;
    offsetRef.current = wrapOffset(offsetRef.current + direction * STEP, cycleWidthRef.current);
    paint();
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const captureTarget = event.target.closest('a') || viewportRef.current;
    draggingRef.current = true;
    setDragging(true);
    velocityRef.current = 0;
    dragRef.current = {
      pointerId: event.pointerId,
      captureTarget,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      startOffset: offsetRef.current,
      moved: false,
    };
    try { captureTarget.setPointerCapture(event.pointerId); } catch { /* optional on older browsers */ }
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    const dx = event.clientX - drag.lastX;
    const total = event.clientX - drag.startX;
    if (Math.abs(total) > 5) drag.moved = true;
    if (drag.moved) {
      offsetRef.current = wrapOffset(drag.startOffset + total, cycleWidthRef.current);
      velocityRef.current = (dx / elapsed) * FRAME_MS;
      paint();
      event.preventDefault();
    }
    drag.lastX = event.clientX;
    drag.lastTime = now;
  };

  const finishPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    draggingRef.current = false;
    setDragging(false);
    if (drag.moved) draggedClickRef.current = true;
    else velocityRef.current = 0;
    try {
      if (drag.captureTarget.hasPointerCapture?.(drag.pointerId)) drag.captureTarget.releasePointerCapture(drag.pointerId);
    } catch { /* capture can already be released after pointer cancellation */ }
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
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudge(1); }
    if (event.key === 'Home') { event.preventDefault(); offsetRef.current = 0; velocityRef.current = 0; paint(); }
  };

  const onPointerEnter = (event) => {
    if (event.pointerType !== 'touch') {
      interactionRef.current = true;
      velocityRef.current = 0;
    }
  };
  const onPointerLeave = (event) => { if (event.pointerType !== 'touch') interactionRef.current = false; };
  const onBlurCapture = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) interactionRef.current = false;
  };

  return (
    <section className="project-marquee" aria-label="Project image gallery">
      <div
        ref={viewportRef}
        className="project-marquee__viewport"
        data-dragging={dragging}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="TOP Architects + Partners design explorations. Drag or use the arrow keys to browse."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onLostPointerCapture={finishPointer}
        onClickCapture={onClickCapture}
        onFocusCapture={() => { interactionRef.current = true; velocityRef.current = 0; }}
        onBlurCapture={onBlurCapture}
        onKeyDown={onKeyDown}
      >
        <div ref={trackRef} className="project-marquee__track">
          {Array.from({ length: copies }, (_, index) => (
            <ProjectCycle key={`${index}-${mediaItems.map((item) => `${item.project.slug}-${item.imageId}`).join('|')}`} cycleRef={index === 0 ? cycleRef : undefined} items={mediaItems} duplicate={index > 0} amplitude={curveAmplitude} />
          ))}
        </div>
        <svg className="project-marquee__curve project-marquee__curve--top" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0H1440V50C1440 50 1200 100 720 100C240 100 0 50 0 50V0Z" />
        </svg>
        <svg className="project-marquee__curve project-marquee__curve--bottom" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 100H1440V50C1440 50 1200 0 720 0C240 0 0 50 0 50V100Z" />
        </svg>
      </div>
      <div className="project-marquee__controls wrap">
        <p className="project-marquee__hint"><span className="project-marquee__hint-mark" aria-hidden="true">↔</span> Drag to explore · arrow keys also work</p>
        <div className="project-marquee__buttons" role="group" aria-label="Project gallery controls">
          <button type="button" aria-label="Move to earlier projects" onClick={() => nudge(1)}>←</button>
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((current) => !current)}>{playing ? 'Pause motion' : 'Play motion'}</button>
          <button type="button" aria-label="Move to later projects" onClick={() => nudge(-1)}>→</button>
        </div>
      </div>
    </section>
  );
}
