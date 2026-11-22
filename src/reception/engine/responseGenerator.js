import { kb, BLURB, resolveAction, project, service, article, inCategory } from './kb.js';
import { IDEAS, TOPIC_CATEGORY } from './ideas.js';
import { FAQ } from '../../content/faq.js';
import { KNOWLEDGE, NOT_AVAILABLE } from '../../content/knowledge.js';

/**
 * Rule-based response generation. Every reply is assembled from parts (acknowledgement + substance + at most one follow-up question) and each part is
 * chosen from several alternatives by the repetition guard, using the structured visitor context. Nothing here executes anything:
 * a reply only SUGGESTS an action; the manager validates it against the real site before the application acts on it.
 */
const go = (dest, extra = {}) => ({ type: 'navigate', dest, ...extra });
const NEXT = { about: ['projects', 'services'], projects: ['services', 'process'], services: ['process', 'projects'], process: ['contact', 'projects'], team: ['projects', 'journal'], journal: ['projects', 'about'], contact: ['projects', 'about'] };
const SHORT_LABEL = { about: 'the studio page', projects: 'the projects', services: 'the services', process: 'the process page', team: 'the founder’s page', journal: 'the journal', contact: 'the contact page' };
const the = (d) => SHORT_LABEL[d] || d;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (...p) => p.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
const N = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

