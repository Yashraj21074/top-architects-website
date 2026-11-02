// All records below are CONCEPTUAL DESIGN STUDIES created for this website. They are not completed or commissioned
// TOP Architects + Partners projects. Replace/extend with real projects: set kind:'project', real status, location and images.
export const CATEGORIES = ['Residential', 'Commercial', 'Institutional', 'Hospitality', 'Public & Landscape', 'Interiors'];
export const STATUS = {
  concept: 'Conceptual study', proposed: 'Proposed', competition: 'Competition', ongoing: 'Ongoing',
  'under-construction': 'Under construction', completed: 'Completed',
};

export const PROJECTS = [
  {
    slug: 'cantilever-house', published: true, kind: 'concept', status: 'concept',
    title: 'Cantilever House', category: 'Residential', typology: 'Private residence', location: 'Unspecified — conceptual', year: null,
    cover: 'render-villa-cantilever', gallery: ['render-villa-cantilever', 'render-villa-courtyard', 'render-villa-poolside', 'render-villa-entry', 'render-villa-living'],
    summary: 'A study in suspension: a solid upper volume reaches over a glazed ground floor, framing a pool terrace.',
    concept: 'The house is organised as two clear gestures. A transparent ground plane opens every living space to the terrace and garden, while a solid, timber-screened upper volume floats above to provide privacy, shade and a strong silhouette.',
    approach: ['Long, shaded terrace that extends the living room outdoors', 'Cantilever used to shelter the pool edge and create a deep threshold', 'Vertical timber screen to filter low evening sun'],
    materials: ['Pale limestone slab', 'Rendered plaster volume', 'Slatted timber screen', 'Bronze-toned metalwork', 'Full-height glazing'],
    context: 'Imagined on a level, landscaped plot with generous setbacks.',
  },
  {
    slug: 'rotating-tower', published: true, kind: 'concept', status: 'concept',
    title: 'Rotating Tower Study', category: 'Commercial', typology: 'Mixed-use office tower', location: 'Unspecified — conceptual', year: null,
    cover: 'render-commercial-tower', gallery: ['render-commercial-tower', 'tower-plaza'],
    summary: 'A slender tower that turns slightly floor by floor, rising from a finned stone podium.',
    concept: 'Each floor plate rotates by a small increment, producing a softly twisting silhouette that changes with the viewer’s position. A low stone podium with vertical fins grounds the tower and shapes a calm public forecourt.',
    approach: ['Incremental rotation to vary views and skyline profile', 'Podium scaled to the street, tower scaled to the horizon', 'Planted forecourt with a water feature'],
    materials: ['Unitised glass curtain wall', 'Limestone podium fins', 'Dark metal crown'],
    context: 'Imagined as a freestanding tower on an open plot.',
  },
  {
    slug: 'civic-hall', published: true, kind: 'concept', status: 'concept',
    title: 'Civic Hall Study', category: 'Institutional', typology: 'Civic / cultural building', location: 'Unspecified — conceptual', year: null,
    cover: 'render-civic-hall', gallery: ['render-civic-hall', 'render-civic-atrium'],
    summary: 'A glazed public hall sheltered beneath a single floating roof, flanked by solid wings.',
    concept: 'A broad roof plane and a slender colonnade define a generous public threshold. Behind it, a transparent hall brings daylight and visibility into the civic interior, while masonry wings house quieter functions.',
    approach: ['A clear, legible entrance sequence from stair to colonnade to hall', 'Wings with deep window reveals for shade and solidity', 'Reflecting pool and tree grid to compose the forecourt'],
    materials: ['Limestone', 'Dark metal roof edge', 'Glazed hall', 'Concrete podium'],
    context: 'Imagined on a landscaped civic plot with a processional approach.',
  },
  {
    slug: 'garden-pavilion', published: true, kind: 'concept', status: 'concept',
    title: 'Garden Pavilion Study', category: 'Public & Landscape', typology: 'Landscape pavilion', location: 'Unspecified — conceptual', year: null,
    cover: 'render-landscape-pavilion', gallery: ['render-landscape-pavilion', 'render-landscape-pavilion-close'],
    summary: 'A timber-roofed pavilion beside a reflecting pond, reached by stepping stones across the water.',
    concept: 'Terraced stone steps, a still pond and a lightweight pavilion form a quiet sequence. The slatted roof draws dappled light onto the platform, and slender bronze columns keep the structure visually light.',
    approach: ['Terraces that resolve level change as landscape', 'Stepping stones to make arrival an experience', 'Planting of birch and broadleaf trees for seasonal change'],
    materials: ['Limestone terraces', 'Timber roof slats', 'Bronze columns', 'Water'],
    context: 'Imagined as a public or private garden setting.',
  },
  {
    slug: 'light-filled-interior', published: true, kind: 'concept', status: 'concept',
    title: 'Double-Height Interior Study', category: 'Interiors', typology: 'Residential interior', location: 'Unspecified — conceptual', year: null,
    cover: 'render-interior-living', gallery: ['render-interior-living', 'render-interior-mezzanine'],
    summary: 'A double-height living space with a timber ceiling, floating stair and full-height garden glazing.',
    concept: 'The interior is conceived as one calm volume with a warm timber ceiling and a continuous glazed wall to the garden. A floating stair and a lightweight mezzanine add movement without interrupting the space.',
    approach: ['Warm material palette against pale plaster', 'Layered lighting: pendants, a floor lamp and a linear hearth', 'Furniture arranged as low, sculptural groupings'],
    materials: ['Oak flooring', 'Timber ceiling slats', 'Plaster', 'Stone and bronze accents'],
    context: 'Imagined as the principal living space of a private residence.',
  },
  {
    slug: 'hillside-retreat', published: true, kind: 'concept', status: 'concept',
    title: 'Hillside Retreat Study', category: 'Hospitality', typology: 'Resort villas', location: 'Unspecified — conceptual', year: null,
    cover: 'render-hospitality-resort', gallery: ['render-hospitality-resort', 'render-resort-suite'],
    summary: 'Terraced villas with private plunge pools stepping down a hillside toward the sea.',
    concept: 'Each villa occupies its own terrace, with a timber roof, a glazed living room and a private pool. The stepped arrangement gives every unit a sea view while preserving planting between buildings.',
    approach: ['Terraces follow the slope to limit earthworks', 'Roof overhangs for shade', 'Planting retained between units for privacy'],
    materials: ['Rendered walls', 'Timber roofs', 'Glazing', 'Planted terraces'],
    context: 'Imagined as a coastal hillside site.',
  },
  {
    slug: 'finned-facade', published: true, kind: 'concept', status: 'concept',
    title: 'Finned Façade Study', category: 'Commercial', typology: 'Façade detail', location: 'Unspecified — conceptual', year: null,
    cover: 'render-commercial-facade', gallery: ['render-commercial-facade', 'facade-fins'],
    summary: 'Vertical limestone fins and bronze slab edges as a rhythmic, shading skin for a workplace building.',
    concept: 'A closely spaced rhythm of limestone fins stands in front of the glazed wall, softening glare and giving the elevation depth that changes through the day. Bronze slab edges mark each floor.',
    approach: ['Fin depth and spacing tuned to sun angle', 'Slab edges as horizontal counterpoint', 'A façade that reads differently at every hour'],
    materials: ['Limestone fins', 'Bronze slab edges', 'Glazing'],
    context: 'Imagined as a mid-rise workplace façade.',
  },
];
export const getProject = (slug) => PROJECTS.find((p) => p.slug === slug && p.published);
export const related = (p, n = 3) => PROJECTS.filter((x) => x.published && x.slug !== p.slug).sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, n);
