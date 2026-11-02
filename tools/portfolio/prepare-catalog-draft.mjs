import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS as existingProjects } from '../../src/content/projects.js';
import { IMAGES } from '../../src/content/images.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seedPath = path.join(root, 'docs/portfolio-category-drafts.json');
const outputPath = path.join(root, 'docs/PORTFOLIO_CATALOG_DRAFT.json');
const categories = ['Residential', 'Commercial', 'Institutional', 'Public & Landscape', 'Interiors', 'Hospitality'];
const oldSourcePath = (id) => `assets/generated-originals/${id}-original.jpg`;
const generatedSourcePath = (assetKey) => `assets/generated-originals/projects/${assetKey}.jpg`;

function existingView(projectSlug, sourceId, view, alt, scenePrompt = '') {
  const assetKey = `${projectSlug}-${sourceId.replace(/^render-/, '').replace(/^tower-/, '').replace(/^facade-/, '')}`;
  const actualAlt = alt || IMAGES[sourceId]?.alt || `Proposed design visualization of ${view.toLowerCase()}.`;
  return {
    id: `projects/${assetKey}`,
    assetKey,
    sourceId,
    view,
    alt: actualAlt.replace(/conceptual/gi, 'proposed design'),
    sourceType: 'existing',
    sourcePath: oldSourcePath(sourceId),
    scenePrompt,
  };
}

function generatedView(projectSlug, assetKey, view, alt, scenePrompt) {
  return {
    id: `projects/${assetKey}`,
    assetKey,
    view,
    alt: alt.replace(/conceptual/gi, 'proposed design'),
    sourceType: 'generate',
    sourcePath: generatedSourcePath(assetKey),
    referencePath: null,
    scenePrompt,
  };
}

