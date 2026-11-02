// Five confirmed services. Descriptions are deliberately brief and make no claims about specific deliverables.
// `projects` = related conceptual study slugs; `tag` = one-word summary used on the Services page.
export const SERVICES = [
  { slug: 'architecture', title: 'Architecture', tag: 'Building', image: 'villa-pool', projects: ['cantilever-house', 'civic-hall', 'rotating-tower'],
    lead: 'Architecture is the primary expression of the practice — shaping buildings through spatial planning, proportion, materiality, light and relationship to context.' },
  { slug: 'interior-design', title: 'Interior Design', tag: 'Space', image: 'interior-living', projects: ['light-filled-interior', 'cantilever-house'],
    lead: 'Interiors conceived as part of the architecture: material, light and space composed together.' },
  { slug: 'planning', title: 'Planning & Spatial Design', tag: 'Context', image: 'civic-aerial', projects: ['garden-pavilion', 'civic-hall', 'hillside-retreat'],
    lead: 'Site and spatial strategies that relate buildings to circulation, landscape and their wider context.' },
  { slug: 'visualization', title: 'Architectural Visualization', tag: 'Experience', image: 'tower-plaza', projects: ['rotating-tower', 'hillside-retreat', 'finned-facade'],
    lead: 'Images and models that communicate atmosphere, light and materiality.' },
  { slug: 'consultancy', title: 'Design Consultancy', tag: 'Direction', image: 'facade-fins', projects: ['finned-facade', 'rotating-tower'],
    lead: 'Design guidance across material selection, design development and architectural review.' },
];
export const getService = (s) => SERVICES.find((x) => x.slug === s);
