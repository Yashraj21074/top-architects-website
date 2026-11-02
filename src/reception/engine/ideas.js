// GENERAL architectural ideas the receptionist can talk about. These are general design knowledge, not claims about TOP ARCHITECTS + PARTNERS' work;
// the generator introduces them accordingly ("In general…", "As a rule…") and only links to pages that really exist (offer → resolveAction).
// Each topic: explain[] = alternative explanations (1–3 sentences, spoken aloud) · question = one relevant follow-up with answer chips · offer = a real page to open.
export const IDEAS = {
  light: {
    label: 'light and daylight',
    explain: [
      'Daylight changes everything about a room: the same space feels calm at noon and warm at dusk. Where the openings sit, how deep the reveals are and what the light lands on matter more than the size of the glass.',
      'In general, designers think about light in section as much as in plan: the height of a window head, the depth of a reveal, the colour of the surface that catches the sun.',
      'A room is rarely remembered for its dimensions; it is remembered for how light crossed it. So light is usually decided early, long before finishes are chosen.',
    ],
    question: { key: 'light.focus', q: ['Are you thinking about natural light in a home, or in a larger building?', 'Is daylight in a home your interest, or in larger buildings?'], options: [{ label: 'In a home', say: 'in a home' }, { label: 'Larger buildings', say: 'in larger buildings' }] },
    offer: { type: 'navigate', dest: 'projects', slug: 'light-filled-interior', label: 'the double-height interior study' },
  },
  windows: {
    label: 'windows and openings',
    explain: [
      'It depends on several things: the orientation of the building, the quality of daylight, privacy, views and how each room will be used. Those decisions work best when they’re considered together rather than as a purely visual choice.',
      'Usually it starts with what each room needs: morning light for a kitchen, a framed view for a living space, privacy for a bedroom. The façade then becomes the sum of those answers.',
      'As a rule, the best positions come from the sun path, the view and the street, in that order. Shade and glare are worked out alongside, not afterwards.',
    ],
    question: { key: 'windows.focus', q: ['Is it the view you’re after, the daylight through the day, or the look of the building?', 'Which matters most to you: the view, the daylight, or how it looks from outside?'], options: [{ label: 'The view', say: 'the view' }, { label: 'Daylight', say: 'daylight' }, { label: 'The look', say: 'the look of it' }] },
    offer: { type: 'navigate', dest: 'projects', slug: 'cantilever-house', label: 'the Cantilever House study' },
  },
  materials: {
    label: 'materials',
    explain: [
      'Materials set the atmosphere before anything else does. Stone, timber and metal each behave differently in light and weather, and the combination decides whether a space feels calm or busy.',
      'In general, a restrained palette tends to age better than a busy one. Repetition gives rhythm, and how a material will look in twenty years matters as much as its first day.',
      'Texture and scale work together: a rough surface reads very differently on a small wall than across a whole façade, and light picks out the grain differently each hour.',
    ],
    question: { key: 'materials.focus', q: ['Are you drawn more to the warmth of timber, or to stone and harder surfaces?', 'Which do you find yourself noticing more: warm timber, or stone and harder finishes?'], options: [{ label: 'Timber and warmth', say: 'timber and warm finishes' }, { label: 'Stone and harder finishes', say: 'stone and harder finishes' }] },
    offer: { type: 'navigate', dest: 'projects', category: 'Interiors', label: 'the interior studies' },
  },
  circulation: {
    label: 'circulation and how spaces connect',
    explain: [
      'Circulation is how you move through a building, and it shapes the experience more than people expect. When spaces connect naturally, a building feels easy to use without anyone noticing why.',
      'In general, good planning gives the route its own quality: a pause, a change of light, a view ahead. A corridor that is only a corridor is usually a missed opportunity.',
      'A clear sequence from arrival to the main spaces makes a building legible. People should be able to feel where they are going before they can see it.',
    ],
    question: { key: 'circulation.focus', q: ['Would you rather see how circulation works in a civic building, or in a home?', 'Are you more curious about circulation in a civic building, or in a home?'], options: [{ label: 'A civic building', say: 'a civic building' }, { label: 'A home', say: 'a home' }] },
    offer: { type: 'navigate', dest: 'services', slug: 'planning', label: 'the planning service' },
  },
  planning: {
    label: 'planning',
    explain: [
      'Planning is where the brief, the site and the practical constraints start coming together. Get that stage right and the architecture that follows has something solid to stand on.',
      'In general it means relating a building to circulation, landscape and its wider context, so it fits the place as well as the programme.',
      'A good plan balances what the client needs with what the site allows: orientation, access, neighbours and levels all have a say.',
    ],
    question: { key: 'planning.focus', q: ['Is it the site and context that interests you, or how the rooms are arranged?', 'Are you more interested in how a building relates to its site, or how the rooms are arranged?'], options: [{ label: 'Site and context', say: 'site and context' }, { label: 'Room layout', say: 'how rooms are arranged' }] },
    offer: { type: 'navigate', dest: 'services', slug: 'planning', label: 'the planning service' },
  },
  residential: {
    label: 'residential design',
    explain: [
      'Residential architecture is especially interesting because the building has to work beautifully in everyday life, not just in photographs.',
      'A home is judged over years: mornings, evenings, seasons. So the design usually starts with how the household will actually live there.',
      'In general, a house balances privacy and openness, and the best ones make the garden or terrace feel like another room.',
    ],
    question: { key: 'residential.focus', q: ['Are you more curious about how the spaces are planned, or how the overall architectural character develops?', 'Does the layout matter most to you, or the look and feel of the house?'], options: [{ label: 'How spaces are planned', say: 'planning' }, { label: 'The overall character', say: 'the overall look' }] },
    offer: { type: 'navigate', dest: 'projects', category: 'Residential', label: 'the residential studies' },
  },
  commercial: {
    label: 'commercial and tall buildings',
    explain: [
      'Commercial buildings have to satisfy two scales at once: the street, where people walk past, and the skyline, where the whole form reads.',
      'In general, the base grounds a tall building and the upper floors express its identity. Efficient floor plates and good daylight tend to matter as much as the silhouette.',
    ],
    question: { key: 'commercial.focus', q: ['Are you interested in how a tower meets the street, or in the form against the skyline?'], options: [{ label: 'Meeting the street', say: 'the street' }, { label: 'The skyline', say: 'the skyline form' }] },
    offer: { type: 'navigate', dest: 'projects', category: 'Commercial', label: 'the commercial study' },
  },
  interiors: {
    label: 'interior design',
    explain: [
      'Interiors work best when they are conceived with the architecture, so material, light and space are composed together instead of added afterwards.',
      'In general, a calm palette, layered lighting and a few well-placed pieces do more than a lot of decoration.',
    ],
    question: { key: 'interiors.focus', q: ['Is it the materials, the lighting, or the overall mood that you’re drawn to?'], options: [{ label: 'Materials', say: 'materials' }, { label: 'Lighting', say: 'lighting' }] },
    offer: { type: 'navigate', dest: 'services', slug: 'interior-design', label: 'the interior design service' },
  },
  hospitality: {
    label: 'hospitality design',
    explain: [
      'Hospitality design is about arrival and atmosphere: how a place feels the moment you step in, and how the rooms open to a view or a landscape.',
      'In general, a good retreat works with its terrain, so the buildings follow the land rather than fight it.',
    ],
    question: { key: 'hospitality.focus', q: ['Is it the landscape setting you’re interested in, or the guest experience inside?'], options: [{ label: 'The setting', say: 'the setting' }, { label: 'The guest experience', say: 'the guest experience' }] },
    offer: { type: 'navigate', dest: 'projects', category: 'Hospitality', label: 'the hospitality study' },
  },
  landscape: {
    label: 'landscape and architecture',
    explain: [
      'Landscape and architecture shape each other. A terrace, a pond or a line of trees can decide how a building is approached and how it feels from inside.',
      'In general, the most convincing projects treat the building and its ground as one composition rather than a building placed on a plot.',
    ],
    question: { key: 'landscape.focus', q: ['Would you like to see a garden pavilion study, or hear more about how outdoor spaces are planned?'], options: [{ label: 'The pavilion study', say: 'the pavilion' }, { label: 'How outdoor spaces are planned', say: 'how outdoor spaces are planned' }] },
    offer: { type: 'navigate', dest: 'projects', category: 'Public & Landscape', label: 'the landscape studies' },
  },
  threshold: {
    label: 'thresholds',
    explain: [
      'A threshold is the space between inside and outside, public and private. It is where people slow down, so it deserves the same attention as the rooms it joins.',
      'In general, a good threshold offers shade, somewhere to pause and a view of what lies beyond.',
    ],
    question: { key: 'threshold.focus', q: ['Are you thinking of an entrance, or a terrace between house and garden?'], options: [{ label: 'An entrance', say: 'an entrance' }, { label: 'A terrace', say: 'a terrace' }] },
    offer: { type: 'navigate', dest: 'journal', slug: 'designing-the-threshold', label: 'the illustrative essay on thresholds' },
  },
  context: {
    label: 'site and context',
    explain: [
      'The site comes first. Its orientation, levels, neighbours and climate all push the design in certain directions, and good architecture listens to that.',
      'In general, a building should look as though it belongs where it stands, which usually means starting from the ground rather than the image.',
    ],
    question: { key: 'context.focus', q: ['Is it a particular kind of site you have in mind, such as a city plot or a landscape setting?'], options: [{ label: 'City plot', say: 'a city plot' }, { label: 'Landscape setting', say: 'a landscape setting' }] },
    offer: { type: 'navigate', dest: 'services', slug: 'planning', label: 'the planning service' },
  },
  brief: {
    label: 'how a project develops',
    explain: [
      'Every commission is different, but it usually begins by listening: aspirations, the site, the timing, how the building should feel to use. The brief is then tested against the site, context, regulations and budget.',
    ],
    question: { key: 'brief.focus', q: ['Would you like to walk through the stages, or hear about the early conversation first?'], options: [{ label: 'Walk through the stages', say: 'the stages' }, { label: 'The first conversation', say: 'the first conversation' }] },
    offer: { type: 'navigate', dest: 'process', label: 'the process page' },
  },
};
export const TOPIC_IDS = Object.keys(IDEAS);
// Topics that are also project categories.
export const TOPIC_CATEGORY = { residential: 'Residential', commercial: 'Commercial', hospitality: 'Hospitality', landscape: 'Public & Landscape', interiors: 'Interiors' };
