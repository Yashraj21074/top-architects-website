// The receptionist's verified knowledge: everything it may state as fact about the practice comes from these content modules,
// so the dialogue can never drift away from the website. Routes it may open are validated here too (generated text can never invent one).
import { SERVICES } from '../../content/services.js';
import { PROJECTS, CATEGORIES } from '../../content/projects.js';
import { PROCESS, PROCESS_NOTE } from '../../content/process.js';
import { ARTICLES } from '../../content/journal.js';
import { DESTINATIONS, destById } from '../../content/destinations.js';
import { STUDIO } from '../../content/studio.js';

const projects = PROJECTS.filter((p) => p.published);
export const kb = {
  studio: STUDIO, dests: DESTINATIONS, services: SERVICES, projects, processNote: PROCESS_NOTE,
  process: PROCESS.filter((s) => s.offered), articles: ARTICLES.filter((a) => a.published),
  categories: CATEGORIES.filter((c) => projects.some((p) => p.category === c)),
};
export const destIds = DESTINATIONS.map((d) => d.id);
export const getDest = destById;
export const project = (slug) => projects.find((p) => p.slug === slug) || null;
export const service = (slug) => SERVICES.find((s) => s.slug === slug) || null;
export const article = (slug) => kb.articles.find((a) => a.slug === slug) || null;
export const inCategory = (c) => projects.filter((p) => p.category === c);
const CAT_DEST = { Residential: 'projects', Commercial: 'projects', Institutional: 'projects', Hospitality: 'projects', 'Public & Landscape': 'projects', Interiors: 'projects' };

/** Validate a suggested action and turn it into a real destination. Anything not on the website returns null. */
export function resolveAction(a) {
  if (!a || a.type !== 'navigate') return null;
  const d = destById(a.dest); if (!d) return null;
  let route = d.route, label = d.label;
  if (a.slug) {
    const hit = a.dest === 'projects' ? project(a.slug) : a.dest === 'services' ? service(a.slug) : a.dest === 'journal' ? article(a.slug) : null;
    if (!hit) return null; route = `${d.route}/${a.slug}`; label = hit.title;
  } else if (a.category) {
    if (a.dest !== 'projects' || !kb.categories.includes(a.category)) return null;
    route = `${d.route}?category=${encodeURIComponent(a.category)}`; label = `${a.category} projects`;
  }
  return { ...d, route, label, id: d.id, slug: a.slug || null, category: a.category || null, baseLabel: d.label };
}
export { CAT_DEST };

// One verified sentence per destination (no greeting words, so it can follow any lead-in).
export const BLURB = {
  about: 'The studio page introduces the practice, established in 2026, and its founder.',
  projects: 'These are conceptual studies, and you can filter them by type.',
  services: 'There are five services, from architecture through to design consultancy.',
  process: 'It outlines the stages a project typically moves through, from the first conversation to completion.',
  team: 'Ar. Saurabh S Jadhav is the Founder and Principal, and the practice is currently founder-led.',
  journal: 'The articles are illustrative for now: short essays on light, materials and thresholds.',
  contact: 'It has the studio’s email and phone numbers for Navi Mumbai and London.',
};