export function makeGenerator({ ctx, guard, theme = 'day' }) {
  const s = ctx.s;
  const pick = (slot, c) => guard.choose(slot, c);
  const visited = (d) => s.visited.includes(d);
  const nextFor = (d) => (NEXT[d] || ['projects']).find((x) => !visited(x)) || (NEXT[d] || ['projects'])[0];
  const chipGo = (label, dest, extra) => ({ label, go: { dest, ...extra } });
  const chipSay = (label, say) => ({ label, say: say || label });
  const navChips = (dests) => dests.map((d) => chipGo(cap(the(d).replace(/^the /, '')), d));
  const T = (o) => ({ phase: 'answering', chips: [], ask: null, action: null, cue: null, delivery: 'calm', ...o });
  const turnLine = (spoken, o = {}) => T({ spoken, ...o });

  // ---------------------------------------------------------------------------------------------------------------------------- shared parts
  const agree = () => pick('ack.agree', [{ t: 'Of course.', cls: 'agree' }, { t: 'Certainly.', cls: 'agree' }, { t: 'Sure.', cls: 'agree' }, { t: 'Happy to.', cls: 'agree' }, { t: 'Good choice.', cls: 'agree' }, { t: 'Right, let’s do that.', cls: 'agree' }, { t: 'Gladly.', cls: 'agree' }]);
  const switched = () => pick('ack.switch', ['No problem, let’s change direction.', 'Of course, we can go that way instead.', 'Sure, let’s leave that and look at this.', 'Easily done.', 'Right, switching over.']);

  function offerTurn(topicOrAction, { label } = {}) {
    const a = topicOrAction; const r = resolveAction(a); if (!r) return null;
    return { action: a, label: label || r.label, r };
  }

  // ---------------------------------------------------------------------------------------------------------------------------- navigation
  function navTurn(action, { lead = null, mention = true } = {}) {
    const r = resolveAction(action); if (!r) return unknown();
    ctx.setFocus(action.slug && r.id === 'services' ? { type: 'service', id: action.slug, depth: 1 } : { type: 'page', id: r.id });
    const again = visited(r.id) && !action.slug && !action.category;
    let line;
    if (lead) line = lead;
    else if (action.slug) line = pick('nav.slug', [`I’ll open ${r.label} for you.`, `Let’s look at ${r.label}.`, `Here’s ${r.label}.`, `Opening ${r.label} now.`]);
    else if (action.category) { const n = inCategory(action.category).length; line = pick('nav.cat', [`I’ll open the ${action.category.toLowerCase()} section${n ? ` — ${N[n] || n} conceptual stud${n > 1 ? 'ies' : 'y'} to explore` : ''}.`, `Let’s look at the ${action.category.toLowerCase()} work.`, `Here are the ${action.category.toLowerCase()} studies.`]); }
    else if (again) line = pick('nav.again', [`Back to ${the(r.id)}, then.`, `Let’s take another look at ${the(r.id)}.`, `${cap(the(r.id))} again; I’ll open it now.`, `Reopening ${the(r.id)}.`]);
    else line = pick('nav.first.' + r.id, {
      about: ['Let’s start with the practice itself.', 'I’ll take you to the studio page.', 'The studio page is the right place for that.'],
      projects: ['I’ll open the project gallery.', 'Let’s look at the work.', 'The projects are a good place to begin.'],
      services: ['I’ll take you to the services.', 'Let’s see what the practice offers.', 'The services page lays it out clearly.'],
      process: ['I’ll show you how a project develops.', 'Let’s walk through the process.', 'The process page covers exactly that.'],
      team: ['I’ll open the founder’s page.', 'Let’s meet the person behind the practice.', 'That’s on the team page.'],
      journal: ['I’ll open the journal.', 'Let’s read a little.', 'The journal is the place for that.'],
      contact: ['I’ll take you to the contact page.', 'Let’s get you connected.', 'The contact page has what you need.'],
    }[r.id] || [`Opening ${r.label}.`]);
    const body = mention && !again && !action.slug && !action.category ? BLURB[r.id] : '';
    return T({ spoken: join(!lead && !again && !action.slug ? (guard.cls.slice(-2).includes('agree') || guard.maxSimilarity('Of course.', 2) > 0.5 ? '' : agree()) : '', line, body), action, phase: 'guiding', cue: 'nod', delivery: 'warm', intent: 'navigate' });
  }

  // ---------------------------------------------------------------------------------------------------------------------------- opening / return
  function describeExplored() {
    const ex = ctx.explored().filter((t) => t.dest);
    const dests = [...new Set(ex.map((t) => t.dest))];
    const last = ex[ex.length - 1] || s.lastVisit || (s.departure ? { dest: s.departure.dest, slug: s.departure.slug } : null);
    const title = last?.slug ? (last.dest === 'projects' ? project(last.slug)?.title : last.dest === 'services' ? service(last.slug)?.title : last.dest === 'journal' ? article(last.slug)?.title : null) : null;
    return { dest: last?.dest || null, slug: last?.slug || null, title: title || last?.title || null, dests, many: dests.length >= 3 };
  }
  function feedbackQuestion(x) {
    const T2 = x.title;
    const Q = {
      about: [`Welcome back. Did the studio page give you a clear picture of the practice, or is there something you’d like me to fill in?`, `You’re back. What did you make of the studio page?`, `Good to have you back. Was there anything on the studio page that caught your attention?`],
      projects: x.slug && T2 ? [`Welcome back. How did the ${T2} strike you?`, `You’re back. Was there something about ${T2} that held your attention?`, `Back from ${T2}. What did you make of it?`] : [`Welcome back. Did anything in the projects catch your eye?`, `You’re back. Which of the studies would you say stayed with you?`, `Good to have you back. Was there a project that stood out?`],
      services: x.slug && T2 ? [`You’re back. Did the ${T2} overview answer what you needed, or is there something I can clarify?`, `Welcome back. Was ${T2} what you were hoping to learn about?`] : [`You’re back. Did the services page answer what you needed, or is there something I can clarify?`, `Welcome back. Did the five services make sense as a set?`, `Good to have you back. Was there a service you wanted to hear more about?`],
      process: [`Welcome back. Did the process page make the journey clear?`, `You’re back. Was there a stage in the process you’d like to understand better?`, `Good to have you back. Did seeing the stages answer your questions?`],
      team: [`Welcome back. Did the founder’s page tell you what you wanted to know about the practice?`, `You’re back. Was there anything more you wanted to know about who leads the studio?`],
      journal: x.slug && T2 ? [`Welcome back. What did you think of “${T2}”?`, `You’re back. Did “${T2}” give you something to think about?`] : [`Welcome back. Did any of the journal pieces catch your interest?`, `You’re back. Was there an essay you enjoyed?`],
      contact: [`Welcome back. Did you find the way of getting in touch that you were looking for?`, `You’re back. Was the contact page what you needed?`],
    };
    const many = [`Welcome back. You’ve covered quite a lot. Is there anything that stayed with you?`, `You’re back, and you’ve seen a good part of the studio. What stood out most?`, `Good to have you back. Of everything you looked at, what caught your attention?`];
    const again = [`Back again. Anything from that last page you’d like to talk through?`, `Welcome back. How did that one sit with you?`, `Good to see you. Did that page raise any questions?`];
    const pool = x.many ? many : (s.receptions >= 3 && Q[x.dest] ? [...again, ...Q[x.dest]] : Q[x.dest] || many);
    return pick('open.return.' + (x.dest || 'any'), pool);
  }
  function open({ kind }) {
    const x = describeExplored();
    ctx.set('phase', kind === 'first' ? 'arrival' : 'returned');
    if (kind === 'first') {
      const day = theme === 'day';
      const first = pick('open.first', [
        day ? 'Good day, and welcome to TOP ARCHITECTS + PARTNERS.' : 'Good evening, and welcome to TOP ARCHITECTS + PARTNERS.',
        'Hello, and welcome in. This is TOP ARCHITECTS + PARTNERS.',
        'Welcome. You’ve found the reception of TOP ARCHITECTS + PARTNERS.',
        'Hello there. Welcome to the studio.',
      ]);
      const ask = pick('open.first.ask', ['Would you like a short introduction to the practice, or shall I take you straight to something specific?', 'I can introduce the practice, show you the projects, or leave you to look around. What suits you?', 'Is there something particular you’re curious about, or would you like me to suggest a place to start?']);
      ctx.asked('purpose');
      return T({ spoken: join(first, ask), phase: 'arrival', intent: 'open.first', cue: 'nod', delivery: 'warm', ask: { key: 'purpose', kind: 'purpose' },
        chips: [chipSay('Tell me about the practice'), chipGo('Show me the projects', 'projects'), chipSay('I have a project in mind'), chipSay('Just looking around')], pending: { kind: 'purpose' } });
    }
    if (kind === 'after_farewell') {
      return T({ spoken: join(pick('open.afterBye', ['Hello again.', 'Welcome back.', 'Good to see you again.']), pick('open.afterBye2', ['We can pick up wherever you like.', 'Is there something else you’d like to explore?', 'Where would you like to go this time?'])), phase: 'returned', intent: 'open.afterBye', cue: 'nod', chips: navChips([nextFor(s.lastVisit?.dest || 'about'), 'projects']).slice(0, 2).concat([chipSay('Just browsing')]), pending: { kind: 'choice' } });
    }
    if (kind === 'interrupted' && s.unfinished) {
      const t = s.unfinished.topic ? IDEAS[s.unfinished.topic]?.label : null;
      return T({ spoken: join(pick('open.interrupted', ['Welcome back; I think we were interrupted.', 'You’re back. We were in the middle of something.', 'Good to see you. I don’t think we finished that thought.']), t ? `We were talking about ${t}. Shall we carry on?` : 'Shall we carry on from there?'), phase: 'returned', intent: 'open.interrupted', ask: { key: 'resume', kind: 'offer' },
        chips: [chipSay('Yes, carry on', 'yes'), chipSay('Something else', 'something else')], pending: { kind: 'resume', topic: s.unfinished.topic || null } });
    }
    if (kind === 'returning') {
      const q = x.dest && ctx.canAsk('feedback.' + x.dest, 6) ? feedbackQuestion(x) : null;
      if (q) {
        ctx.asked('feedback.' + x.dest);
        const ch = x.dest === 'contact' ? [chipSay('Yes, thanks', 'yes'), chipSay('Not quite', 'not quite')]
          : [chipSay('It was useful', 'it was useful'), chipSay('Something stood out', 'something stood out'), chipSay('Not what I needed', 'it wasn’t what I was looking for')];
        return T({ spoken: q, phase: 'reflecting', intent: 'open.return', cue: 'nod', delivery: 'warm', ask: { key: 'feedback.' + x.dest, kind: 'feedback' }, chips: ch, pending: { kind: 'feedback', about: { dest: x.dest, slug: x.slug, title: x.title } } });
      }
      const nxt = nextFor(x.dest || 'about');
      return T({ spoken: join(pick('open.return.plain', ['Welcome back.', 'Good to have you back.', 'You’re back.']), pick('open.return.next', [`Shall I show you ${the(nxt)} next?`, `Where to now? ${cap(the(nxt))} might be a natural next step.`, `We can look at ${the(nxt)} or somewhere else entirely.`])), phase: 'next_steps', intent: 'open.return.plain', cue: 'nod',
        chips: [chipGo('Yes, show me', nxt), chipSay('Somewhere else', 'somewhere else'), chipSay('Just browsing')], pending: { kind: 'offer', action: go(nxt), why: 'it follows naturally from what you’ve already seen' } });
    }
    // revisit (reception reopened without leaving through a page) — continue, do not restart
    const interest = s.interests[s.interests.length - 1];
    const idea = interest && IDEAS[interest];
    return T({ spoken: join(pick('open.revisit', ['Back with us.', 'Welcome back.', 'Good to see you again.']), idea ? `Last time we were on ${idea.label}. Would you like to pick that up, or look at something new?` : pick('open.revisit2', ['Where would you like to go from here?', 'What would you like to look at?'])), phase: 'returned', intent: 'open.revisit', cue: 'nod', pending: { kind: 'choice' },
      chips: idea ? [chipSay('Pick that up', `tell me more about ${idea.label}`), chipSay('Something new', 'something else')] : navChips(['projects', 'services']) });
  }

  // ---------------------------------------------------------------------------------------------------------------------------- topics
  function explainTopic(topic, { lead = '' } = {}) {
    const idea = IDEAS[topic]; if (!idea) return unknown();
    const used = ctx.wasExplained(topic);
    let body;
    if (used) body = pick('topic.again.' + topic, [`We touched on ${idea.label} earlier, so here’s another angle. ${idea.explain[(s.explained.filter((t) => t === topic).length + 1) % idea.explain.length]}`, ...idea.explain.filter((e) => !guard.lines.some((l) => l.includes(e.slice(0, 40))))]);
    else body = pick('topic.' + topic, idea.explain);
    ctx.explain(topic); ctx.addInterest(topic); ctx.setFocus({ type: 'topic', id: topic });
    const cat = TOPIC_CATEGORY[topic]; if (cat) ctx.addInterest(cat);
    const q = idea.question, canQ = ctx.canAsk(q.key, 10);
    const offer = offerTurn(idea.offer);
    let spoken = join(lead, body), chips = [], pending = null, ask = null, action = null;
    if (canQ) {
      const qt = pick('ask.' + q.key, q.q); ctx.asked(q.key); guard.noteAsked(q.key, s.turn);
      spoken = join(spoken, qt); chips = q.options.map((o) => chipSay(o.label, o.say)); if (offer) chips.push(chipGo('Show me ' + offer.label.replace(/^the /, 'the '), idea.offer.dest, { slug: idea.offer.slug, category: idea.offer.category }));
      pending = { kind: 'focus', key: q.key, topic, offer: offer ? idea.offer : null }; ask = { key: q.key, kind: 'focus' };
    } else if (offer) {
      spoken = join(spoken, pick('offer.' + topic, [`I can open ${offer.label} if you’d like to see it.`, `${cap(offer.label)} would be a good place to see that in practice.`, `If it helps, I can show you ${offer.label}.`]));
      chips = [chipGo('Yes, show me', idea.offer.dest, { slug: idea.offer.slug, category: idea.offer.category }), chipSay('Not now', 'not now')]; pending = { kind: 'offer', action: idea.offer, why: `${offer.label} shows these ideas in a real study` };
    }
    return T({ spoken, phase: 'answering', intent: 'topic.' + topic, ask, chips: chips.slice(0, 4), pending, cue: 'tilt', delivery: 'warm', topic, generalKnowledge: true, action });
  }

  // ---------------------------------------------------------------------------------------------------------------------------- feedback
  function reactToFeedback(r, about) {
    const pol = r.polarity || 'neutral';
    const topic = r.topic && IDEAS[r.topic] ? r.topic : null;
    const wantsMore = /\b(understand|explain|clarify|more about|tell me|walk me|how does|what is|better)\b/.test(r.text);
    ctx.answer('feedback.' + (about?.dest || 'last'), pol);
    if (topic && (pol === 'positive' || wantsMore || pol === 'neutral') && !(pol === 'negative' && !wantsMore)) {
      const lead = wantsMore ? agree() : pick('react.pos.lead', [`That’s a thoughtful thing to notice.`, `Worth noticing, that.`, `That says something about how you look at buildings.`, `Good eye.`]);
      const t = explainTopic(topic, { lead });
      if (wantsMore && topic === 'planning') t.spoken = join(t.spoken.replace(/\s*(Is it|Would you)[^?]*\?\s*$/, ''), 'I can walk you through that stage, or show you the planning service page.');
      return { ...t, phase: 'reflecting' };
    }
    if (pol === 'negative') {
      ctx.asked('hoping');
      return T({ spoken: join(pick('react.neg', ['Thanks for telling me.', 'That’s fair, thank you for saying so.', 'I’m glad you said so.']), pick('react.neg2', ['Let’s try a different direction.', 'Let’s approach it differently.', 'We can take another route.']), pick('react.neg.q', ['What were you hoping to find: particular project types, design ideas, or information about the services?', 'What would have been more useful: seeing particular kinds of project, hearing about design ideas, or the services?'])),
        phase: 'next_steps', intent: 'react.negative', cue: 'tilt', delivery: 'calm', ask: { key: 'hoping', kind: 'focus' }, chips: [chipSay('Particular projects', 'project types'), chipSay('Design ideas', 'design ideas'), chipGo('The services', 'services')], pending: { kind: 'hoping' } });
    }
    if (pol === 'positive') {
      ctx.addInterest(about?.dest);
      const nxt = nextFor(about?.dest || 'about');
      const stood = ctx.canAsk('standout', 12);
      if (stood) { ctx.asked('standout');
        return T({ spoken: join(pick('react.pos', ['I’m glad it was useful.', 'Good, that’s what it’s there for.', 'Glad that worked for you.']), pick('react.pos.q', ['Was there one thing in particular that stood out?', 'Did anything in particular stay with you?'])), phase: 'reflecting', intent: 'react.positive', cue: 'nod', delivery: 'warm', ask: { key: 'standout', kind: 'focus' },
          chips: [chipSay('The materials', 'the materials'), chipSay('How spaces connect', 'the way the spaces connected'), chipSay('Not really', 'nothing in particular')], pending: { kind: 'standout' } }); }
      return T({ spoken: join(pick('react.pos.b', ['Glad to hear it.', 'Good to know.']), `${cap(the(nxt))} might be worth a look next. Shall I open it?`), phase: 'next_steps', intent: 'react.positive2', cue: 'nod', chips: [chipGo('Yes, show me', nxt), chipSay('Not now', 'not now')], pending: { kind: 'offer', action: go(nxt), why: 'it follows naturally from what you’ve seen' } });
    }
    // neutral / no feedback
    const nxt = nextFor(about?.dest || 'about');
    return T({ spoken: join(pick('react.neu', ['No problem at all.', 'That’s perfectly fine.', 'No need to have a verdict.']), pick('react.neu2', [`We can leave it there, or I can point you towards ${the(nxt)} if something comes to mind.`, `Browse as you like, or I can suggest ${the(nxt)} if you’d like a direction.`, `If you’d like a nudge, ${the(nxt)} is a natural next step. Otherwise, take your time.`])),
      phase: 'next_steps', intent: 'react.neutral', chips: [chipGo(cap(the(nxt).replace(/^the /, '')), nxt), chipSay('I’ll browse', 'just browsing'), chipSay('I’m done for now', 'goodbye')], pending: { kind: 'offer', action: go(nxt), why: 'it is the natural next step' } });
  }

  // ---------------------------------------------------------------------------------------------------------------------------- short replies in context
  function replyInContext(r) {
    const p = s.pending, k = r.shortKind;
    if (!p) {
      if (k === 'yes' || k === 'maybe' || k === 'show') return turnLine(pick('clar.noPending', ['Happy to, though I’m not sure which thing you mean. Where would you like to go?', 'Sorry, I’ve lost the thread. What would you like to look at?']), { intent: 'clarify', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: { kind: 'choice' } });
      if (k === 'no') return turnLine(pick('clar.no', ['That’s fine. Tell me if anything comes to mind.', 'No problem. I’ll leave you to it.']), { intent: 'clarify' });
      if (k === 'why') return turnLine('Sorry, why what? I can explain anything on the site if you tell me which part.', { intent: 'clarify' });
      if (k === 'back') return backTurn();
      if (k === 'skip') return turnLine(pick('skip', ['No problem, moving on. What would you like to see?', 'Of course. Where to?']), { intent: 'skip', chips: navChips(['projects', 'services']) });
      return turnLine('I’m not sure what you’d like. You can ask me a question, or choose a page from the list.', { intent: 'clarify', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: { kind: 'choice' } });
    }
    if (k === 'back') return backTurn();
    if (p.kind === 'purpose') {
      if (k === 'yes' || k === 'show') return explainPractice();
      if (k === 'maybe' || k === 'no') return browseTurn();
    }
    if (p.kind === 'offer' || p.kind === 'resume') {
      const a = p.kind === 'offer' ? p.action : (p.topic ? null : null);
      if (p.kind === 'resume') { if (k === 'yes' || k === 'show') { ctx.set('unfinished', null); return p.topic ? explainTopic(p.topic, { lead: agree() }) : turnLine('Where were we? Tell me what you’d like to look at.', { intent: 'clarify', chips: navChips(['projects', 'services']) }); } ctx.set('unfinished', null); return turnLine(pick('resume.no', ['Of course, we’ll start fresh. What would you like to look at?', 'No problem. Where would you like to go?']), { intent: 'clarify', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: { kind: 'choice' } }); }
      if (k === 'yes' || k === 'show') return navTurn(a);
      if (k === 'no') { ctx.clearPending(); const alt = nextFor(a?.dest || 'about'); return turnLine(join(pick('decl', ['No problem.', 'That’s fine.', 'Understood.']), pick('decl2', [`If you’d like something different, ${the(alt)} is another option.`, 'Take your time; I’ll be here if you want anything.', 'Let me know if there’s somewhere else you’d prefer.'])), { intent: 'decline', chips: [chipGo(cap(the(alt).replace(/^the /, '')), alt), chipSay('I’ll browse', 'just browsing')], pending: { kind: 'offer', action: go(alt), why: 'it’s another good way into the practice' } }); }
      if (k === 'maybe') return turnLine(join(pick('maybe', ['Take your time.', 'No hurry.']), `I can open ${a ? resolveAction(a)?.label : 'it'} now, or you can look around first.`), { intent: 'maybe', chips: [chipGo('Open it', a?.dest || 'projects', { slug: a?.slug, category: a?.category }), chipSay('I’ll look around', 'just browsing')], pending: p });
      if (k === 'why') return turnLine(join(`I suggested it because ${p.why || 'it connects with what you’ve been looking at'}.`, 'Would you like to see it?'), { intent: 'why', chips: [chipGo('Yes, show me', a?.dest || 'projects', { slug: a?.slug, category: a?.category }), chipSay('Not now', 'not now')], pending: p });
      if (k === 'not_that') return notThat(p);
    }
    if (p.kind === 'focus') {
      if (k === 'yes' || k === 'show') { const idea = IDEAS[p.topic]; return idea?.offer ? navTurn({ ...idea.offer }) : turnLine('Which would you prefer? Pick one of the options, or tell me in your own words.', { intent: 'clarify', pending: p }); }
      if (k === 'no') { ctx.clearPending(); return turnLine(pick('focus.no', ['That’s fine, we can leave it there.', 'No problem. We can come back to it.']), { intent: 'decline', chips: navChips(['projects', 'services']) }); }
      if (k === 'maybe') return turnLine(pick('focus.maybe', ['No need to decide. Either is a fine place to start.', 'That’s all right. We can start wherever you like.']) + ' ' + 'I can show you a study that illustrates it, if you’d prefer to see rather than hear.', { intent: 'maybe', chips: [IDEAS[p.topic]?.offer ? chipGo('Show me a study', IDEAS[p.topic].offer.dest, { slug: IDEAS[p.topic].offer.slug, category: IDEAS[p.topic].offer.category }) : chipGo('Projects', 'projects'), chipSay('Something else', 'something else')], pending: p });
      if (k === 'why') return turnLine('I ask so I can point you at the right part of the studio rather than everything at once. Tell me whichever is closer, or skip the question.', { intent: 'why', pending: p });
    }
    if (p.kind === 'feedback' || p.kind === 'standout') {
      if (k === 'yes') return reactToFeedback({ ...r, polarity: 'positive' }, p.about);
      if (k === 'no' && !/\b(not really|nothing|not particularly|no particular|not much)\b/.test(r.text)) return reactToFeedback({ ...r, polarity: 'negative' }, p.about);
      return reactToFeedback({ ...r, polarity: 'neutral' }, p.about);
    }
    if (p.kind === 'choice' || p.kind === 'hoping') {
      if (k === 'not_that') return notThat(p);
      if (k === 'why') return turnLine(pick('why.choice', ['I’m only offering a few places so you don’t have to guess where to start; you’re welcome to ask for anything else.', 'Just to give you somewhere to begin. You can ignore the options and ask me whatever you like.']), { intent: 'why', pending: p, chips: navChips(['projects', 'services', 'about']).slice(0, 3) });
      return turnLine(pick('clar.choice', ['Which would suit you better? Tell me which you’d prefer, or just ask me whatever you’re curious about.', 'I’m happy to go either way. Tell me which you’d prefer, or what interests you.']), { intent: 'clarify', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: p });
    }
    return turnLine('Tell me a little more and I’ll point you in the right direction.', { intent: 'clarify', pending: p });
  }
  function notThat(p) {
    const tried = [...(p.rejected || []), p.action?.dest].filter(Boolean);
    const alt = kb.dests.map((d) => d.id).filter((d) => d !== 'team' && !tried.includes(d)).sort((a, b) => visited(a) - visited(b))[0] || 'projects';
    return turnLine(join(pick('notthat', ['All right, how about something different.', 'Fair enough. Let’s try another route.', 'No problem. Here’s another idea.']), `${cap(the(alt))} is a different way into the practice. Would you like to see it?`), { intent: 'not_that', cue: 'tilt', chips: [chipGo('Yes, show me', alt), chipSay('Not that either', 'not that one')], pending: { kind: 'offer', action: go(alt), rejected: tried, why: 'it takes a different approach from the last one' } });
  }
  function backTurn() {
    const lv = s.lastVisit; const prev = [...s.trail].reverse().find((t) => t.dest && (!lv || t.dest !== lv.dest || t.slug !== lv.slug)) || lv;
    if (!prev) return turnLine('We’re still near the start, so there’s nowhere further back to go. Where would you like to begin?', { intent: 'back', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: { kind: 'choice' } });
    const a = go(prev.dest, prev.slug ? { slug: prev.slug } : {});
    return resolveAction(a) ? navTurn(a, { lead: pick('back', [`Back to ${prev.title || the(prev.dest)}, then.`, `Going back to ${prev.title || the(prev.dest)}.`, `Let’s return to ${prev.title || the(prev.dest)}.`]) }) : unknown();
  }

  // ---------------------------------------------------------------------------------------------------------------------------- intents
  function explainPractice() {
    const used = ctx.wasExplained('practice'); ctx.explain('practice'); ctx.answer('purpose', 'curious');
    const body = used
      ? pick('practice.again', ['In short: a founder-led practice working across architecture, interiors, planning, visualization and consultancy.', 'To recap, it’s a young, founder-led practice with five services.'])
      : pick('practice', [
        'TOP ARCHITECTS + PARTNERS is a founder-led practice established in 2026. It works across architecture, interiors, planning, visualization and design consultancy.',
        'It’s a founder-led architecture practice, established in 2026, covering architecture, interiors, planning, visualization and consultancy. The TOP portfolio shows illustrative design explorations, not completed commissions.',
        'The practice was established in 2026 and is led by its founder, Ar. Saurabh S Jadhav. Its five services are architecture, interior design, planning, visualization and consultancy.',
      ]);
    const q = pick('practice.q', ['Would you like to see what the services involve, browse the TOP portfolio, or meet the founder?', 'Where next: the TOP design explorations, the services, or how a project develops?']);
    ctx.asked('practice.next');
    return T({ spoken: join(body, q), phase: 'introducing', intent: 'curiosity', cue: 'nod', delivery: 'warm', ask: { key: 'practice.next', kind: 'choice' }, chips: [chipGo('Services', 'services'), chipGo('Projects', 'projects'), chipGo('The founder', 'team'), chipGo('Process', 'process')], pending: { kind: 'choice' } });
  }
  function browseTurn() {
    ctx.set('purpose', 'browsing'); ctx.answer('purpose', 'browsing');
    return T({ spoken: join(pick('browse', ['That’s perfectly fine; there’s no need to have a question in mind.', 'Please do. There’s no need to have a particular question.', 'Of course. Take your time.']), pick('browse2', ['We can start with the projects and see what catches your attention, or I can give you a quick introduction to the practice.', 'The projects are a good place to wander, or I can give you a short introduction first.', 'If you’d like somewhere to start, the projects are the most visual; otherwise just choose from the panel below.'])), phase: 'discovering', intent: 'browse', cue: 'nod',
      chips: [chipGo('Start with projects', 'projects'), chipSay('Quick introduction', 'tell me about the practice'), chipSay('I’ll browse alone', 'quiet')], pending: { kind: 'choice' } });
  }
  function unknown() {
    s.unknownStreak = (s.unknownStreak || 0) + 1;
    const first = s.unknownStreak < 2;
    const line = first ? pick('unk1', ['I’m not sure I caught that. Are you asking about the projects, the services, or how a project works?', 'Sorry, I didn’t quite follow. Would you like the projects, the services, or the process?']) : pick('unk2', [NOT_AVAILABLE, `${NOT_AVAILABLE} Otherwise I’m happy to walk you through the site.`]);
    return T({ spoken: line, intent: 'unknown', cue: 'tilt', chips: first ? navChips(['projects', 'services', 'process']) : [chipGo('Contact page', 'contact'), chipSay('About the practice', 'tell me about the practice'), chipGo('Projects', 'projects')], pending: { kind: 'choice' } });
  }

  function handle(r) {
    if (r.intent !== 'unknown') s.unknownStreak = 0;
    const hadPending = !!s.pending && !['reply', 'feedback'].includes(r.intent);
    const changed = hadPending && ['offer', 'resume'].includes(s.pending.kind) && ['go_dest', 'view_category', 'topic', 'show_project', 'service_detail', 'show_article', 'process'].includes(r.intent) && !(s.pending.action && s.pending.action.dest === r.dest);
    const withSwitch = (t) => (changed && t && t.spoken ? { ...t, spoken: join(switched(), t.spoken) } : t);
    switch (r.intent) {
      case 'empty': return turnLine('I’m listening. Ask me anything, or choose a page from the list.', { intent: 'empty' });
      case 'hello': return turnLine(join(pick('hello', ['Hello again.', 'Hi.', 'Hello.']), pick('hello2', ['What would you like to look at?', 'What can I show you?', 'What are you curious about?'])), { intent: 'hello', chips: navChips(['projects', 'services', 'about']).slice(0, 3) });
      case 'thanks': return turnLine(pick('thanks', ['You’re welcome.', 'My pleasure.', 'Glad to help.', 'Any time.']), { intent: 'thanks', cue: 'nod' });
      case 'help': return turnLine(pick('help', ['You can ask me about the practice, the services, how a project develops, or the TOP portfolio. I can also talk about ideas like light, materials and planning, or open any page from the list.', 'Ask me about the practice, a type of project, or an idea such as light or materials, and I’ll point you to the right page. The list of pages goes straight to any section.']), { intent: 'help', chips: [chipSay('The practice', 'tell me about the practice'), chipSay('Light and materials', 'how do you think about materials'), chipGo('Projects', 'projects')] });
      case 'farewell': { ctx.set('farewelled', true); ctx.clearPending(); return T({ spoken: pick('bye', ['Thank you for visiting. Enjoy exploring the rest of the site, and come back whenever you like.', 'It was a pleasure. If a question comes up later, just come back to the reception.', 'Take care. The studio will be here if you’d like to look around again.', 'I hope that gave you a useful picture of the practice. Goodbye for now.']), phase: 'farewell', intent: 'farewell', cue: 'nod', delivery: 'warm', farewell: true, chips: [chipGo('Home page', 'projects')].slice(0, 0) }); }
      case 'quiet': ctx.setPref('silent', true); return turnLine(pick('quiet', ['Understood. I’ll keep quiet and let you look around. Type if you’d like me to answer.', 'Of course. I’ll stay silent from here; just type or tap if you want something.']), { intent: 'quiet', delivery: 'silent', chips: navChips(['projects', 'services', 'about']).slice(0, 3).concat([chipSay('Speak again', 'speak again')]) });
      case 'unquiet': ctx.setPref('silent', false); return turnLine(pick('unquiet', ['Happy to talk again.', 'Voice is back on.']), { intent: 'unquiet', cue: 'nod' });
      case 'browse': return browseTurn();
      case 'curiosity': return explainPractice();
      case 'info': return info(r);
      case 'follow': return follow(r);
      case 'ambiguous': return ambiguousDesign();
      case 'faq': return faq(r);
      case 'inquiry': {
        ctx.set('purpose', 'project inquiry'); ctx.answer('purpose', 'inquiry'); const cat = r.category;
        if (cat) ctx.addInterest(cat);
        const have = cat ? `a ${cat === 'Interiors' ? 'interior' : cat.toLowerCase()} project` : null;
        if (!cat && ctx.canAsk('inquiry.type', 10)) { ctx.asked('inquiry.type');
          return T({ spoken: join(pick('inq', ['Thanks for telling me. There’s no pressure at this stage.', 'That’s good to hear, and there’s no need to commit to anything here.', 'Glad you mentioned it.']), pick('inq.q', ['What kind of project do you have in mind: a home, a larger building, an interior, or a landscape?', 'Is it a house, a larger building, an interior, or something outdoors?'])), phase: 'discovering', intent: 'inquiry', cue: 'tilt', ask: { key: 'inquiry.type', kind: 'focus' },
            chips: [chipSay('A home', 'a house'), chipSay('A larger building', 'a commercial building'), chipSay('An interior', 'an interior'), chipSay('Not sure yet', 'not sure yet')], pending: { kind: 'focus', key: 'inquiry.type', topic: null } }); }
        const act = cat ? go('projects', { category: cat }) : go('process');
        return T({ spoken: join(pick('inq2', ['Thanks for telling me.', 'That helps.', 'Understood.']), have ? `For ${have}, the related TOP design explorations are a helpful place to see how the practice thinks.` : '', `Every commission is different, and the process page outlines the stages a project typically moves through. For anything specific, the contact page has the studio’s email and phone numbers.`), phase: 'next_steps', intent: 'inquiry', cue: 'nod',
          chips: [chipGo('See the process', 'process'), cat ? chipGo('Related explorations', 'projects', { category: cat }) : chipGo('Projects', 'projects'), chipGo('Contact details', 'contact')], pending: { kind: 'offer', action: act, why: 'it shows how a project could unfold' } });
      }
      case 'unverified': {
        const topic = r.topic;
        const L = {
          attribution: ['I don’t have verified project attribution available here, and I wouldn’t want to give you the wrong name. The TOP portfolio shows design explorations rather than completed commissions, and I can help you explore them.'],
          fees: ['I don’t have verified information on fees, and I’d rather not guess. The contact page is the right route for that, and it lists the studio’s email and phone numbers.'],
          awards: ['I don’t have any verified awards to mention, so I won’t claim any. The TOP portfolio contains illustrative design explorations, not a list of completed commissions.'],
          clients: ['I don’t have verified client information to share. The TOP portfolio entries are illustrative design explorations rather than completed client commissions.'],
          size: ['What I can say reliably is that the practice is currently founder-led. I don’t have anything further on the size of the team.'],
          timeline: ['I don’t have verified timelines to share, because every project is different. The process page outlines the stages, and the studio can talk about timing once it knows the scope.'],
          other: [NOT_AVAILABLE],
        };
        const lines = L[topic] || L.other;
        return T({ spoken: join(pick('unv.' + topic, lines), pick('unv.alt', ['Would you like to see what I can show you instead?', 'In the meantime, I can walk you through what’s on the site.', ''])), intent: 'unverified', cue: 'tilt', delivery: 'calm',
          chips: [chipGo('Contact page', 'contact'), chipGo('Projects', 'projects'), chipGo('The founder', 'team')], pending: { kind: 'choice' } });
      }
      case 'show_project': return withSwitch(navTurn(go('projects', { slug: r.projectSlug })));
      case 'show_article': return withSwitch(navTurn(go('journal', { slug: r.articleSlug })));
      case 'service_detail': { ctx.addInterest(r.serviceSlug); return withSwitch(navTurn(go('services', { slug: r.serviceSlug }))); }
      case 'process': { ctx.explain('process'); return withSwitch(T({ ...navTurn(go('process'), { lead: pick('proc', [`Every commission is different, but it usually begins by listening, then the brief is tested against the site, concept, refinement, technical coordination and delivery. The process page lays out the stages.`, `A project typically moves from the first conversation through brief and discovery, concept, refinement and technical coordination to completion. I’ll open the process page so you can see each stage.`, `It starts with listening to your aspirations and the site, and develops through concept and refinement to delivery. Here’s the full sequence.`]), mention: false }), generalKnowledge: false })); }
      case 'view_category': {
        ctx.addInterest(r.category);
        const n = inCategory(r.category).length;
        if (!n) return turnLine(`The TOP portfolio doesn’t show any ${r.category.toLowerCase()} design explorations yet. I can show you another category instead.`, { intent: 'view_category', chips: [chipGo('All projects', 'projects')], pending: { kind: 'choice' } });
        return withSwitch(navTurn(go('projects', { category: r.category })));
      }
      case 'go_dest': {
        if (r.dest === 'projects' && ctx.canAsk('projects.category', 8) && s.pending?.key !== 'projects.category') {
          const fav = s.interests.find((i) => kb.categories.includes(i));
          ctx.asked('projects.category');
          if (fav) return T({ spoken: join(pick('proj.fav', ['Of course.', 'Certainly.', 'Gladly.']), `You mentioned ${fav.toLowerCase()} earlier, so I could start with those. Or I can show everything.`), phase: 'guiding', intent: 'projects.fav', cue: 'nod', ask: { key: 'projects.category', kind: 'choice' }, chips: [chipGo(`${fav} first`, 'projects', { category: fav }), chipGo('Show everything', 'projects')], pending: { kind: 'choice', key: 'projects.category' } });
          const cats = kb.categories.slice(0, 4);
          return T({ spoken: join(pick('proj.ask', ['Of course. The TOP portfolio is a good place to begin.', 'Gladly. The TOP design explorations each have their own page.']), pick('proj.ask2', [`Shall I open the projects page? Or tell me a type to start with: ${list(cats.map((c) => c.toLowerCase()))}.`, `I can open the projects page for you, or start with one type (${list(cats.map((c) => c.toLowerCase()))}). Which would you like?`])), phase: 'guiding', intent: 'projects.ask', cue: 'tilt', ask: { key: 'projects.category', kind: 'choice' }, chips: [...cats.slice(0, 3).map((c) => chipGo(c, 'projects', { category: c })), chipGo('Show everything', 'projects')], pending: { kind: 'offer', key: 'projects.category', action: go('projects'), why: 'it shows the design explorations by type' } });
        }
        ctx.clearPending(); return withSwitch(navTurn(go(r.dest)));
      }
      case 'topic': return withSwitch(explainTopic(r.topic));
      case 'reply': return replyInContext(r);
      case 'feedback': { const p = s.pending; return reactToFeedback(r, p?.about || { dest: s.lastVisit?.dest }); }
      default: return unknown();
    }
  }
  const list = (a) => (a.length <= 1 ? a[0] || '' : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1]);


  // ------------------------------------------------------------------------------------------------------------------ verified answers (information first, navigation only on request)
  const names = (a) => (a.length <= 1 ? a[0] || '' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const offerPage = (action, label) => ({ pending: { kind: 'offer', action, why: `it has the full detail on ${label}` }, ask: { key: 'offer.' + action.dest, kind: 'offer' } });
  function info(r) {
    const st = kb.studio, c = st.contact, dest = r.dest || 'about';
    let text, action = go(dest), label = the(dest);
    if (dest === 'services' && r.serviceSlug) { const sv = service(r.serviceSlug); text = `${sv.title}: ${sv.lead}`; action = go('services', { slug: sv.slug }); label = sv.title; }
    else if (dest === 'services') text = `The practice offers five services: ${names(kb.services.map((x) => x.title))}.`;
    else if (dest === 'about') text = `${st.intro} The TOP portfolio presents illustrative design explorations, not completed commissions.`;
    else if (dest === 'projects') { const cats = kb.categories.map((x) => x.toLowerCase()); text = `The TOP portfolio currently shows ${N[kb.projects.length] || kb.projects.length} illustrative design explorations across ${names(cats)}. They are not completed or commissioned projects.`; }
    else if (dest === 'process') text = `A project typically moves through six stages: ${names(kb.process.map((x) => x.title))}. Each is adapted to the scope, scale and appointment of the project.`;
    else if (dest === 'team') text = `${st.founder.name} is the ${st.founder.title}, and holds ${st.founder.qualification}. The practice is currently founder-led.`;
    else if (dest === 'journal') text = `The journal has ${N[kb.articles.length] || kb.articles.length} short essays, illustrative for now: ${names(kb.articles.map((x) => x.title))}.`;
    else if (dest === 'contact') {
      const ph = c.phones.map((p) => `${p.label}: ${p.number}`).join(', and ');
      if (r.topic === 'email') text = `You can email the studio at ${c.email}.`;
      else if (r.topic === 'phone') text = `The studio’s numbers are ${ph}.`;
      else if (r.topic === 'address') text = `The studio is at ${c.address.join(', ')}.`;
      else text = `You can email ${c.email}, or call ${ph}. The studio is in ${c.locationShort}.`;
      label = 'the contact details';
    } else text = `${st.intro}`;
    ctx.addInterest(r.serviceSlug || dest);
    if (r.serviceSlug) { const sv = service(r.serviceSlug); if (r.deep) text = join(text, relatedLine(sv)); ctx.setList({ type: 'services', ids: kb.services.map((x) => x.slug), label: 'services', at: kb.services.findIndex((x) => x.slug === sv.slug) }); ctx.setFocus({ type: 'service', id: sv.slug, depth: r.deep ? 1 : 0 }); }
    else if (dest === 'services') { ctx.setList({ type: 'services', ids: kb.services.map((x) => x.slug), label: 'services' }); ctx.setFocus({ type: 'services' }); }
    else if (dest === 'process') { ctx.setList({ type: 'stages', ids: kb.process.map((x) => x.key), label: 'stages' }); ctx.setFocus({ type: 'process' }); }
    else if (dest === 'projects') { ctx.setList({ type: 'categories', ids: kb.categories.slice(), label: 'project types' }); ctx.setFocus({ type: 'projects' }); }
    else if (dest === 'journal') { ctx.setList({ type: 'articles', ids: kb.articles.map((x) => x.slug), label: 'essays' }); ctx.setFocus({ type: 'journal' }); }
    else ctx.setFocus({ type: dest });
    const q = pick('info.q.' + dest, [`Would you like me to open ${label.startsWith('the ') || r.serviceSlug ? label : the(dest)}?`, `I can take you to ${r.serviceSlug ? label : the(dest)} if you’d like the full detail.`, `Shall I open ${r.serviceSlug ? label : the(dest)} for you?`]);
    return T({ spoken: join(text, q), phase: 'answering', intent: 'info.' + dest, cue: 'nod', delivery: 'warm', ...offerPage(action, label), cue2: null });
  }

  // ------------------------------------------------------------------------------------------------------------------ follow-ups, clarification, FAQ
  const relatedTitles = (sv) => (sv.projects || []).map((slug) => project(slug)).filter(Boolean);
  const relatedLine = (sv) => { const p = relatedTitles(sv); return p.length ? `Related studies include ${names(p.map((x) => x.title))}.` : ''; };
  const clarify = (kind) => {
    const q = { which: 'Which one do you mean? I can go through the services, the stages of the process, or the project types.', more: 'I’d be glad to say more. About what: the services, the projects, or how a project works?', examples: 'I can show examples through the projects page. Would you like me to open it?' }[kind];
    return T({ spoken: q, intent: 'clarify.' + kind, cue: 'tilt', ...(kind === 'examples' ? { pending: { kind: 'offer', action: go('projects'), why: 'the projects page shows the studies' } } : { pending: { kind: 'choice' } }) });
  };
  const offerOpen = (action, label) => ({ pending: { kind: 'offer', action, why: `it has the full detail on ${label}` }, ask: { key: 'offer.' + action.dest, kind: 'offer' } });
  function detail(type, id, { deep = false } = {}) {
    if (type === 'services') {
      const sv = service(id); if (!sv) return unknown();
      ctx.setFocus({ type: 'service', id: sv.slug, depth: 1 });
      return T({ spoken: join(`${sv.title}: ${sv.lead}`, relatedLine(sv), `Would you like me to open the ${sv.title} page?`), intent: 'follow.service', cue: 'nod', delivery: 'warm', ...offerOpen(go('services', { slug: sv.slug }), sv.title) });
    }
    if (type === 'stages') {
      const st = kb.process.find((x) => x.key === id); if (!st) return unknown(); ctx.setFocus({ type: 'stage', id: st.key });
      return T({ spoken: join(`Stage ${st.n}, ${st.title} (${st.subtitle}): ${st.text}`, deep ? st.details.join(' ') : '', 'Shall I open the process page so you can see every stage?'), intent: 'follow.stage', cue: 'nod', ...offerOpen(go('process'), 'the process') });
    }
    if (type === 'categories') return navTurn(go('projects', { category: id }));
    if (type === 'articles') { const a = article(id); if (!a) return unknown(); return T({ spoken: join(`${a.title}: ${a.excerpt}`, 'Shall I open it?'), intent: 'follow.article', ...offerOpen(go('journal', { slug: a.slug }), a.title) }); }
    return unknown();
  }
  function follow(r) {
    const ref = r.ref || {}, L = s.list, F = s.focus, P = s.pending;
    if (ref.ord != null) {
      if (P?.kind === 'disambig' && P.options?.[ref.ord === 'last' ? P.options.length - 1 : ref.ord]) { const o = P.options[ref.ord === 'last' ? P.options.length - 1 : ref.ord]; return o.type === 'process' ? info({ dest: 'process', text: '' }) : info({ dest: 'services', serviceSlug: o.id, text: '' }); }
      if (!L?.ids?.length) return clarify('which');
      const n = L.ids.length, cur = L.at ?? -1;
      const i = ref.ord === 'last' ? n - 1 : ref.ord === 'next' ? cur + 1 : ref.ord === 'prev' ? cur - 1 : ref.ord;
      if (i < 0 || i >= n) return T({ spoken: `There ${n === 1 ? 'is' : 'are'} only ${N[n] || n} ${L.label} listed, so I can’t go that far. Which one would you like to hear about?`, intent: 'clarify.range', cue: 'tilt', pending: { kind: 'choice' } });
      ctx.setList({ ...L, at: i }); return detail(L.type, L.ids[i], { deep: false });
    }
    if (ref.examples) {
      if (F?.type === 'service') { const sv = service(F.id), p = relatedTitles(sv); if (p.length) return T({ spoken: join(`Examples related to ${sv.title}: ${names(p.map((x) => `${x.title} (${x.category.toLowerCase()})`))}. These are TOP design explorations—illustrative conceptual designs, not completed commissions.`, `Would you like me to open ${p[0].title}?`), intent: 'follow.examples', cue: 'nod', ...offerOpen(go('projects', { slug: p[0].slug }), p[0].title) }); }
      if (F?.type === 'topic' && IDEAS[F.id]?.offer) { const o = resolveAction(IDEAS[F.id].offer); if (o) return T({ spoken: `A good example is ${o.label}. Shall I open it?`, intent: 'follow.examples', ...offerOpen(IDEAS[F.id].offer, o.label) }); }
      return clarify('examples');
    }
    if (ref.more) {
      if (!F) return clarify('more');
      if (F.type === 'service') { const sv = service(F.id); if (F.depth >= 1) return T({ spoken: join(`That’s everything I have on ${sv.title} here: ${sv.lead}`, relatedLine(sv), 'The services page has the full detail. Shall I open it?'), intent: 'follow.service.full', ...offerOpen(go('services', { slug: sv.slug }), sv.title) }); ctx.setFocus({ ...F, depth: 1 }); return detail('services', sv.slug); }
      if (F.type === 'services') return T({ spoken: `Which service would you like to hear more about: ${names(kb.services.map((x) => x.title))}?`, intent: 'clarify.which', cue: 'tilt', pending: { kind: 'choice' } });
      if (F.type === 'process') return T({ spoken: `Which stage would you like to hear more about: ${names(kb.process.map((x) => x.title))}?`, intent: 'clarify.which', cue: 'tilt', pending: { kind: 'choice' } });
      if (F.type === 'stage') return detail('stages', F.id, { deep: true });
      if (F.type === 'topic') return explainTopic(F.id);
      if (F.type === 'projects') return T({ spoken: join(`The studies are: ${names(kb.projects.map((x) => x.title))}.`, 'Would you like me to open the projects page?'), intent: 'follow.projects', ...offerOpen(go('projects'), 'the projects') });
      if (F.type === 'practice' || F.type === 'about') return T({ spoken: join(`${kb.studio.founder.intro} The practice offers ${names(kb.services.map((x) => x.title))}.`, 'Would you like to see the studio page?'), intent: 'follow.practice', ...offerOpen(go('about'), 'the studio') });
      if (F.type === 'team') return T({ spoken: join(kb.studio.founder.intro, 'The team page has the full profile. Shall I open it?'), intent: 'follow.team', ...offerOpen(go('team'), 'the founder') });
      if (F.type === 'contact') return info({ dest: 'contact', text: '', topic: null });
      if (F.type === 'journal') return T({ spoken: join(`The essays are: ${names(kb.articles.map((x) => x.title))}.`, 'Shall I open the journal?'), intent: 'follow.journal', ...offerOpen(go('journal'), 'the journal') });
      if (F.type === 'faq' || F.type === 'page') { const d = F.type === 'page' ? F.id : 'about'; return info({ dest: d, text: '' }); }
      return clarify('more');
    }
    return clarify('which');
  }
  function ambiguousDesign() {
    const options = [{ id: 'interior-design', type: 'service', label: 'Interior Design' }, { id: 'consultancy', type: 'service', label: 'Design Consultancy' }, { id: 'process', type: 'process', label: 'the design process' }];
    return T({ spoken: `Do you mean ${list(options.map((o) => o.label))}?`, intent: 'clarify.design', cue: 'tilt', pending: { kind: 'disambig', options } });
  }
  function faq(r) {
    const f = FAQ.find((x) => x.id === r.topic); if (!f) return unknown();
    const text = typeof f.a === 'function' ? f.a({ ...kb, knowledge: KNOWLEDGE }) : f.a; ctx.setFocus({ type: 'faq', id: f.id });
    const o = f.offer && resolveAction({ type: 'navigate', ...f.offer });
    return T({ spoken: o ? join(text, `Would you like me to open ${o.label.startsWith('the ') ? o.label : the(f.offer.dest)}?`) : text, intent: 'faq.' + f.id, cue: 'nod', delivery: 'warm', ...(o ? offerOpen({ type: 'navigate', ...f.offer }, o.label) : {}) });
  }

  // Free-text answers to a pending question that carry their own meaning ("planning", "the overall look", "a house"…)
  function answerFocus(r, p) {
    const t = r.text;
    const mapKey = { 'residential.focus': [[/planning|layout|arranged|rooms/, 'planning'], [/look|character|overall|form|feel|style|appearance/, 'materials']], 'planning.focus': [[/site|context/, 'context'], [/room|layout|arranged/, 'circulation']], 'windows.focus': [[/view/, 'windows'], [/daylight|light/, 'light'], [/look/, 'materials']], 'light.focus': [[/home/, 'residential'], [/larger|building|tall/, 'commercial']], 'materials.focus': [[/timber|warm|wood/, 'interiors'], [/stone|hard/, 'commercial']], 'inquiry.type': [[/house|home|villa|residen/, 'residential'], [/commercial|larger|office|tower|building/, 'commercial'], [/interior/, 'interiors'], [/landscape|garden|outdoor/, 'landscape'], [/not sure|don't know|unsure/, null]] }[p.key];
    const hit = mapKey?.find(([re]) => re.test(t));
    if (!hit) return null;
    ctx.answer(p.key, t);
    if (hit[1] === null) return turnLine(join(pick('nosure', ['That’s completely fine.', 'No problem; plenty of people start there.']), 'The process page shows how a project usually begins, and there’s no need to decide anything yet.'), { intent: 'inquiry.unsure', chips: [chipGo('See the process', 'process'), chipGo('Browse projects', 'projects')], pending: { kind: 'choice' } });
    if (p.key === 'inquiry.type') { const t2 = explainTopic(hit[1], { lead: pick('inq.ack', ['Good to know.', 'Thanks, that helps.']) }); return t2; }
    return explainTopic(hit[1], { lead: pick('focus.ack', ['Right, then.', 'That helps.', 'Good, let’s go that way.']) });
  }

  // After "what were you hoping to find?": projects / design ideas / services / the practice
  function answerHoping(r) {
    const t = r.text; ctx.answer('hoping', t);
    if (/project|type|work|portfolio|study|studies/.test(t)) return handle({ ...r, intent: 'go_dest', dest: 'projects' });
    if (/service|offer/.test(t)) return navTurn(go('services'), { lead: pick('hope.s', ['Then the services page is the place to start.', 'Let’s look at the services, then.']) });
    if (/idea|design|think|approach|material|light|space/.test(t)) {
      const topic = r.topic || [...s.interests].reverse().find((i) => IDEAS[i]) || 'materials';
      return explainTopic(topic, { lead: pick('hope.i', ['Then let’s talk about the ideas themselves.', 'In that case, here’s how I’d put it.']) });
    }
    if (/practice|studio|about|who/.test(t)) return explainPractice();
    return null;
  }
  function cancelNav() {
    return T({ spoken: pick('cancel', ['No problem. Where else would you like to go?', 'That’s fine. Tell me what you’d prefer, or choose a page from the list.', 'Of course, we’ll hold off. What would you like to see instead?']), intent: 'cancel', phase: 'answering', chips: navChips(['projects', 'services', 'about']).slice(0, 3), pending: { kind: 'choice' } });
  }
  return { open, handle, answerFocus, answerHoping, unknown, navTurn, explainTopic, cancelNav };
}
