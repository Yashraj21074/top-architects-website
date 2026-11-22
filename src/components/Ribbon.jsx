import { useScrollProgress } from '../lib/useScroll.js';
/** Signature divider: a soft architectural "membrane" that drifts with scroll. Theme-aware, transform-only. */
export default function Ribbon({ flip = false, tone = 'stone' }) {
  const ref = useScrollProgress('pass');
  return (
    <div ref={ref} className={`ribbon ribbon--${tone} ${flip ? 'ribbon--flip' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none" focusable="false">
        <path className="rb-fill" d="M0 96 C 240 20, 470 170, 760 92 S 1210 8, 1440 78 L1440 180 L0 180 Z" />
        <path className="rb-line" d="M0 96 C 240 20, 470 170, 760 92 S 1210 8, 1440 78" />
        <path className="rb-line rb-line--b" d="M0 112 C 250 44, 480 184, 770 108 S 1200 30, 1440 94" />
      </svg>
    </div>
  );
}
