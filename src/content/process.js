// The six-stage journey, in order. Stages can vary with project scope and appointment; set `offered:false` to hide one.
// `image` files live in /public/img/process/ (the originals supplied by the client; stages 1–5 also have smaller .webp variants). Stage 6 is the client's final render, served unaltered.
// `details` describe what a stage MAY involve in general terms: they make no claim about any specific project, approval or consultant.
export const PROCESS_NOTE = 'Every commission is different. The stages below describe a typical journey and are adapted to the scope, scale and appointment of each project.';
export const PROCESS_INTRO = 'Every project begins with an idea. Through careful listening, creative exploration and technical development, we shape that idea into a considered architectural vision. Each stage is adapted to the project’s requirements, scale and scope of appointment.';
const NOTE = 'Illustrative image of this stage of the design process.';
export const PROCESS = [
  { n: '01', key: 'brief', title: 'Initial Conversation', subtitle: 'Understanding the Client', text: 'We listen first: your aspirations, the site, the timing and how the building should feel to use.', offered: true,
    image: { file: 'image-1', ext: 'png', w: 1672, h: 941, alt: 'A white architectural model of a curved, multi-storey building on a stone table with site plans, a rendered view and material samples, beneath the TOP Architects + Partners logo on a stone wall.', note: NOTE },
    details: ['An open conversation about your aspirations, priorities and how the building should feel to use.', 'A first look at the site and its setting, and any constraints you already know about.', 'An early understanding of the timing and the scope of appointment you are considering.'] },
  { n: '02', key: 'context', title: 'Brief & Discovery', subtitle: 'Defining the Project', text: 'The brief is shaped and tested against the site, context, regulations and budget.', offered: true,
    image: { file: 'image-2', ext: 'png', w: 1671, h: 941, alt: 'The building model surrounded by site plans, context studies, a terrain model, photographs and material samples on a stone table, with a TOP Architects + Partners folder.', note: NOTE },
    details: ['Gathering the information the project depends on: the site, its context, the regulations and the budget.', 'Testing the brief against those realities and refining what the building needs to do.', 'Agreeing a clear direction before design work begins.'] },
  { n: '03', key: 'concept', title: 'Concept Development', subtitle: 'Creating the Architectural Vision', text: 'A central architectural idea is explored through sketches, models and images.', offered: true,
    image: { file: 'image-3', ext: 'png', w: 1672, h: 941, alt: 'A large white model of the curved building on a plinth, with concept sketches, smaller massing models and a presentation board behind it.', note: NOTE },
    details: ['Exploring one central architectural idea through sketches, physical models and images.', 'Testing form, spatial experience and identity before committing to a direction.', 'Presenting the work so the idea can be discussed and chosen together.'] },
  { n: '04', key: 'development', title: 'Design Refinement', subtitle: 'Perfecting the Details', text: 'Plans, sections, materials and details are refined together with you.', offered: true,
    image: { file: 'image-4', ext: 'png', w: 1672, h: 941, alt: 'The building model beside a typical floor plan, a section, a south elevation, facade details and a board of glass, composite, metal and stone samples.', note: NOTE },
    details: ['Developing plans, sections, materials and details together with you.', 'Resolving how the building fits together, inside and out.', 'Moving from an initial concept towards a more considered, coherent design.'] },
  { n: '05', key: 'documentation', title: 'Technical Coordination', subtitle: 'Preparing for Construction', text: 'Drawings and information are coordinated with consultants for approval and construction.', offered: true,
    image: { file: 'image-5', ext: 'png', w: 1672, h: 941, alt: 'A floor plan, section and curtain-wall junction detail laid out beside the building model and a monitor showing a three-dimensional model.', note: NOTE },
    details: ['Coordinating drawings and information with consultants.', 'Preparing information for approval and for construction.', 'The extent of this work depends on the scope of appointment.'] },
  { n: '06', key: 'completion', title: 'Delivery & Completion', subtitle: 'Bringing the Vision to Life', text: 'Where appointed, support continues through construction to handover.', offered: true,
    image: { file: 'image-6', ext: 'jpeg', w: 1414, h: 1600, original: true, alt: 'An architectural render of the white, sculptural building: curved canopies and slender supports, glazed floors, a waterfront terrace and planting.', note: 'Architectural render of the design vision. It is not a photograph of a completed building.' },
    details: ['Where appointed, support continues through construction to handover.', 'The extent of involvement depends on the scope agreed for each project.'] },
];
