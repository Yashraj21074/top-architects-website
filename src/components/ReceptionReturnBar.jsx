import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getOrigin } from '../lib/entryOrigin.js';
import { unlockSpeech } from '../lib/speech.js';

/** Sticky bar under the header on every inner page: returns to wherever the visit started (Home or the 3D Reception) via an explicit route. */
export default function ReceptionReturnBar() {
  const { pathname } = useLocation();
  const show = pathname !== '/';
  const fromReception = show && getOrigin() === 'reception';
  const ref = useRef(null);
  useEffect(() => {
    if (!show) return;
    const root = document.documentElement, el = ref.current;
    root.setAttribute('data-return-bar', '');                                   // lets sticky stages (Services) sit below the bar
    const measure = () => root.style.setProperty('--bar-h', `${el.offsetHeight}px`);
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    return () => { ro.disconnect(); root.removeAttribute('data-return-bar'); root.style.removeProperty('--bar-h'); };
  }, [show]);
  if (!show) return null;
  return (
    <div className="return-bar" ref={ref} role="navigation" aria-label={fromReception ? 'Return to the reception' : 'Return to the homepage'}>
      <div className="wrap return-bar__in">
        {fromReception
          ? <Link to="/reception" className="btn btn--sm return-bar__btn" onClick={unlockSpeech}><span aria-hidden="true">←</span> Back to Reception</Link>
          : <Link to="/" className="btn btn--sm return-bar__btn"><span aria-hidden="true">←</span> Back to Home</Link>}
        {fromReception && <span className="return-bar__hint">You opened this page from the 3D reception.</span>}
      </div>
    </div>
  );
}
