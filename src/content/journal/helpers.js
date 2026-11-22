// Block helpers for the Journal. An article body is an array of blocks rendered by components/journal.jsx → <Blocks/>.
//   P paragraph · H section heading · Q pull quote (always a sentence from the article itself) · F full-width figure · PAIR two figures · L short list
import { PORTFOLIO_IMAGES } from '../portfolioImages.js';
import { PROJECTS } from '../projects.js';

const owner = (id) => PROJECTS.find((p) => p.gallery.includes(id) || p.cover === id);
const CAPTIONS = { 'render-villa-cantilever': 'Cantilever House — the solid upper volume reaching over the glazed ground floor and the pool terrace' };
/** Caption = the project the image belongs to + what the view shows (taken from the project's own image record, never invented). */
export const caption = (id) => CAPTIONS[id] || `${owner(id)?.title ?? ''} — ${PORTFOLIO_IMAGES[id]?.view ?? ''}`.trim();
export const P = (x) => ({ t: 'p', x });
export const H = (x) => ({ t: 'h2', x });
export const Q = (x) => ({ t: 'quote', x });
export const L = (...items) => ({ t: 'list', items });
export const F = (image, cap) => ({ t: 'figure', image, caption: cap || caption(image) });
export const PAIR = (a, b) => ({ t: 'pair', items: [{ image: a, caption: caption(a) }, { image: b, caption: caption(b) }] });
