import { useEffect, useRef } from 'react';
import { track } from './scrollEngine.js';
/** Attach to an element: it receives --p (0..1) as the page scrolls (see scrollEngine for modes). */
export function useScrollProgress(mode = 'pass', onChange) {
  const ref = useRef(null);
  useEffect(() => track(ref.current, { mode, onChange }), [mode, onChange]);
  return ref;
}
