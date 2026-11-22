// ONE searchable index of the website, built from the same content files the pages render (no separate, hand-maintained list).
// Used by EXPLORE TOP search and by the receptionist's retrieval (api/reception.js imports it too), so adding a project, service or
// article to src/content automatically makes it findable everywhere.
import { DESTINATIONS } from '../content/destinations.js';
import { ACTIVE_CATEGORIES, PROJECTS } from '../content/projects.js';
import { SERVICES } from '../content/services.js';
import { ARTICLES } from '../content/journal.js';

export const categoryRoute = (c) => `/projects?category=${encodeURIComponent(c)}`;
export const PAGES = [
  { id: 'home', label: 'Home', route: '/', sub: 'The studio' },
  ...DESTINATIONS,
  { id: 'reception', label: '3D Reception', route: '/reception', sub: 'Speak with the virtual receptionist' },
];
const join = (...a) => a.flat().filter(Boolean).join(' ');

export function buildIndex() {
  const out = [];
  for (const d of PAGES) out.push({ type: 'page', id: d.id, title: d.label, sub: d.sub || '', route: d.route, text: join(d.sub, d.navLabel) });
  for (const s of SERVICES) out.push({ type: 'service', id: s.slug, title: s.title, sub: 'Service', route: `/services/${s.slug}`, text: join(s.tag, s.lead) });
  for (const c of ACTIVE_CATEGORIES) out.push({ type: 'category', id: c, title: c, sub: 'Project category', route: categoryRoute(c), text: '' });
  for (const p of PROJECTS.filter((x) => x.published)) out.push({ type: 'project', id: p.slug, title: p.title, sub: join(p.category, p.location && !/unspecified/i.test(p.location) ? `· ${p.location}` : ''), category: p.category, route: `/projects/${p.slug}`, text: join(p.category, p.typology, p.summary, p.materials, p.programme) });
  for (const a of ARTICLES.filter((x) => x.published)) out.push({ type: 'article', id: a.slug, title: a.title, sub: join('Journal', a.category && `· ${a.category}`), route: `/journal/${a.slug}`, text: join(a.category, a.tags, a.excerpt) });
  return out;
}
export const SITE_INDEX = buildIndex();
export const TYPE_LABEL = { page: 'Page', service: 'Service', category: 'Category', project: 'Project', article: 'Journal' };
/** Every route the website really has: used to validate navigation actions (AI, search) so nothing can point somewhere invented. */
export const isKnownRoute = (route) => typeof route === 'string' && SITE_INDEX.some((e) => e.route === route);
