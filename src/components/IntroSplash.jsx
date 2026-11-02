import { useCallback, useEffect, useRef, useState } from 'react';
import { STUDIO } from '../content/studio.js';

const INTRO_KEY = 'top-architects-intro-seen';
const LOGO = { day: '/logo/top-logo-trim.png', night: '/logo/top-logo-trim-night.png' };

function shouldShowIntro() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(INTRO_KEY) !== 'seen';
  } catch {
    return true;
  }
}

export default function IntroSplash() {
  const [visible, setVisible] = useState(shouldShowIntro);
  const [leaving, setLeaving] = useState(false);
  const skipRef = useRef(null);
  const timersRef = useRef([]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [window.setTimeout(() => setVisible(false), 600)];
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    try {
      window.sessionStorage.setItem(INTRO_KEY, 'seen');
    } catch {
      // The intro still works if browser storage is unavailable.
    }
    skipRef.current?.focus({ preventScroll: true });
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1850);
    const removeTimer = window.setTimeout(() => setVisible(false), 2450);
    timersRef.current = [leaveTimer, removeTimer];
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        skipRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`site-intro${leaving ? ' site-intro--leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${STUDIO.name} introduction`}
    >
      <div className="site-intro__mark" aria-hidden="true">
        {['day', 'night'].map((variant) => (
          <span key={variant} className={`hl logo-${variant}`}>
            <img className="hl__e" src={LOGO[variant]} alt="" width="1587" height="882" decoding="async" />
            <img className="hl__t" src={LOGO[variant]} alt="" width="1587" height="882" decoding="async" />
            <img className="hl__n" src={LOGO[variant]} alt="" width="1587" height="882" decoding="async" />
          </span>
        ))}
      </div>
      <button ref={skipRef} className="site-intro__skip" type="button" onClick={dismiss}>
        Skip intro
      </button>
    </div>
  );
}
