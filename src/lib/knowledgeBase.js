// Grounding knowledge for the AI receptionist. Built from the SAME content modules the website renders (no second database): when a project,
// service, article or studio detail changes in src/content, the receptionist's knowledge changes with it on the next build/deploy.
import { PROJECTS, ACTIVE_CATEGORIES } from '../content/projects.js';
import { SERVICES, serviceProjects, servicesForProject } from '../content/services.js';
import { ARTICLES } from '../content/journal.js';
import { PROCESS, PROCESS_INTRO } from '../content/process.js';
import { STUDIO } from '../content/studio.js';
import { SITE_INDEX } from './siteIndex.js';
import { searchSite } from './siteSearch.js';

const pubProjects = PROJECTS.filter((p) => p.published);
const arr = (a) => (Array.isArray(a) ? a.join('; ') : a || '');
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export function projectFacts(p) {
  return [`PROJECT "${p.title}" [id: ${p.slug}] — category: ${p.category}; type: ${p.typology}; status: conceptual design exploration (illustrative, not a completed building).`,
    p.location && !/unspecified/i.test(p.location) ? `Location: ${p.location}.` : '', `Summary: ${clip(p.summary, 400)}`, p.concept ? `Concept: ${clip(p.concept, 500)}` : '',
    p.approach ? `Architectural features: ${clip(arr(p.approach), 400)}` : '', p.materials ? `Materials: ${clip(arr(p.materials), 300)}` : '',
    `Relevant services: ${servicesForProject(p, PROJECTS).map((s) => s.title).join(', ') || 'n/a'}.`].filter(Boolean).join(' ');
}
const serviceFacts = (s) => `SERVICE "${s.title}" [id: ${s.slug}] — ${s.tag}. ${clip(s.lead, 450)} Related studies: ${serviceProjects(s.slug, PROJECTS).slice(0, 8).map((p) => p.title).join(', ')}.`;
const articleFacts = (a) => `JOURNAL ARTICLE "${a.title}" [id: ${a.slug}] — ${a.category}. ${clip(a.excerpt, 300)}`;

/** Facts that are always true and short enough to always include. */
export const STUDIO_FACTS = [
  `The studio: ${STUDIO.name}, established ${STUDIO.established}. ${STUDIO.intro}`,
  `Founder: ${STUDIO.founder.name}, ${STUDIO.founder.title}${STUDIO.founder.qualification ? ` (${STUDIO.founder.qualification})` : ''}. The practice is currently founder-led.`,
  `Services (5): ${SERVICES.map((s) => s.title).join('; ')}.`,
  `Project categories (${ACTIVE_CATEGORIES.length}): ${ACTIVE_CATEGORIES.join('; ')}. The portfolio has ${pubProjects.length} conceptual design explorations; the imagery is illustrative, not photography of completed or commissioned projects.`,
  `Process stages: ${PROCESS.filter((s) => s.offered).map((s) => s.title).join(' → ')}. ${clip(PROCESS_INTRO, 250)}`,
  `Contact: email ${STUDIO.contact.email}; ${STUDIO.contact.phones.map((p) => `${p.label} ${p.number}`).join('; ')}; office: ${STUDIO.contact.address.join(', ')}.`,
].join('\n');

/** Pages the receptionist may open, as a compact list (the server validates whatever it returns against the real routes). */
export const NAV_TARGETS = `Navigation targets: dest "about", "projects", "services", "process", "team", "journal", "contact". Optional "slug" (project / service / article id) or, for dest "projects" only, "category" (one of: ${ACTIVE_CATEGORIES.join(', ')}).`;

/** Retrieve the most relevant facts for a visitor message (+ the project/service currently being discussed). Small corpus: lexical retrieval is enough. */
export function retrieve(message, { subject, mentioned = [] } = {}, limit = 6) {
  const hits = searchSite(message, limit + 4, { loose: true }), seen = new Set(), out = [];
  const add = (e) => { if (!e || seen.has(e.type + e.id)) return; seen.add(e.type + e.id); out.push(e); };
  if (subject?.id) add(SITE_INDEX.find((e) => e.id === subject.id && ['project', 'service', 'article'].includes(e.type)));
  for (const id of mentioned.slice(0, 6)) if (/ (second|third|that|those|similar|one|first)/i.test(` ${message}`)) add(SITE_INDEX.find((e) => e.id === id && e.type === 'project'));
  hits.forEach(add);
  return out.slice(0, limit + 3).map((e) => {
    if (e.type === 'project') return projectFacts(pubProjects.find((p) => p.slug === e.id));
    if (e.type === 'service') return serviceFacts(SERVICES.find((s) => s.slug === e.id));
    if (e.type === 'article') return articleFacts(ARTICLES.find((a) => a.slug === e.id));
    if (e.type === 'category') return `CATEGORY "${e.title}": ${pubProjects.filter((p) => p.category === e.title).map((p) => `${p.title} [id: ${p.slug}] (${p.typology})`).join('; ')}.`;
    return `PAGE "${e.title}": ${e.sub}.`;
  });
}
