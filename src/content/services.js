// Five confirmed services. Descriptions are deliberately brief and make no claims about specific deliverables.
// `projects` = related conceptual study slugs; `tag` = one-word summary used on the Services page.
export const SERVICES = [
  { slug: 'architecture', title: 'Architecture', tag: 'Building', image: 'render-villa-poolside', projects: ['cantilever-house', 'civic-hall', 'rotating-tower'],
    lead: 'Architecture is the primary expression of the practice — shaping buildings through spatial planning, proportion, materiality, light and relationship to context.' },
  { slug: 'interior-design', title: 'Interior Design', tag: 'Space', image: 'render-interior-living', projects: ['serene-residence', 'urban-penthouse', 'cantilever-house'],
    lead: 'Interiors conceived as part of the architecture: material, light and space composed together.' },
  { slug: 'planning', title: 'Planning & Spatial Design', tag: 'Context', image: 'render-hospitality-resort', projects: ['garden-pavilion', 'civic-hall', 'sponge-belt-ecological-park'],
    lead: 'Site and spatial strategies that relate buildings to circulation, landscape and their wider context.' },
  { slug: 'visualization', title: 'Architectural Visualization', tag: 'Experience', image: 'render-commercial-tower', projects: ['rotating-tower', 'coastal-retreat-resort', 'finned-facade'],
    lead: 'Images and models that communicate atmosphere, light and materiality.' },
  { slug: 'consultancy', title: 'Design Consultancy', tag: 'Direction', image: 'render-commercial-facade', projects: ['finned-facade', 'rotating-tower'],
    lead: 'Design guidance across material selection, design development and architectural review.' },
];
export const getService = (s) => SERVICES.find((x) => x.slug === s);

// ---- Service <-> project relationships ------------------------------------------------------------------------------------------
// Each service's `projects` array above is the hand-picked featured set. serviceProjects() adds every other published project whose OWN
// record supports the association (its category, typology or summary text), so a service page lists genuinely relevant work, not just
// two or three picks. Nothing is assigned by guesswork: the rules are below and are covered by tests/services.test.mjs.
// Visualization and Consultancy stay curated-only: every project image is a render, so a text rule would match all 42 and mean nothing.
const hay = (p) => `${p.typology || ''} ${p.summary || ''}`.toLowerCase();
const RULES = {
  architecture: (p) => ['Residential', 'Commercial', 'Institutional', 'Hospitality'].includes(p.category) || /pavilion|hall|centre|center|museum|library|school|market|station|tower|building/.test(hay(p)),
  'interior-design': (p) => p.category === 'Interiors' || /\binterior/.test(hay(p)),
  planning: (p) => p.category === 'Public & Landscape' || /master ?plan|campus|urban|precinct|landscape|plaza|streetscape|public realm|waterfront|park\b/.test(hay(p)),
  visualization: () => false,
  consultancy: () => false,
};
export function serviceProjects(slug, projects) {
  const s = getService(slug); if (!s) return [];
  const pub = projects.filter((p) => p.published), featured = s.projects.map((x) => pub.find((p) => p.slug === x)).filter(Boolean);
  const rule = RULES[slug] || (() => false);
  return [...featured, ...pub.filter((p) => !featured.includes(p) && rule(p))];
}
/** Services a given project is relevant to (used for the project page and the receptionist). */
export const servicesForProject = (project, projects) => SERVICES.filter((s) => serviceProjects(s.slug, projects).some((p) => p.slug === project.slug));

/** Stable URL anchor for a service's section on the Services page: "Planning & Spatial Design" -> planning-spatial-design. */
export const serviceAnchor = (s) => s.title.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const serviceHref = (s) => `/services#${serviceAnchor(s)}`;