const existingGallery = {
  'cantilever-house': [
    existingView('cantilever-house', 'render-villa-cantilever', 'Hero exterior', 'Proposed design visualization of the pale stone cantilever house above its reflecting pool at dusk.'),
    existingView('cantilever-house', 'render-villa-courtyard', 'Alternate courtyard perspective', 'Proposed design visualization of the courtyard, timber screen and shaded glazed living room.'),
    existingView('cantilever-house', 'render-villa-poolside', 'Poolside and garden spatial composition', 'Poolside perspective showing the house, long reflecting pool and sheltered garden terrace.'),
    existingView('cantilever-house', 'render-villa-entry', 'Arrival threshold and façade detail', 'Arrival view along a landscaped stone path to the sheltered entrance and timber-screened upper level.'),
    existingView('cantilever-house', 'render-villa-living', 'Functional living interior', 'Living-room perspective through the glazed ground floor toward the garden and pool.'),
  ],
  'rotating-tower': [
    existingView('rotating-tower', 'render-commercial-tower', 'Hero tower and podium exterior', 'Proposed design visualization of a slender rotating glass office tower above a limestone podium.'),
    generatedView('rotating-tower', 'rotating-tower-street-perspective', 'Alternate street-level exterior', 'Street-level view of the subtly rotating office tower and shaded public podium.', 'A distinct street-level three-quarter view of the same slender glass office tower, preserving the incremental rotation of floor plates, dark crown, limestone podium fins and planted forecourt. Show a plausible lobby entrance and public approach; physically credible structure and curtain wall.'),
    generatedView('rotating-tower', 'rotating-tower-aerial-forecourt', 'Aerial site and podium composition', 'High oblique aerial view of the tower, podium, forecourt and planted public approach.', 'High oblique aerial of the same tower and podium, showing realistic plot boundaries, service access, pedestrian routes, a planted forecourt and a small reflecting water feature. Keep the tower geometry and rotation unchanged; credible urban site planning.'),
    generatedView('rotating-tower', 'rotating-tower-office-lobby', 'Office arrival and lobby interior', 'Daylit office lobby organized around the tower core and podium frontage.', 'Professional interior visualization of the same tower podium lobby: clear entrance sequence, reception, elevator core, waiting area and views through the glass frontage to the forecourt. Use the established limestone, bronze and dark metal palette; realistic spans and circulation.'),
    generatedView('rotating-tower', 'rotating-tower-facade-detail', 'Curtain-wall and podium detail', 'Close view of the tower curtain wall, rotated floor edge and limestone podium fins.', 'Close architectural detail of the tower curtain-wall system, slab edge and limestone podium fins, showing buildable brackets, mullions and drainage joints. Preserve the established materials and facade rhythm; no impossible cantilevers.'),
  ],
  'civic-hall': [
    existingView('civic-hall', 'render-civic-hall', 'Hero civic-hall exterior', 'Proposed design visualization of the transparent civic hall beneath a broad floating stone roof.'),
    existingView('civic-hall', 'render-civic-atrium', 'Public atrium interior', 'Daylit civic atrium opening toward a planted courtyard through full-height glazing.'),
    generatedView('civic-hall', 'civic-hall-entry-perspective', 'Alternate public arrival perspective', 'Sheltered approach through the civic hall colonnade toward its public entrance.', 'Show a distinct human-eye oblique view of the same civic hall from the approach path, revealing the broad roof, slender colonnade, transparent central hall and solid limestone wings. Keep structural depth and roof supports plausible.'),
    generatedView('civic-hall', 'civic-hall-aerial-courtyard', 'Aerial courtyard and forecourt composition', 'High oblique site view of the hall, processional forecourt, reflecting pool and tree grid.', 'High oblique aerial composition of the same civic hall and its realistic site plan: processional entry, shaded forecourt, reflecting pool, tree grid, service access and two masonry wings. Preserve the single roof plane and courtyard relationship.'),
    generatedView('civic-hall', 'civic-hall-roof-colonnade-detail', 'Roof edge and colonnade detail', 'Close architectural view of the roof edge, column junction and glazed hall facade.', 'Close detail of the civic hall roof edge, slender column, drainage line and curtain-wall junction. Show physically plausible stone thickness, flashing, mullions and fixings in the original restrained material palette.'),
  ],
  'garden-pavilion': [
    existingView('garden-pavilion', 'render-landscape-pavilion', 'Hero pavilion and reflecting pond', 'Proposed design visualization of the timber-roofed pavilion beside a reflecting pond and stepping stones.'),
    existingView('garden-pavilion', 'render-landscape-pavilion-close', 'Timber canopy and water-edge detail', 'Close view of timber canopy slats, stone stepping paths and the pond edge.'),
    generatedView('garden-pavilion', 'garden-pavilion-arrival-view', 'Ground-level arrival perspective', 'Ground-level approach across the stepped stone path toward the shaded pavilion.', 'A distinct ground-level arrival view of the same garden pavilion: preserve the slender bronze columns, low timber-slat roof, limestone platform, stepped stone path and reflecting pond. Show accessible approach and realistic planting.'),
    generatedView('garden-pavilion', 'garden-pavilion-aerial-garden', 'Aerial garden and circulation plan', 'High oblique view of pavilion, pond, terraces, paths and retained garden trees.', 'High oblique aerial view of the same pavilion within a coherent garden plan, showing pond edges, terraces, step-free route, stepping stones, shaded seating and retained trees. Keep the roof footprint and material palette unchanged; practical water management.'),
    generatedView('garden-pavilion', 'garden-pavilion-public-space', 'Shaded public-space experience', 'Quiet public seating beneath the pavilion with planting, water and clear circulation.', 'View from the public seating area beneath the same pavilion, showing realistic bench placement, shade, clear accessible circulation, pond edge safety and dry-climate planting. Preserve the timber roof rhythm and slender columns; no decorative structures without function.'),
  ],
  'light-filled-interior': [
    existingView('light-filled-interior', 'render-interior-living', 'Interior hero composition', 'Proposed design visualization of the double-height living space with oak ceiling and garden glazing.'),
    existingView('light-filled-interior', 'render-interior-mezzanine', 'Mezzanine and stair perspective', 'View across the mezzanine toward the floating timber stair and double-height living room.'),
    generatedView('light-filled-interior', 'light-filled-interior-kitchen-view', 'Alternate living-to-kitchen perspective', 'A second spatial perspective linking living, dining and kitchen zones.', 'A distinct interior viewpoint within the same double-height residence, looking from the kitchen/dining edge through the living room toward the garden glazing. Preserve the oak ceiling, pale plaster, floating stair, mezzanine rail and existing furniture language.'),
    generatedView('light-filled-interior', 'light-filled-interior-circulation-view', 'Functional circulation and seating view', 'View of the main living circulation, seating groups and stair landing.', 'Show the same interior from the stair landing toward the principal seating group and garden threshold. Keep the furniture arrangement, circulation clearances, floor finish, ceiling and daylight direction consistent; all joinery and structure should be buildable.'),
    generatedView('light-filled-interior', 'light-filled-interior-joinery-detail', 'Oak joinery and lighting detail', 'Close architectural detail of the oak ceiling, stair junction and discreet lighting.', 'Close detail of the interior oak ceiling slats, floating stair stringer, handrail, wall junction and discreet linear lighting. Use realistic joinery tolerances, safe stair geometry and the established pale plaster and bronze accents.'),
  ],
  'hillside-retreat': [
    existingView('hillside-retreat', 'render-hospitality-resort', 'Hero coastal retreat exterior', 'Proposed design visualization of terraced low-rise resort villas stepping down toward the sea.'),
    existingView('hillside-retreat', 'render-resort-suite', 'Guest villa terrace perspective', 'Guest villa terrace with a shaded bedroom opening toward the coastal landscape and plunge pool.'),
    generatedView('hillside-retreat', 'hillside-retreat-aerial-site', 'Aerial terrain and guest-villa composition', 'High oblique view of villas, access paths, planted terraces and the coastal slope.', 'High oblique aerial of the same low-rise retreat following a realistic coastal hillside contour. Show discreet arrival access, service route, planted buffers, guest terraces and pools without excessive earthworks. Preserve the established villa roof and glazing language.'),
    generatedView('hillside-retreat', 'hillside-retreat-suite-interior', 'Guest suite interior', 'Guest suite interior with a shaded bed, sitting area and framed sea view.', 'Interior view of a guest suite within the same hillside retreat: realistic bed and storage layout, shaded glazing, simple sitting area and a private terrace beyond. Keep the timber roof, pale rendered walls, dark frames and coastal planting consistent.'),
    generatedView('hillside-retreat', 'hillside-retreat-stone-timber-detail', 'Stone, timber and terrace detail', 'Close view of the villa roof edge, stone terrace wall, glazing and native planting.', 'Close architectural detail of the retreat timber roof overhang, rendered wall, dark glazing frame, stone terrace retaining wall and native planting. Show credible waterproofing and drainage transitions; preserve the original materials.'),
  ],
  'finned-facade': [
    existingView('finned-facade', 'render-commercial-facade', 'Hero workplace façade exterior', 'Proposed design visualization of a mid-rise workplace with vertical limestone fins and bronze slab edges.'),
    generatedView('finned-facade', 'finned-facade-street-perspective', 'Alternate street-level workplace exterior', 'Street-level perspective of the shaded office facade and its sheltered entrance.', 'A distinct street-level oblique view of the same mid-rise workplace, preserving the vertical limestone fin rhythm, bronze slab edges, glazed office floors and sheltered entrance. Show realistic structural bays, ground-floor circulation and street planting.'),
    generatedView('finned-facade', 'finned-facade-urban-aerial', 'Aerial office block and site composition', 'High oblique view of the workplace block, planted setbacks and arrival court.', 'High oblique aerial view of the same office building within a practical urban plot, showing entrance forecourt, pedestrian approach, service access, planted setbacks and neighboring street grain. Maintain realistic mid-rise massing and facade system.'),
    generatedView('finned-facade', 'finned-facade-workplace-interior', 'Daylit workplace interior', 'Flexible workplace interior behind the shaded limestone-fin facade.', 'Professional interior visualization of a functional office floor behind the same facade: regular structural grid, clear core, meeting rooms, flexible workstations and daylight filtered by the limestone fins. Preserve the facade rhythm and realistic span/depth.'),
    generatedView('finned-facade', 'finned-facade-material-detail', 'Limestone-fin and bronze-slab detail', 'Close view of limestone fins, bronze slab edge, glazing and buildable fixings.', 'Close architectural detail of the same workplace facade showing limestone fin anchors, bronze slab-edge cover, curtain-wall mullions, drainage and maintenance access. Preserve exact rhythm and materials; no floating or unsupported facade elements.'),
  ],
};

