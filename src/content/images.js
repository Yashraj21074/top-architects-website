// Image registry. All study renders are illustrative concept art; none depict completed TOP projects.
// Add responsive WebP files as <id>-800.webp, <id>-1400.webp and <id>-2400.webp in /public/img.
export const IMAGES = {
  'villa-dusk':         { alt: 'Conceptual study of a cantilevered white house with a timber screen at dusk', pos: '50% 55%' },
  'villa-pool':         { alt: 'Conceptual study of a glazed house and long pool in warm evening light', pos: '50% 50%' },
  'villa-detail':       { alt: 'Conceptual detail of a timber-slatted cantilever above a glazed ground floor', pos: '40% 50%' },
  'tower-low':          { alt: 'Conceptual study of a rotating glass tower seen from below', pos: '50% 40%' },
  'tower-plaza':        { alt: 'Conceptual study of two towers rising behind a finned stone podium', pos: '50% 55%' },
  'civic-front':        { alt: 'Conceptual study of a civic hall beneath a floating roof slab', pos: '50% 60%' },
  'civic-aerial':       { alt: 'Conceptual aerial study of a civic building with courtyard planting', pos: '50% 50%' },
  'interior-living':    { alt: 'Conceptual double-height living space with timber ceiling and garden glazing', pos: '50% 55%' },
  'interior-stair':     { alt: 'Conceptual interior with a floating stair and pendant lights', pos: '50% 50%' },
  'landscape-garden':   { alt: 'Conceptual landscape study with a reflecting pond and pavilion at sunset', pos: '50% 55%' },
  'landscape-pavilion': { alt: 'Conceptual timber-roofed garden pavilion above stepping stones', pos: '50% 50%' },
  'resort-hill':        { alt: 'Conceptual hillside hospitality study with terraced villas facing the sea', pos: '50% 50%' },
  'facade-fins':        { alt: 'Conceptual facade study of vertical limestone fins and bronze slab edges', pos: '55% 40%' },
  'render-villa-cantilever': { alt: 'Photorealistic conceptual render of a pale stone cantilever house beside a reflecting pool at dusk', pos: '50% 56%' },
  'render-villa-courtyard': { alt: 'Second conceptual render of the cantilever house courtyard, timber screen and shaded glass living room', pos: '50% 52%' },
  'render-villa-poolside': { alt: 'Poolside conceptual render of the cantilever house with garden terrace and broad floating roof', pos: '50% 55%' },
  'render-villa-entry': { alt: 'Arrival view of the conceptual cantilever house along a landscaped stone path to its sheltered entrance', pos: '50% 50%' },
  'render-villa-living': { alt: 'Conceptual interior view from the cantilever house lounge through glazing toward the garden pool', pos: '50% 50%' },
  'render-commercial-tower': { alt: 'Photorealistic conceptual render of a slender subtly rotating glass office tower above a stone podium', pos: '50% 45%' },
  'render-commercial-facade': { alt: 'Photorealistic conceptual render of a mid-rise workplace facade with vertical limestone fins', pos: '54% 42%' },
  'render-civic-hall': { alt: 'Photorealistic conceptual render of a transparent civic hall beneath a floating stone roof', pos: '50% 55%' },
  'render-civic-atrium': { alt: 'Interior conceptual render of the civic hall atrium opening to a planted courtyard', pos: '50% 52%' },
  'render-landscape-pavilion': { alt: 'Photorealistic conceptual render of a timber garden pavilion beside a reflecting pond', pos: '50% 55%' },
  'render-landscape-pavilion-close': { alt: 'Close conceptual render of timber canopy slats and stone stepping paths by the pond', pos: '50% 53%' },
  'render-interior-living': { alt: 'Photorealistic conceptual render of a double-height living room with oak ceiling and garden glazing', pos: '50% 53%' },
  'render-interior-mezzanine': { alt: 'Second conceptual render of the interior mezzanine and floating timber stair', pos: '50% 50%' },
  'render-hospitality-resort': { alt: 'Photorealistic conceptual render of terraced hillside resort villas looking toward the sea', pos: '50% 52%' },
  'render-resort-suite': { alt: 'Poolside conceptual render of a coastal resort villa framed by native planting', pos: '50% 53%' },
  'studio-model':       { alt: 'Conceptual study of a white card massing model on a timber table', pos: '50% 50%' },
};
export const IMG_W = [800, 1400, 2400];
export const imgSrc = (id, w = 1400) => `/img/${id}-${w}.webp`;
export const imgSrcSet = (id) => IMG_W.map((w) => `${imgSrc(id, w)} ${w}w`).join(', ');
