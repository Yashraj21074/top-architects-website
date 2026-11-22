// Frequently asked questions. `q` = example phrasings (the matcher is tolerant of different wording, typos and synonyms, so a few are enough).
// `a` = the answer, a string or a function (k) => string that is built from the verified content in `k` (kb + knowledge); never hard-code facts that live elsewhere.
// `offer` = an optional real page to offer. Add, edit or remove entries freely; no engine code changes are needed.
const names = (a) => (a.length <= 1 ? a[0] || '' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
export const FAQ = [
  { id: 'start', q: ['how do i start a project', 'how can i begin working with you', 'what is the first step', 'how do we get started'], offer: { dest: 'contact' },
    a: (k) => `It begins with a conversation. ${k.process[0].text} You can reach the studio on ${k.studio.contact.email}, and the Contact page has the phone numbers.` },
  { id: 'visit', q: ['can i visit the studio', 'where is your office', 'do you have an office', 'where can i meet you', 'can i come to your office'], offer: { dest: 'contact' },
    a: (k) => `The studio is at ${k.studio.contact.address.join(', ')}. I don’t have visiting hours, so please contact the team to arrange a time.` },
  { id: 'residential', q: ['do you design houses', 'do you do residential work', 'do you design homes', 'do you design villas'], offer: { dest: 'projects', category: 'Residential' },
    a: (k) => { const p = k.projects.filter((x) => x.category === 'Residential').map((x) => x.title); return p.length ? `Residential is one of the project types in the TOP portfolio: ${names(p)}. These are illustrative design explorations, not completed commissions. For a specific brief, please contact the studio.` : 'I don’t have residential projects to show at the moment. Please contact the studio.'; } },
  { id: 'visualization', q: ['can you make 3d renders', 'do you do renderings', 'do you make visualisations', 'can you produce images of a design'], offer: { dest: 'services', slug: 'visualization' },
    a: (k) => { const s = k.services.find((x) => x.slug === 'visualization'); return `${s.title}: ${s.lead}`; } },
  { id: 'portfolio', q: ['do you have a portfolio', 'can i see a portfolio', 'do you have examples of your work'], offer: { dest: 'projects' },
    a: (k) => `Yes. The TOP portfolio shows ${k.projects.length} design explorations across ${names(k.categories.map((c) => c.toLowerCase()))}. These are illustrative, not completed or commissioned projects.` },
  { id: 'location', q: ['do you work internationally', 'do you work abroad', 'do you take projects outside india', 'do you work in the uk'], offer: { dest: 'contact' },
    a: (k) => `I can’t confirm where the studio takes on projects. It lists contacts for ${names(k.studio.contact.phones.map((p) => p.label))}, so the best step is to get in touch.` },
  { id: 'philosophy', q: ['what is your design philosophy', 'what is your philosophy', 'what do you believe in', 'what makes you different', 'what is your design approach'], offer: { dest: 'process' },
    a: (k) => (k.knowledge.philosophy ? k.knowledge.philosophy : `I don’t have a formal philosophy statement to share. What I can tell you is how projects begin. ${k.knowledge.approach}`) },
  { id: 'social', q: ['do you have instagram', 'are you on social media', 'what is your linkedin', 'do you have a facebook page'], offer: { dest: 'contact' },
    a: (k) => (k.knowledge.social ? k.knowledge.social : 'I don’t have social media links available. The Contact page lists the email and phone numbers.') },
  { id: 'careers', q: ['are you hiring', 'do you have job openings', 'do you offer internships', 'how can i apply for a job'], offer: { dest: 'contact' },
    a: (k) => (k.knowledge.careers ? k.knowledge.careers : 'I don’t have information on openings. Please contact the studio directly.') },
  { id: 'journal', q: ['do you write articles', 'do you have a blog', 'what do you publish', 'where can i read your writing'], offer: { dest: 'journal' },
    a: (k) => `The journal has ${k.articles.length} short essays, illustrative for now: ${names(k.articles.map((x) => x.title))}.` },
];
