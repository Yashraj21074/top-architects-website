import { useEffect } from 'react';
import { STUDIO } from '../content/studio.js';
export function useTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — ${STUDIO.name}` : `${STUDIO.name} — ${STUDIO.headline}`;
    const m = document.querySelector('meta[name="description"]');
    if (m && description) m.setAttribute('content', description);
  }, [title, description]);
}