function normaliseExisting(project) {
  const gallery = existingGallery[project.slug];
  if (!gallery || gallery.length !== 5) throw new Error(`Existing project gallery mapping must have five views: ${project.slug}`);
  const existingAnchors = {
    'cantilever-house': ['Two-storey pale-stone private residence with a proportioned cantilevered upper volume', 'Glazed ground floor opening to a sheltered pool terrace', 'Vertical timber screen and deep flat roof edges', 'Olive-like garden planting and long reflecting pool', 'Warm timber interior set against pale mineral walls'],
    'rotating-tower': ['Slender glass office tower with a restrained incremental rotation between floor plates', 'Dark, simple roof crown', 'Street-scaled limestone podium with vertical fins', 'Shaded public forecourt and pedestrian arrival', 'Plausible central core and regular office floor plates'],
    'civic-hall': ['Transparent central civic hall below one broad roof plane', 'Quiet solid masonry wings for support functions', 'Slender, regularly spaced colonnade', 'Planted courtyard and sheltered public forecourt', 'Pale stone, clear glazing and restrained metalwork'],
    'garden-pavilion': ['Low timber-slat roof on slender bronze-toned columns', 'Limestone terrace beside a reflecting pond', 'Stepping-stone paths and accessible garden circulation', 'Retained canopy trees and layered planting', 'Timber, stone and water used as practical shade and microclimate elements'],
    'light-filled-interior': ['Double-height living room with a safe, buildable floating stair', 'Continuous warm oak ceiling and pale plaster walls', 'Light mezzanine overlooking the principal room', 'Full-height glazing to a planted garden', 'Consistent neutral furniture and discreet architectural lighting'],
    'hillside-retreat': ['Low-rise guest villas stepping with a realistic coastal slope', 'Shaded timber roof edges and pale rendered walls', 'Dark framed glazing with private guest terraces', 'Native coastal planting and limited retaining walls', 'Clear arrival, pedestrian paths and unobtrusive service access'],
    'finned-facade': ['Mid-rise workplace with a regular office-floor structural grid', 'Deep vertical limestone fins in a consistent rhythm', 'Bronze-toned slab edges and glazed curtain wall', 'Sheltered street-level entrance and practical service access', 'Daylight control through fixed exterior shading'],
  };
  const location = /unspecified|conceptual/i.test(project.location) ? 'Proposed site context · location not specified' : project.location;
  const updatedSummaries = {
    'cantilever-house': 'A private house pairs a carefully proportioned upper volume with a glazed ground floor, a sheltered pool terrace and clear indoor–outdoor circulation.',
    'rotating-tower': 'A slender office tower uses incrementally rotated floor plates above a street-scaled limestone podium and a shaded public forecourt.',
    'civic-hall': 'A public civic hall sits beneath a broad roof plane, with a transparent central room, quieter masonry wings and a sheltered arrival sequence.',
    'garden-pavilion': 'A timber-roofed pavilion anchors a sequence of stone terraces, shaded seating, a reflecting pond and accessible garden paths.',
    'light-filled-interior': 'A double-height living room pairs a warm timber ceiling with a floating stair, a light mezzanine and full-height garden glazing.',
    'hillside-retreat': 'A low-rise guest retreat follows a coastal slope, arranging shaded villas, private terraces and planted buffers around a clear arrival route.',
    'finned-facade': 'A mid-rise workplace uses deep limestone fins and bronze slab edges to temper daylight and articulate its glazed office floors.',
  };
  return {
    id: project.slug,
    slug: project.slug,
    title: project.title,
    category: project.category,
    typology: project.typology,
    location,
    year: null,
    client: null,
    award: null,
    kind: 'proposal',
    status: 'proposed',
    statusLabel: 'Proposed Design',
    published: true,
    cover: gallery[0].id,
    gallery,
    summary: updatedSummaries[project.slug] || project.summary,
    designIntent: project.concept,
    approach: project.approach,
    materials: project.materials,
    context: project.context,
    functionalBrief: '',
    programme: [],
    floorOrSiteOrganization: '',
    areaOrScale: '',
    structuralSystem: '',
    constructionLogic: '',
    environmentalResponse: '',
    visualAnchors: existingAnchors[project.slug],
    services: project.services || [],
    origin: 'Existing TOP website project identity; presented as a proposed design.',
  };
}

