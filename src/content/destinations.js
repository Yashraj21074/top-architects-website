// SINGLE SOURCE OF TRUTH for the seven main destinations (header, footer, reception panel, dialogue keys, routes).
// Add a destination here and it appears everywhere, with a dialogue pool of the same id in dialogue.js.
export const DESTINATIONS = [
  { id: 'about',    label: 'About Us / Studio', navLabel: 'About Us', route: '/studio',   sub: 'The practice and its founder' },
  { id: 'projects', label: 'Projects',          navLabel: 'Projects', route: '/projects', sub: 'Conceptual studies' },
  { id: 'services', label: 'Services',          navLabel: 'Services', route: '/services', sub: 'What we offer' },
  { id: 'process',  label: 'Our Process',       navLabel: 'Process',  route: '/process',  sub: 'How a project develops' },
  { id: 'team',     label: 'Team',              navLabel: 'Team',     route: '/team',     sub: 'Founder & Principal', nav: false },
  { id: 'journal',  label: 'Journal',           navLabel: 'Journal',  route: '/journal',  sub: 'Ideas and essays' },
  { id: 'contact',  label: 'Contact',           navLabel: 'Contact',  route: '/contact',  sub: 'Reach the studio' },
];
export const destById = (id) => DESTINATIONS.find((d) => d.id === id);
/** Map any pathname (e.g. /projects/cantilever-house) to its destination id, or null. */
export const destFromPath = (path) => DESTINATIONS.find((d) => path === d.route || path.startsWith(d.route + '/'))?.id ?? null;
