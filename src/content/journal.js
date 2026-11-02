// DEMONSTRATION CONTENT: general design essays written as placeholders, NOT previously published articles, and not claims about completed work.
// Every article carries demo:true, so the interface says "Illustrative" instead of a date, and no author is shown (none is verified).
// When the practice publishes real writing: set demo:false, add a real `date` (and `author` only if verified), and replace `body`.
//
// body = structured blocks, so one template renders every article:
//   { t:'p', x }  paragraph · { t:'h2', x } section heading · { t:'quote', x } pull quote · { t:'list', items:[] }
//   { t:'figure', image, caption } full-width image · { t:'pair', items:[{ image, caption }, { image, caption }] } two images side by side
// Images come from the existing registry (src/content/images.js); captions only describe what the image shows.
export const ARTICLES = [
  { slug: 'light-as-a-building-material', demo: true, published: true, featured: true, date: '2026-09-15', category: 'Design thinking', tags: ['light', 'interiors', 'section', 'models', 'surfaces'], image: 'interior-living', project: 'light-filled-interior',
    caption: 'A conceptual double-height living space, with a timber ceiling and a wall of garden glazing.',
    title: 'The Quiet Power of Light', excerpt: 'How openings, depth and surface decide what a room feels like at noon and at dusk.',
    body: [
      { t: 'p', x: 'Daylight is the one material every building receives for free, and the one most easily wasted. A room is rarely remembered for its dimensions; it is remembered for the quality of light that crossed it.' },
      { t: 'h2', x: 'Begin in section' },
      { t: 'p', x: 'Designing with light begins in section. The height of a window head, the depth of a reveal and the colour of the surface that receives the light matter more than the size of the glass.' },
      { t: 'quote', x: 'The size of the window matters less than what the light lands on.' },
      { t: 'p', x: 'A deep reveal softens the edge between bright sky and dim wall, so the eye is not asked to adjust. A pale surface just inside the opening turns one window into a gentle wash across the room.' },
      { t: 'figure', image: 'interior-stair', caption: 'A conceptual interior with a floating stair and pendant lights, set against the glazing.' },
      { t: 'h2', x: 'Let the room change through the day' },
      { t: 'p', x: 'Morning light is low and cool and exaggerates texture; noon light is flat and bright; evening light is warm and long. Rooms that are used at a particular hour deserve openings placed for that hour.' },
      { t: 'p', x: 'Many designers test these decisions early with simple models and quick studies, because it is far easier to move a wall in a model than on site.' },
      { t: 'list', items: ['Which hour will this room be used most?', 'What will the light land on?', 'How deep is the opening, and what softens its edge?'] },
    ] },
  { slug: 'the-case-for-fewer-materials', demo: true, published: true, date: '2026-08-02', category: 'Materials', tags: ['materials', 'facade', 'ageing', 'surfaces'], image: 'facade-fins', project: 'finned-facade',
    caption: 'A conceptual facade of vertical limestone fins with bronze slab edges.',
    title: 'The Case for Fewer Materials', excerpt: 'Why a restrained palette tends to age better than a busy one.',
    body: [
      { t: 'p', x: 'A building made of three well-chosen materials tends to feel calmer than one made of ten. Repetition gives rhythm; restraint gives clarity.' },
      { t: 'h2', x: 'Weathering is part of the design' },
      { t: 'p', x: 'Stone, timber and metal each weather differently. Choosing them together means thinking about how the building will look in twenty years, not just on its opening day.' },
      { t: 'quote', x: 'Repetition gives rhythm; restraint gives clarity.' },
      { t: 'pair', items: [{ image: 'villa-detail', caption: 'A conceptual detail of a timber-slatted cantilever above a glazed ground floor.' }, { image: 'tower-plaza', caption: 'A conceptual study of two towers behind a finned stone podium.' }] },
      { t: 'h2', x: 'Fewer, but deliberate' },
      { t: 'p', x: 'A short palette does not mean a plain building. Texture, joint pattern and the way a surface meets the next carry the richness that extra materials would otherwise try to supply.' },
    ] },
  { slug: 'designing-the-threshold', demo: true, published: true, date: '2026-07-10', category: 'Landscape', tags: ['thresholds', 'landscape', 'arrival', 'light'], image: 'landscape-pavilion', project: 'garden-pavilion',
    caption: 'A conceptual timber-roofed garden pavilion above stepping stones.',
    title: 'Designing the Threshold', excerpt: 'The space between inside and outside is where architecture and landscape meet.',
    body: [
      { t: 'p', x: 'A terrace, a porch or a step across water: thresholds are where we slow down. They deserve the same attention as the rooms they connect.' },
      { t: 'h2', x: 'Three things a good threshold offers' },
      { t: 'list', items: ['Shade, so the pause is comfortable.', 'A place to pause, so arriving is not rushed.', 'A clear view of what lies beyond.'] },
      { t: 'quote', x: 'Thresholds are where we slow down.' },
      { t: 'figure', image: 'landscape-garden', caption: 'A conceptual landscape study with a reflecting pond and pavilion at sunset.' },
      { t: 'p', x: 'The best thresholds are rarely a single object. A change of paving, a canopy and the way planting frames the door work together to say: you are arriving.' },
    ] },
  { slug: 'models-before-renders', demo: true, published: true, date: '2026-06-01', category: 'Studio', tags: ['process', 'models', 'massing', 'section'], image: 'studio-model', project: 'civic-hall',
    caption: 'A conceptual white card massing model on a timber table.',
    title: 'Models Before Renders', excerpt: 'Why a simple white model still teaches more than a polished image.',
    body: [
      { t: 'p', x: 'A white card model has nowhere to hide. Proportion, massing and the relationship to the ground are all visible at a glance.' },
      { t: 'h2', x: 'Decide first, polish later' },
      { t: 'p', x: 'Polished imagery has its place, but designers often find it most useful after the big decisions have been tested in simple form.' },
      { t: 'quote', x: 'A white model has nowhere to hide.' },
      { t: 'figure', image: 'civic-front', caption: 'A conceptual civic hall beneath a floating roof slab.' },
      { t: 'p', x: 'A quick model can be turned in the hand, lit with a torch and cut open. Each of those small actions answers a question a rendered view would only suggest.' },
    ] },
];