const seedRows = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const failures = seedRows.filter((row) => !row.ok);
if (failures.length) throw new Error(`Category seed workflow contains failures: ${JSON.stringify(failures.map((x) => x.category))}`);
const additions = seedRows.flatMap((row) => row.value.projects);
if (additions.length !== 35) throw new Error(`Expected 35 new project identities; received ${additions.length}`);

const existing = existingProjects.map(normaliseExisting);
const newProjects = additions.map((project) => ({
  id: project.id,
  slug: project.slug,
  title: project.title,
  category: project.category,
  typology: project.typology,
  location: project.location,
  year: null,
  client: null,
  award: null,
  kind: 'proposal',
  status: 'proposed',
  statusLabel: 'Proposed Design',
  published: true,
  cover: `projects/${project.gallery[0].assetKey}`,
  gallery: project.gallery.map((image) => ({
    id: `projects/${image.assetKey}`,
    assetKey: image.assetKey,
    view: image.view,
    alt: image.alt.replace(/conceptual/gi, 'proposed design'),
    sourceType: 'generate',
    sourcePath: generatedSourcePath(image.assetKey),
    referencePath: null,
    scenePrompt: image.scenePrompt,
  })),
  summary: project.summary,
  designIntent: project.concept,
  approach: project.approach,
  materials: project.materials,
  context: project.location,
  functionalBrief: '',
  programme: [],
  floorOrSiteOrganization: '',
  areaOrScale: '',
  structuralSystem: '',
  constructionLogic: '',
  environmentalResponse: '',
  visualAnchors: project.visualAnchors,
  services: [],
  origin: 'New proposed project identity drafted for this portfolio expansion.',
}));

