// THE JOURNAL: twelve editorial essays, one module per group of four in ./journal/ (a01-04 … a09-12), assembled by ./journal/index.js.
// Facts about projects come from the project records themselves (src/content/projects.js); images are the studio's own project visualizations,
// captioned from each image's own record (helpers.js → caption()). Authors and dates are not recorded, so none are shown.
//
// body = structured blocks rendered by components/journal.jsx:
//   { t:'p', x } paragraph · { t:'h2', x } section heading · { t:'quote', x } pull quote · { t:'list', items:[] }
//   { t:'figure', image, caption } full-width image · { t:'pair', items:[{ image, caption }, { image, caption }] } two images
// Article fields: slug, title, category, layout ('immersive' | 'split' | 'classic' | 'plate'), excerpt, image (+pos), projects[], services[], tags[], featured.
import { ARTICLE_LIST } from './journal/index.js';
import { caption } from './journal/helpers.js';

export const ARTICLES = ARTICLE_LIST.map((a) => ({ ...a, caption: caption(a.image) }));
export const NOTES = [];   // the old placeholder notes were removed with the old collection

export const getArticle = (s) => ARTICLES.find((a) => a.slug === s && a.published);
const wordsOf = (b) => (b.t === 'list' ? b.items.join(' ') : b.t === 'pair' || b.t === 'figure' ? '' : b.x || '');
export const readingTime = (a) => Math.max(1, Math.round(a.body.map(wordsOf).join(' ').split(/\s+/).filter(Boolean).length / 200));
export const categories = () => [...new Set(ARTICLES.filter((a) => a.published).map((a) => a.category))];
/** Related stories: shared tags count most, same category next; never unrelated filler. */
export const related = (a, n = 3) => ARTICLES.filter((x) => x.published && x.slug !== a.slug)
  .map((x) => ({ x, s: x.tags.filter((t) => a.tags.includes(t)).length * 2 + (x.category === a.category ? 1 : 0) + x.projects.filter((p) => a.projects.includes(p)).length }))
  .filter((r) => r.s > 0).sort((p, q) => q.s - p.s).slice(0, n).map((r) => r.x);
