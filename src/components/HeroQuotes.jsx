import { useEffect, useState } from 'react';

export const QUOTES = [
  'Architecture is the thoughtful making of space.',
  'Good design is a balance between beauty, purpose, and simplicity.',
  'Great architecture doesn\u2019t just occupy space; it transforms how we experience it.',
  'Every space tells a story. We design the ones worth remembering.',
];
export const LOGO_FADE_MS = 1400;   // logo fade-in (matches .hero2__logo animation)
export const LOGO_ONLY_MS = 5000;   // logo shown on its own, before the quotes and again after the last one
export const QUOTE_MS = 7000;       // each quote's slot (fade in → hold → fade out all happen inside it)

/** Repeating sequence: logo only (5 s) → quote 1…4 (7 s each) → logo only (5 s) → …
 *  One setTimeout chain, owned by this effect and cleared on cleanup, so there can never be two timers running (StrictMode, unmount, route change).
 *  The quotes are stacked in one grid cell, so the slot is always as tall as the tallest quote: nothing shifts when the text changes.
 *  Theme changes only swap CSS variables, so they never touch this state. */
export default function HeroQuotes({ startMs = LOGO_FADE_MS + LOGO_ONLY_MS }) {
  const [active, setActive] = useState(-1);                                    // -1 = logo only
  useEffect(() => {
    let t, i = -1;
    const step = () => {
      const next = i === QUOTES.length - 1 ? -1 : i + 1;
      i = next; setActive(next);
      t = setTimeout(step, next === -1 ? LOGO_ONLY_MS : QUOTE_MS);
    };
    t = setTimeout(step, startMs);                                            // first quote joins the intro sequence (or shortly after load when the intro is skipped)
    return () => clearTimeout(t);
  }, [startMs]);
  return (
    <div className="hq hs" style={{ '--sd': '3.6s', '--hq-dur': `${QUOTE_MS}ms` }} aria-label="Architectural quotes" role="group">
      {QUOTES.map((q, n) => (
        <blockquote key={n} className="hq__q" data-on={active === n ? 'true' : 'false'} aria-hidden={active === n ? undefined : 'true'}>
          <span>{q}</span>
        </blockquote>
      ))}
    </div>
  );
}
