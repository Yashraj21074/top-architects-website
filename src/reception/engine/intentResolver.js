import { norm } from './text.js';
import { prep } from './fuzzy.js';
import { canonicalize } from './synonyms.js';
import { FAQ } from '../../content/faq.js';
import { contentWords } from './text.js';
import { kb } from './kb.js';

/**
 * Rule-based language understanding (no network, no model). Produces:
 *  { intent, shortKind, topic, dest, category, serviceSlug, projectSlug, articleSlug, polarity, quiet, text }
 * The CURRENT message always wins over the planned dialogue: explicit requests (a page, a project type, a topic) are recognised first,
 * and only genuinely short replies ("yes", "why?", "not that one"…) are read in relation to the question that is pending.
 */
const SHORT = [
  ['yes', /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|sounds good|do that|why not|that works|let's do it|lets do it|definitely|of course|please do|yes please)\b/],
  ['no', /^(no|nope|nah|not really|no thanks|no thank you|not now|not today|not yet|i'd rather not|pass)\b/],
  ['maybe', /^(maybe|perhaps|not sure|i guess|i suppose|dunno|don't know|hmm+|possibly|could be|either|i don't mind|whatever)\b/],
  ['show', /^(show me|show|take me|let's see|lets see|open it|open that|go there|go on|let me see|go for it|take me there)\b/],
  ['why', /^(why|why is that|why's that|how come|what do you mean|meaning|how so|what for)\b/],
  ['not_that', /^(not that|not that one|something else|another|a different|different one|another one|anything else|other options|show me another|no not that)\b/],
  ['back', /^(go back|back|previous|previous page|return|take me back|the last one|go to the last)\b/],
  ['skip', /^(skip|skip it|next|move on|never mind|nevermind|forget it|pass on that)\b/],
  ['repeat', /^(repeat|say that again|again|pardon|come again|what was that|sorry\?|say again|could you repeat|can you repeat)\b/],
];
const DEST = [
  ['about', /\b(studio page|about us|about the (studio|practice|firm)|who are you|your practice|the practice|the firm|the studio|your studio|your story|history|established)\b/],
  ['projects', /\b(project|projects|portfolio|your work|the work|gallery|studies|case stud|see (some|your) (work|projects))\b/],
  ['services', /\b(services?|what do you (do|offer)|what you offer|offerings|disciplines)\b/],
  ['process', /\b(process|stages?|how (does|do) (a|the|your) project|how (a|your) project|timeline|brief to|from brief|first meeting|step by step|workflow|how you work)\b/],
  ['team', /\b(team|founder|principal|saurabh|jadhav|architect behind|who (runs|leads|founded)|staff|people)\b/],
  ['journal', /\b(journal|articles?|essays?|blog|read(ing)?|writing|notes)\b/],
  ['contact', /\b(contact|email|e-mail|phone|call you|reach (you|the studio)|address|get in touch|where are you|located|location|(your|the|studio|head) office|visit you|meet you)\b/],
];
const CATEGORY = [
  ['Residential', /\b(residential|residence|house|houses|home|homes|villa|villas|private (house|home)|family home)\b/],
  ['Commercial', /\b(commercial|office (buildings?|towers?|blocks?|projects?|design)|towers?|high-?rise|mixed-?use|skyscraper)\b/],
  ['Institutional', /\b(institutional|civic|public building|cultural|museum|hall|government|school|college)\b/],
  ['Hospitality', /\b(hospitality|resort|resorts|hotel|hotels|retreat|retreats|holiday)\b/],
  ['Public & Landscape', /\b(landscape|garden|gardens|pavilion|park|public space|outdoor)\b/],
  ['Interiors', /\b(interior|interiors|furniture|living room|bedroom|room design|fit-?out)\b/],
];
const TOPIC = [
  ['windows', /\b(windows?|where (the )?windows|openings?|glazing|facade|façade|fenestration)\b/],
  ['light', /\b(light|lighting|daylight|sunlight|sun path|shadow|glare|natural light)\b/],
  ['materials', /\b(materials?|stone|timber|wood|concrete|metal|bronze|limestone|finish|finishes|texture|textures|palette|surface)\b/],
  ['circulation', /\b(circulation|flow|connect(ed|ion|s)?|moving (through|between)|spaces? (connect|flow)|layout|corridor|staircase|stairs?|sequence|arrival|entrance|entry)\b/],
  ['planning', /\b(planning|master ?plan|zoning|site plan|spatial|programme|program(me)?)\b/],
  ['threshold', /\b(threshold|porch|terrace|veranda|verandah|balcony|between (inside|indoors) and (outside|outdoors))\b/],
  ['context', /\b(context|site conditions?|orientation|climate|plot|neighbou?rhood|surroundings)\b/],
  ['brief', /\b(brief|first conversation|requirements|from idea|concept development|how .* develops?)\b/],
  ['interiors', /\b(interior|interiors|furniture|decor|décor)\b/],
  ['residential', /\b(residential|house|home|villa)\b/],
  ['commercial', /\b(commercial|towers?|office (buildings?|towers?|blocks?))\b/],
  ['hospitality', /\b(hospitality|resort|hotel|retreat)\b/],
  ['landscape', /\b(landscape|garden|pavilion|outdoor)\b/],
];
const SERVICE_SLUG = [['architecture', /\barchitecture service|\bbuilding design\b|\bdo you (do|offer|provide) architecture\b|\barchitecture(?= (design|work))/], ['interior-design', /\binterior design\b/], ['planning', /\bplanning (and|&) spatial|spatial design|\bplanning service\b/], ['visualization', /\bvisuali[sz]ation|renders?|3d images?|rendering\b/], ['consultancy', /\bconsultancy|consulting|design review|advice\b/]];
const FEELING = {
  pos: /\b(lov(e|ed|ing)|like[sd]?|enjoy(ed)?|great|good|nice|useful|helpful|beautiful|impressive|interesting|stood out|favou?rite|amazing|brilliant|fantastic|liked|clear|informative|elegant|lovely)\b/,
  neg: /\b(boring|confusing|confused|disappoint(ed|ing)?|unhelpful|useless|poor|lacking|too basic|meh|not (very )?(useful|helpful|great|good|clear|what|quite)|wasn't|isn't|didn't|did not|doesn't|not what i|nothing useful|couldn't find|can't find|hard to)\b/,
  neutral: /\b(nothing in particular|no feedback|not really|no comment|nothing really|fine|okay|ok|alright|so-so|nothing specific|not much)\b/,
};
const SPEC = {
  farewell: /\b(bye|goodbye|good bye|see you|see ya|take care|that's all|thats all|i'm done|im done|i am done|that will be all|i'm leaving|im leaving|have to go|got to go|gotta go|talk later|catch you later|cheerio)\b/,
  thanks: /^(thanks|thank you|thank u|thx|cheers|much appreciated|appreciate it)\b/,
  hello: /^(hi|hello|hey|good (morning|afternoon|evening)|namaste|greetings|howdy)\b/,
  help: /\b(what can (you|i)|help me|how does this work|what do you (know|do here)|options|what (should|can) i (ask|do)|anything you can)\b/,
  browse: /\b(just (want to |wanna |going to |gonna )?(look|looking|browse|browsing|explore|exploring|have a look|having a look)|look(ing)? around|browsing|have a (look|wander)|wander|no particular|nothing in particular|i'll (just )?(browse|explore)|let me (look|browse|explore)|don't need (help|anything)|on my own|quietly|without (talking|speaking))\b/,
  quiet: /\b(be quiet|stop talking|no voice|mute|silent(ly)?|without (voice|sound|speaking|talking)|text only|don't speak|do not speak|don't talk)\b/,
  unquiet: /\b(speak again|unmute|voice on|talk again|you can speak|turn (the )?voice on)\b/,
  inquiry: /\b(my (own )?(project|plot|house|home|building|site|land|business)|i('m| am) (planning|building|renovating|looking to (build|design|renovate))|i want to (build|design|renovate)|i have a (plot|site|project|house)|looking for an architect|hire|commission|work with you|work together|quote|estimate|appointment|consultation|new project|build a)\b/,
  curiosity: /\b(tell me (about|more)|what (is|are) (this|you|top)|about (the )?(practice|you|your|top)|introduce|who is top|what('s| is) top architects|overview)\b/,
  process_q: /\b(how (does|do|did) (a )?(project|it|the process|things) (progress|work|go|develop|start)|from brief|what happens (after|when)|stages|phases)\b/,
  materials_q: /\b(materials?|spatial design|space and light|texture|light and shadow|how do you (choose|pick|decide))\b/,
  unverified: /\b(who designed|who is the architect of|attribution|which architect|price|pricing|cost|fees?|charge|how much|budget|award|awards|won any|clients?|completed projects|years of experience|how long (does|will|would|is) (a|the|my|your)? ?(project|it|design|work|process)? ?take|timelines?|turnaround|delivery time|deadline|revenue|turnover|profit|funding|investors?|shareholders?|registration number|history of (the )?(firm|studio|company|practice)|company history|how many (staff|people|employees|architects|projects)|team size|employees|salary|registered|licensed|coa number|portfolio of built|built projects|where (was|is) (this|that|it) (built|located)|when was (this|it) (built|completed))\b/,
  who_designed: /\b(who designed|who is the architect|who was the architect|designed by)\b/,
};
const fb = (t) => {
  const neg = FEELING.neg.test(t), pos = FEELING.pos.test(t), neu = FEELING.neutral.test(t);
  const negated = /\b(not|n't|never|no)\s+(really\s+|very\s+|that\s+)?(like|love|enjoy|liked|loved|good|great|useful|helpful|clear)/.test(t);
  if (negated || (neg && !pos)) return 'negative';
  if (pos && !neg) return 'positive';
  if (neu) return 'neutral';
  return null;
};
const first = (list, t) => list.find(([, re]) => re.test(t))?.[0] || null;
const lastOf = (list, t) => { let best = null, pos = -1; for (const [k, re] of list) { const m = re.exec(t); if (m && m.index >= pos) { best = k; pos = m.index; } } return best; };

export function resolveIntent(raw, ctx = null) {
  const text = canonicalize(prep(raw)); const words = text.split(' ').filter(Boolean);   // normalise → expand slang → fix typos → synonyms to one canonical question
  const out = { intent: 'unknown', ref: null, deep: false, shortKind: null, topic: null, dest: null, category: null, serviceSlug: null, projectSlug: null, articleSlug: null, polarity: null, quiet: null, text, raw: String(raw || '') };
  if (!text) { out.intent = 'empty'; return out; }
  // entities (always extracted: the latest message decides where we go, whatever the plan was)
  out.dest = lastOf(DEST, text);
  // people and contact details win over an incidental "the studio" in the same sentence ("who leads the studio?", "where is the studio located?")
  if (/\b(team|founder|principal|saurabh|jadhav|who (runs|leads|founded|owns|heads)|who is (the )?(architect|head|principal|boss))\b/.test(text) && !/\b(contact|reach|touch|call|email|phone|speak|talk)\b/.test(text)) out.dest = 'team';
  else if (/\b(e-?mail|phone (number)?|telephone|address|located|location|how (do|can) i (contact|reach))\b/.test(text)) out.dest = 'contact'; out.category = lastOf(CATEGORY, text); out.topic = first(TOPIC, text);
  out.serviceSlug = first(SERVICE_SLUG, text);
  out.projectSlug = kb.projects.find((p) => text.includes(norm(p.title).replace(' study', '')) || text.includes(p.slug.replace(/-/g, ' ')))?.slug || null;
  out.articleSlug = kb.articles.find((a) => text.includes(norm(a.title)) || text.includes(a.slug.replace(/-/g, ' ')))?.slug || null;
  out.polarity = fb(text);
  const ref0 = refOf(text);
  const short = words.length <= 5 && !ref0.examples && !ref0.more && ref0.ord == null ? first(SHORT, text) : null;
  const pending = ctx?.pending;

  if (SPEC.unquiet.test(text)) return { ...out, intent: 'unquiet', quiet: false };
  if (SPEC.quiet.test(text)) return { ...out, intent: 'quiet', quiet: true };
  if (SPEC.farewell.test(text) && words.length <= 9 && !out.dest) return { ...out, intent: 'farewell' };
  if (SPEC.thanks.test(text) && words.length <= 4) return { ...out, intent: 'thanks' };
  // answers to a pending question take priority when they are short or clearly respond to it
  if (pending && short && words.length <= 4 && !out.dest && !out.category && !out.topic) return { ...out, intent: 'reply', shortKind: short };
  const explicitNav = /\b(show|see|view|look|open(?! (an?|new|another) )|take me|go to|visit|explore|browse|let's|lets|can i see)\b/.test(text) && !!(out.dest || out.category || out.projectSlug || out.serviceSlug || out.articleSlug);
  if (pending && pending.kind === 'feedback' && !explicitNav) return { ...out, intent: 'feedback', polarity: out.polarity || 'neutral' };
  if (short && !pending && words.length <= 3) return { ...out, intent: 'reply', shortKind: short };
  // explicit requests
  if (SPEC.who_designed.test(text)) return { ...out, intent: 'unverified', topic: 'attribution' };
  if (SPEC.unverified.test(text)) return { ...out, intent: 'unverified', topic: /\b(price|pricing|cost|fees?|charge|how much|budget)\b/.test(text) ? 'fees' : /\b(award|won)\b/.test(text) ? 'awards' : /\b(client)\b/.test(text) ? 'clients' : /\b(timelines?|how long|turnaround|delivery time|deadline)\b/.test(text) ? 'timeline' : /\b(staff|people|employees|team size|how many)\b/.test(text) ? 'size' : 'other' };
  if (SPEC.inquiry.test(text)) return { ...out, intent: 'inquiry' };
  if (out.projectSlug) return { ...out, intent: 'show_project' };
  if (out.articleSlug) return { ...out, intent: 'show_article' };
  // ---- references to the conversation so far: "the second one", "tell me more", "show me some examples", "can you explain that?"
  const ref = refOf(text); out.ref = ref; out.deep = !!ref.more;
  const named = !!(out.serviceSlug || out.projectSlug || out.articleSlug || out.category || out.topic);
  if (ref.ord != null && !named) return { ...out, intent: 'follow' };
  if ((ref.more || ref.examples) && !named && !(out.dest && !ref.deictic && !/^(tell me more|more)\b/.test(text))) return { ...out, intent: 'follow' };
  if (words.length <= 3 && /\bdesign\b/.test(text) && !named && !out.dest) return { ...out, intent: 'ambiguous', topic: 'design' };
  if (SPEC.browse.test(text)) return { ...out, intent: 'browse' };
  const isQ = /\?/.test(String(raw)) || /^(what|which|how|who|where|when|why|tell me|do you|does your|can you|could you|is there|are there|i'?d like to (know|hear|learn|understand)|i want to (know|learn))\b/.test(text);
  const wantsNav = /\b(show|take me|open(?! (an?|new|another) )|go to|visit|bring me|let me see|see (the|your|some|it)|(i'?d|i would) like to (see|explore|browse|view|look)|can i see|explor(e|ing)|browse|view|look at|navigate|go there)\b/.test(text);
  const aspect = /\be-?mail\b/.test(text) ? 'email' : /\b(phone|call|number|mobile|telephone)\b/.test(text) ? 'phone' : /\b(address|where|located|location|office)\b/.test(text) ? 'address' : null;
  const faq = matchFaq(text); if (faq && !wantsNav) return { ...out, intent: 'faq', topic: faq.id };
  if (out.dest === 'contact' && aspect && !wantsNav) return { ...out, intent: 'info', topic: aspect };
  if (!out.serviceSlug && isQ && !wantsNav && !out.dest) { if (/\binteriors?\b/.test(text)) out.serviceSlug = 'interior-design'; else if (/\b(planning|spatial design)\b/.test(text) && /\b(offer|provide|service|do you do)\b/.test(text)) out.serviceSlug = 'planning'; }
  if (out.serviceSlug && isQ && !wantsNav) return { ...out, intent: 'info', dest: 'services' };
  if (out.serviceSlug && !out.dest) return { ...out, intent: 'service_detail', dest: 'services' };
  if (out.dest && out.dest !== 'about' && isQ && !wantsNav && !SPEC.curiosity.test(text.replace(/^tell me about/, 'about'))) return { ...out, intent: 'info' };
  const wantsSee = /\b(show|see|view|look|open|take me|go to|visit|explore|browse|let's|lets|i'd like to see|i would like to see|can i see)\b/.test(text);
  if (out.dest === 'process' || SPEC.process_q.test(text)) return { ...out, intent: isQ && !wantsNav ? 'info' : 'process', dest: 'process' };
  if (out.category && (wantsSee || /\b(project|projects|portfolio|work)\b/.test(text))) return { ...out, intent: 'view_category' };
  if (out.dest && (wantsSee || words.length <= 4)) return { ...out, intent: 'go_dest' };
  if (out.category && out.category !== 'Interiors') return { ...out, intent: out.category.toLowerCase().replace(/ & .*/, '') === 'public' ? 'topic' : 'topic', topic: out.topic || catTopic(out.category) };
  if (out.category === 'Interiors') return { ...out, intent: 'topic', topic: 'interiors' };
  // "tell me about …": the practice itself → introduction; a named page → that page; a named idea → that idea
  if (out.dest && out.dest !== 'about' && SPEC.curiosity.test(text)) return { ...out, intent: wantsNav ? 'go_dest' : 'info' };
  if (SPEC.curiosity.test(text) && !out.topic && !(out.dest === 'about' && /\bpage\b/.test(text))) return { ...out, intent: 'curiosity' };
  if (out.topic || SPEC.materials_q.test(text)) return { ...out, intent: 'topic', topic: out.topic || 'materials' };
  if (out.dest === 'about' && !/\bpage\b/.test(text) && SPEC.curiosity.test(text)) return { ...out, intent: 'curiosity' };
  if (out.dest) return { ...out, intent: 'go_dest' };
  if (short) return { ...out, intent: 'reply', shortKind: short };
  if (SPEC.help.test(text)) return { ...out, intent: 'help' };
  if (SPEC.hello.test(text) && words.length <= 4) return { ...out, intent: 'hello' };
  if (out.polarity && words.length <= 12) return { ...out, intent: 'feedback' };
  if (isQ && words.length >= 4 && /\b(you|your|firm|studio|practice|company|architects?)\b/.test(text)) return { ...out, intent: 'unverified', topic: 'other' };
  return out;
}
const catTopic = (c) => ({ Residential: 'residential', Commercial: 'commercial', Hospitality: 'hospitality', 'Public & Landscape': 'landscape', Interiors: 'interiors', Institutional: 'circulation' }[c]);
export { DEST, CATEGORY, TOPIC };

// ---- conversation references --------------------------------------------------------------------------------------------------------
const ORD = [[/\b(first|1st|number one|no 1)\b/, 0], [/\b(second|2nd|number two|no 2)\b/, 1], [/\b(third|3rd|number three|no 3)\b/, 2], [/\b(fourth|4th|number four)\b/, 3], [/\b(fifth|5th|number five)\b/, 4], [/\b(last|final)\b/, 'last'], [/\b(next|another one)\b/, 'next'], [/\b(previous|one before|before that)\b/, 'prev']];
const MORE = /\b(tell me more|more (about|on|detail|details|information|info)|go on|elaborate|expand|explain( that| it| this| further| more)?|can you explain|what do you mean|in more detail|further|more please)\b/;
const EXAMPLES = /\b(examples?|show me some|samples?|for instance|case stud(y|ies)|like what|such as)\b/;
function refOf(text) { const o = ORD.find(([re]) => re.test(text)); return { ord: o ? o[1] : null, more: MORE.test(text), examples: EXAMPLES.test(text), deictic: /\b(that|it|this|those|them|these)\b/.test(text) }; }
// ---- FAQ matching: tolerant of wording (typos and synonyms are already resolved), scored on shared content words ----------------------------
const faqWords = FAQ.map((f) => ({ f, sets: f.q.map((q) => new Set(contentWords(canonicalize(prep(q))))) }));
function matchFaq(text) {
  const t = new Set(contentWords(text)); if (t.size < 2) return null; let best = null, bs = 0;
  for (const { f, sets } of faqWords) for (const q of sets) { let i = 0; for (const w of q) if (t.has(w)) i++; const dice = (2 * i) / (q.size + t.size); if (i >= 2 && dice > bs) { bs = dice; best = f; } }
  return bs >= 0.62 ? best : null;
}