const projects = [...existing, ...newProjects].sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category) || a.title.localeCompare(b.title));
const countByCategory = Object.fromEntries(categories.map((category) => [category, projects.filter((p) => p.category === category).length]));
const slugs = projects.map((p) => p.slug);
const titles = projects.map((p) => p.title.toLocaleLowerCase());
const galleryIds = projects.flatMap((p) => p.gallery.map((image) => image.id));
const errors = [];
if (projects.length !== 42) errors.push(`Expected 42 projects; got ${projects.length}`);
for (const [category, count] of Object.entries(countByCategory)) if (count !== 7) errors.push(`${category}: expected 7, got ${count}`);
if (new Set(slugs).size !== 42) errors.push('Project slugs are not unique');
if (new Set(titles).size !== 42) errors.push('Project titles are not unique');
if (new Set(galleryIds).size !== 210) errors.push('Gallery image IDs are not unique');
for (const project of projects) {
  if (project.gallery.length !== 5) errors.push(`${project.slug} has ${project.gallery.length} gallery records`);
  if (project.cover !== project.gallery[0].id) errors.push(`${project.slug} cover is not its first gallery view`);
  for (const image of project.gallery) if (!image.id || !image.view || !image.alt) errors.push(`${project.slug} has incomplete image metadata`);
}
for (const project of existing) for (const image of project.gallery) {
  if (image.sourceType === 'existing' && !fs.existsSync(path.join(root, image.sourcePath))) errors.push(`Missing clean source: ${image.sourcePath}`);
}
if (errors.length) throw new Error(errors.join('\n'));

const generatedCount = projects.flatMap((p) => p.gallery).filter((image) => image.sourceType === 'generate').length;
const existingCount = 210 - generatedCount;
const draft = {
  version: 1,
  status: 'Identity and gallery-structure draft; practical design-brief enrichment is pending before image production.',
  categories,
  countByCategory,
  totals: { projects: projects.length, galleryImages: galleryIds.length, existingSourceViews: existingCount, newSourceViewsToGenerate: generatedCount },
  presentation: { status: 'Proposed Design', logoAsset: 'public/logo/top-logo-trim.png', watermarkOpacity: 0.86, watermarkWidthPercent: 6.2, watermarkRightInsetPercent: 2.8, watermarkVerticalPositionPercent: 50, contrastTreatment: 'Automatically selected subtle light or dark halo; logo pixel colors and proportions remain unchanged.' },
  projects,
};
fs.writeFileSync(outputPath, `${JSON.stringify(draft, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, totals: draft.totals, countByCategory, errors }, null, 2));