// Short, original observations. ILLUSTRATIVE general design notes (not claims about the practice's work); shown with that label.
export const NOTES = [
  { n: 1, title: 'How morning light changes a room', text: 'Low eastern light rakes across surfaces and exaggerates texture; by noon the same wall reads flat. Rooms that matter at breakfast want their openings on the east.', image: 'villa-pool' },
  { n: 2, title: 'Texture and scale', text: 'A rough surface that feels lively on a small wall can feel heavy across a whole facade. Texture should be judged at the scale it will be seen.', image: 'facade-fins' },
  { n: 3, title: 'Why circulation shapes experience', text: 'Most of a building is spent moving through it. A pause, a change of light or a framed view along the way turns a route into a place.', image: 'interior-stair' },
  { n: 4, title: 'How a material ages', text: 'Timber silvers, bronze darkens, stone takes on water lines. Good detailing decides whether the change reads as patina or as damage.', image: 'villa-detail' },
  { n: 5, title: 'Between public and private', text: 'A step, a canopy or a change of floor tells people they are arriving. The gentler the threshold, the more welcoming the home.', image: 'civic-front' },
  { n: 6, title: 'Landscape and architecture', text: 'A pond, a line of trees or a terrace wall can decide how a building is approached long before the door is reached.', image: 'landscape-garden' },
];

export const getArticle = (s) => ARTICLES.find((a) => a.slug === s && a.published);
const wordsOf = (b) => (b.t === 'list' ? b.items.join(' ') : b.t === 'pair' || b.t === 'figure' ? '' : b.x || '');
export const readingTime = (a) => Math.max(1, Math.round(a.body.map(wordsOf).join(' ').split(/\s+/).filter(Boolean).length / 200));
export const categories = () => [...new Set(ARTICLES.filter((a) => a.published).map((a) => a.category))];
/** Related stories: shared tags count most, same category next; never unrelated filler. */
export const related = (a, n = 3) => ARTICLES.filter((x) => x.published && x.slug !== a.slug)
  .map((x) => ({ x, s: x.tags.filter((t) => a.tags.includes(t)).length * 2 + (x.category === a.category ? 1 : 0) + (x.project === a.project ? 1 : 0) }))
  .filter((r) => r.s > 0).sort((p, q) => q.s - p.s).slice(0, n).map((r) => r.x);
