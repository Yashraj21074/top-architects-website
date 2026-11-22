import test from 'node:test';
import assert from 'node:assert/strict';
import { mk, say, visit, seeded } from './helpers.mjs';
import { deriveArrival } from '../src/reception/engine/conversationManager.js';
import { MemoryStorage, VisitorContext } from '../src/reception/engine/visitorContext.js';
import { resolveIntent } from '../src/reception/engine/intentResolver.js';
import { RepetitionGuard } from '../src/reception/engine/repetitionGuard.js';
import { resolveAction, kb } from '../src/reception/engine/kb.js';
import { prepareSpeech, mapBoundary, similarity } from '../src/reception/engine/text.js';
import { DESTINATIONS } from '../src/content/destinations.js';

// ---------------------------------------------------------------------------------------------------------------- intent detection
test('intent: example phrases from the brief resolve correctly', () => {
  const r = (t, ctx) => resolveIntent(t, ctx);
  assert.equal(r("I'm interested in how you approach residential design").topic, 'residential');
  assert.equal(r("I'd like to see some of your projects").dest, 'projects');
  assert.equal(r("I'm just looking around").intent, 'browse');
  assert.equal(r('I just want to look around').intent, 'browse');
  assert.equal(r('How do you decide where the windows should go?').topic, 'windows');
  assert.equal(r('Actually, can I see the interiors instead?').intent, 'view_category');
  assert.equal(r('How does a project progress from brief to completion?').intent, 'info');
  assert.equal(r('show me the process').intent, 'process');
  assert.equal(r('Who designed this particular project?').intent, 'unverified');
  assert.equal(r('I have a plot and want to build a house').intent, 'inquiry');
  assert.equal(r('goodbye').intent, 'farewell');
  assert.equal(r('Show me the Cantilever House').intent, 'show_project');
});
test('intent: short replies are read against the pending question, not in isolation', () => {
  const pend = { pending: { kind: 'offer' } };
  for (const [t, k] of [['yes', 'yes'], ['no', 'no'], ['maybe', 'maybe'], ['show me', 'show'], ['why?', 'why'], ['not that one', 'not_that'], ['go back', 'back']]) assert.equal(resolveIntent(t, pend).shortKind, k, t);
  assert.equal(resolveIntent('yes', pend).intent, 'reply');
});

// ---------------------------------------------------------------------------------------------------------------- Test A / B / C / D: first visit and returns
test('A: first visit — asks about the practice, remembers residential, opens a real project category', () => {
  const { m } = mk();
  const o = m.open(); assert.equal(o.arrival, 'first'); assert.match(o.spoken, /TOP ARCHITECTS \+ PARTNERS|studio/i);
  const t1 = say(m, "I'm interested in how you approach residential design");
  assert.ok(m.state.interests.includes('Residential') && m.state.interests.includes('residential'));
  assert.match(t1.spoken, /home|house|residential|household/i); assert.ok(t1.spoken.includes('?'));
  const t2 = say(m, 'planning'); assert.match(t2.spoken, /plan|site|brief/i);
  const t3 = say(m, "I'd like to see some of your projects");
  assert.match(t3.spoken, /residential/i, 'remembers the stated interest');
  const t4 = say(m, 'Residential'); assert.equal(t4.resolved.route, '/projects?category=Residential');
});
test('B: return from a visit references what was explored instead of restarting the welcome', () => {
  const { m } = mk(); m.open();
  const nav = say(m, 'show me the Cantilever House'); assert.equal(nav.resolved.route, '/projects/cantilever-house');
  m.noteDeparture(nav); visit(m, '/projects/cantilever-house');
  const back = m.open(); assert.equal(back.arrival, 'returning');
  assert.match(back.spoken, /Cantilever House/); assert.doesNotMatch(back.spoken, /welcome to top architects/i);
  assert.equal(back.pending.kind, 'feedback'); assert.ok(back.chips.length >= 2);
});
test('C: positive feedback about interiors leads to interiors content and a real interior route', () => {
  const { m } = mk(); m.open(); const nav = say(m, 'show me the services'); m.noteDeparture(nav); visit(m, '/services'); m.open();
  const t = say(m, 'I liked the interiors and the stone and wood finishes');
  assert.match(t.spoken, /material|stone|timber|texture|palette/i);
  const yes = say(m, 'yes'); assert.ok(yes.resolved?.route.startsWith('/projects') || yes.resolved?.route.startsWith('/services') || /interior/i.test(yes.spoken));
});
test('D: negative feedback is acknowledged without defending, and asks what they were hoping for', () => {
  const { m } = mk(); m.open(); say(m, 'tell me about the studio page'); m.noteDeparture({ action: { dest: 'about' } }); visit(m, '/studio'); m.open();
  const t = say(m, "It wasn't quite what I was looking for");
  assert.match(t.spoken, /thank|fair|glad you said|different/i); assert.doesNotMatch(t.spoken, /but the tour|actually it|you should have/i);
  assert.match(t.spoken, /hoping|looking|find|useful/i); assert.equal(m.state.pending.kind, 'hoping');
  const t2 = say(m, 'project types'); assert.ok(t2.resolved || /project/i.test(t2.spoken));
});
test('return scenario: neutral/no feedback is accepted gracefully', () => {
  const { m } = mk(); m.open(); m.noteDeparture({ action: { dest: 'projects' } }); visit(m, '/projects'); m.open();
  const t = say(m, 'Not really'); assert.match(t.spoken, /no problem|perfectly fine|no need/i); assert.doesNotMatch(t.spoken, /\?\s*$/ );
});
test('return after a service page: asks to clarify and answers about planning with real content', () => {
  const { m } = mk(); m.open(); m.noteDeparture({ action: { dest: 'services', slug: 'planning' } }); visit(m, '/services/planning');
  const back = m.open(); assert.match(back.spoken, /Planning & Spatial Design/);
  const t = say(m, "I'd like to understand the planning stage better"); assert.match(t.spoken, /plan/i); assert.match(t.spoken, /walk you through|show you|services/i);
});

// ---------------------------------------------------------------------------------------------------------------- Test E: repetition
test('E: repeated returns vary wording and do not re-ask the same question within its cooldown', () => {
  const { m } = mk(); m.open(); const openers = new Set(); const questions = [];
  for (let i = 0; i < 5; i++) { m.noteDeparture({ action: { dest: 'projects' } }); visit(m, '/projects'); const t = m.open(); openers.add(t.spoken); questions.push(t.ask?.key || null); say(m, 'it was fine'); }
  assert.ok(openers.size >= 4, 'at least four distinct return lines out of five: ' + openers.size);
  const fb = questions.filter((q) => q === 'feedback.projects'); assert.ok(fb.length < 5, 'does not ask the same feedback question every time');
});
test('E2: no stock phrase dominates a long conversation', () => {
  const { m } = mk(); const lines = [m.open().spoken];
  const script = ['tell me about the practice', 'services', 'how do you think about light', 'show me', 'materials', 'yes', 'projects', 'Interiors', 'process', 'what about windows', 'thanks', 'bye'];
  for (const x of script) lines.push(say(m, x).spoken);
  for (const stock of [/of course/i, /certainly/i, /absolutely/i, /wonderful/i, /how can i help you today/i, /is there anything else/i]) assert.ok(lines.filter((l) => stock.test(l)).length <= 3, String(stock));
  const openers = lines.map((l) => l.split(' ').slice(0, 2).join(' ').toLowerCase()); const counts = {}; openers.forEach((o) => { counts[o] = (counts[o] || 0) + 1; });
  assert.ok(Math.max(...Object.values(counts)) <= 3, JSON.stringify(counts));
  assert.equal(lines.filter((l) => /welcome to top architects/i.test(l)).length <= 1, true);
});
test('guard: near-duplicates are detected by meaning, not exact text', () => {
  assert.ok(similarity('That sounds exciting, tell me more.', 'That sounds wonderful, tell me more.') > 0.5);
  assert.ok(similarity('Shall I open the services?', 'The process page covers the stages.') < 0.3);
  const g = new RepetitionGuard({ rng: seeded(3) }); g.commit('Of course. I will open the projects for you.');
  const pick = g.choose('x', ['Of course. I will open the projects for you now.', 'Here is the gallery.']); assert.equal(pick, 'Here is the gallery.');
});

// ---------------------------------------------------------------------------------------------------------------- Test F, G: topic change, unknown
test('F: switching from architecture to services follows the new topic immediately', () => {
  const { m } = mk(); m.open(); say(m, 'how do you think about residential design'); const t = say(m, 'actually show me your services');
  assert.equal(t.resolved.route, '/services'); assert.ok(m.state.pending === null || m.state.pending.kind !== 'focus');
});
test('F2: changing direction while an offer is pending acknowledges the change', () => {
  const { m } = mk(); m.open(); say(m, 'how do you decide where the windows go'); say(m, 'show me'); say(m, 'show me the process'); const t = say(m, 'actually can I see the interiors instead?');
  assert.equal(t.resolved.route, '/projects?category=Interiors');
});
test('G: unverified questions are answered honestly, never invented', () => {
  const { m } = mk(); m.open();
  for (const q of ['who designed this project?', 'how much do you charge?', 'what awards have you won?', 'who are your clients?', 'how many people work here?']) {
    const t = say(m, q); assert.match(t.spoken, /don.t have|can reliably say|what I can/i, q); assert.doesNotMatch(t.spoken, /\b(won (the|an|a|best|\\d)|award(ed)? for|clients include|\$|₹|£|\d{2,} (staff|people|employees))\b/i, q);
    assert.equal(t.action, null);
  }
});
test('G2: gibberish does not loop — second confusion changes strategy', () => {
  const { m } = mk(); m.open(); const a = say(m, 'blorptastic zzz'); const b = say(m, 'qwertyuiop asdf');
  assert.notEqual(a.spoken, b.spoken); assert.ok(b.chips.some((c) => c.go?.dest === 'contact'));
});

// ---------------------------------------------------------------------------------------------------------------- navigation safety
test('navigation: every suggested action resolves to a real route; invented routes are rejected', () => {
  const routes = new Set(DESTINATIONS.map((d) => d.route));
  assert.equal(resolveAction({ type: 'navigate', dest: 'admin' }), null);
  assert.equal(resolveAction({ type: 'navigate', dest: 'projects', slug: 'not-a-project' }), null);
  assert.equal(resolveAction({ type: 'navigate', dest: 'projects', category: 'Skyscrapers' }), null);
  assert.equal(resolveAction({ type: 'navigate', dest: 'services', category: 'Residential' }), null);
  assert.equal(resolveAction({ type: 'run', dest: 'projects' }), null);
  const { m } = mk({ seed: 11 }); m.open();
  const script = ['projects', 'residential', 'services', 'planning service', 'process', 'journal', 'contact', 'the founder', 'show me the garden pavilion', 'light', 'materials', 'windows', 'hospitality', 'who designed this', 'bye', 'hello'];
  for (const x of script) { const t = say(m, x); if (t.resolved) { const base = t.resolved.route.split('?')[0].split('/').slice(0, 2).join('/'); assert.ok(routes.has(base), t.resolved.route); } t.chips.forEach((c) => c.go && assert.ok(resolveAction({ type: 'navigate', ...c.go }), 'chip route ' + JSON.stringify(c.go))); }
});
test('navigation: an invalid chip action is refused, not executed', () => {
  const { m } = mk(); m.open(); const t = m.handle({ source: 'chip', go: { dest: 'projects', slug: 'made-up' } }); assert.equal(t.action, null); assert.equal(t.resolved ?? null, null);
});
// ---------------------------------------------------------------------------------------------------------------- Test I, K: persistence and isolation
test('I: state survives a remount (new manager over the same session storage) and continues, not restarts', () => {
  const storage = new MemoryStorage(); const a = mk({ storage }).m; a.open(); say(a, 'how do you think about materials'); const nav = say(a, 'show me the process'); a.noteDeparture(nav); visit(a, '/process');
  const b = mk({ storage, seed: 3 }).m;                                   // component remounted / page reloaded
  assert.ok(b.state.interests.includes('materials')); assert.equal(deriveArrival(b.state), 'returning');
  const back = b.open(); assert.doesNotMatch(back.spoken, /welcome to top architects/i); assert.match(back.spoken, /process/i);
});
test('K: independent sessions never share context', () => {
  const a = mk().m, b = mk().m; a.open(); b.open(); say(a, 'residential houses please'); say(a, 'show me the process');
  assert.ok(a.state.interests.length > 0); assert.equal(b.state.interests.length, 0); assert.equal(b.state.visited.length, 0);
  assert.equal(deriveArrival(new VisitorContext(new MemoryStorage()).s), 'first');
});
test('no false recognition: a brand-new session is never treated as a returning visitor', () => { const m = mk().m; assert.equal(m.open().arrival, 'first'); });

// ---------------------------------------------------------------------------------------------------------------- Test H: interruption, farewell, quiet
test('H: an interrupted explanation is remembered and offered again on return', () => {
  const { m } = mk(); m.open(); const t = say(m, 'tell me about light'); assert.equal(t.topic, 'light'); m.noteInterrupted(t);
  const back = m.open(); assert.equal(back.arrival, 'interrupted'); assert.match(back.spoken, /light/i);
  const yes = say(m, 'yes carry on'); assert.match(yes.spoken, /light|daylight|window/i);
});
test('farewell: acknowledges, ends gracefully, resumes without replaying the welcome', () => {
  const { m } = mk(); m.open(); const bye = say(m, 'thanks, that is all, goodbye'); assert.equal(bye.farewell, true);
  const again = say(m, 'actually, show me the projects'); assert.match(again.spoken, /project|residential|studies|everything/i); assert.doesNotMatch(again.spoken, /welcome to top architects/i); assert.equal(m.state.farewelled, false);
  const back = m.open(); assert.ok(['revisit', 'returning', 'after_farewell'].includes(back.arrival));
});
test('after farewell, reopening the reception recognises the same session without a full welcome', () => {
  const { m } = mk(); m.open(); say(m, 'goodbye'); const back = m.open(); assert.equal(back.arrival, 'after_farewell'); assert.doesNotMatch(back.spoken, /welcome to top architects/i);
});
test('quiet browsing: visitor can ask the receptionist to stay silent', () => {
  const { m } = mk(); m.open(); const t = say(m, 'please be quiet, I will browse myself'); assert.equal(t.silent, true); assert.equal(say(m, 'projects').silent, true);
  assert.equal(say(m, 'you can speak again').silent, false);
});

// ---------------------------------------------------------------------------------------------------------------- Test L: long conversation, bounded memory
test('L: a 40-turn mixed conversation with returns stays coherent, varied and bounded', () => {
  const { m, storage } = mk({ seed: 5 }); m.open(); const lines = []; let routes = 0;
  const script = ['tell me about the practice', 'residential', 'planning', 'show me', 'back', 'projects', 'Commercial', 'how do you decide where windows go', 'daylight', 'why?', 'not that one', 'services', 'interior design', 'process', 'I have a plot', 'a house', 'who designed it', 'thanks', 'journal', 'materials', 'timber and warmth', 'show me', 'hospitality', 'landscape', 'help', 'hello', 'contact', 'light', 'circulation', 'no', 'yes', 'maybe', 'the founder', 'windows', 'residential', 'goodbye', 'projects', 'process', 'services', 'light'];
  for (let i = 0; i < script.length; i++) { const t = say(m, script[i]); lines.push(t.spoken); assert.ok(t.spoken.length > 3 && t.spoken.length < 700, script[i] + ' -> ' + t.spoken.length); if (t.resolved) { routes++; m.noteDeparture(t); visit(m, t.resolved.route.split('?')[0]); if (i % 5 === 0) { const r = m.open(); lines.push(r.spoken); } } }
  assert.ok(routes >= 6); assert.ok(m.state.history.length <= 20, 'history is capped'); assert.ok(storage.getItem('top.visitor.v2').length < 9000, 'storage stays small: ' + storage.getItem('top.visitor.v2').length);
  const uniq = new Set(lines.map((l) => l.toLowerCase())); assert.ok(uniq.size / lines.length > 0.85, 'responses are varied: ' + (uniq.size / lines.length).toFixed(2));
  let consecutive = 0; for (let i = 1; i < lines.length; i++) if (similarity(lines[i], lines[i - 1]) > 0.7) consecutive++; assert.ok(consecutive <= 2, 'near-duplicate consecutive lines: ' + consecutive);
});
test('questions are not re-asked once answered', () => {
  const { m } = mk(); m.open(); say(m, 'how do you decide where the windows go'); say(m, 'the view');
  const asked = m.state.asked['windows.focus']; assert.ok(asked); const again = say(m, 'tell me about windows again'); assert.ok(!(again.ask && again.ask.key === 'windows.focus') || m.state.turn - asked >= 8);
});

// ---------------------------------------------------------------------------------------------------------------- speech helpers (pronunciation + subtitle sync)
test('speech: brand is pronounced naturally and subtitle positions still map by word', () => {
  const cap = 'Welcome to TOP ARCHITECTS + PARTNERS, where Ar. Saurabh leads.'; const spoken = prepareSpeech(cap);
  assert.match(spoken, /TOP Architects and Partners/); assert.match(spoken, /Architect Saurabh/); assert.equal(spoken.split(/\s+/).length, cap.split(/\s+/).length);
  const i = spoken.indexOf('Partners,'); const end = mapBoundary(spoken, cap, i, 8); assert.equal(cap.slice(0, end).endsWith('PARTNERS,'), true);
});

// ---------------------------------------------------------------------------------------------------------------- reception UI refinement: information first, silent returns
test('information questions are answered from verified content and do NOT navigate by themselves', () => {
  const { m } = mk(); m.open();
  const svc = say(m, 'What services do you offer?'); assert.equal(svc.action, null);
  for (const t of ['Architecture', 'Interior Design', 'Planning & Spatial Design', 'Architectural Visualization', 'Design Consultancy']) assert.match(svc.spoken, new RegExp(t.replace(/[&]/g, '.')));
  assert.equal(svc.pending.kind, 'offer');
  const yes = say(m, 'yes please'); assert.equal(yes.resolved.route, '/services');
  const proc = say(m, 'How does your design process work?'); assert.equal(proc.action, null);
  for (const t of ['Initial Conversation', 'Brief & Discovery', 'Concept Development', 'Design Refinement', 'Technical Coordination', 'Delivery & Completion']) assert.ok(proc.spoken.includes(t), t);
  const team = say(m, 'Who leads the studio?'); assert.match(team.spoken, /Saurabh S Jadhav/); assert.match(team.spoken, /Founder & Principal/); assert.equal(team.action, null);
  const about = say(m, 'Tell me about the studio'); assert.match(about.spoken, /2026/);
  const one = say(m, 'What does your planning service involve?'); assert.match(one.spoken, /Site and spatial strategies/); assert.equal(one.action, null);
});
test('contact questions return exactly the verified details, nothing invented', () => {
  const { m } = mk(); m.open();
  assert.match(say(m, "What's your email address?").spoken, /Info@toparchitectspartners\.com/);
  const ph = say(m, 'What is your phone number?').spoken; assert.match(ph, /\+91 7208589360/); assert.match(ph, /\+44 7780154030/);
  assert.match(say(m, 'Where are you located?').spoken, /CBD Belapur, Navi Mumbai/);
  const all = [say(m, 'how can I contact you'), say(m, 'what is your fax number'), say(m, 'how much do you charge')];
  assert.doesNotMatch(all[0].spoken, /\b(fax|whatsapp)\b/i); assert.match(all[2].spoken, /don.t have|verified/i);
});
test('requests to see a page still open it; "explore your projects" asks which kind first', () => {
  const { m } = mk(); m.open();
  assert.equal(say(m, 'take me to the contact page').resolved.route, '/contact');
  assert.equal(say(m, 'open the journal').resolved.route, '/journal');
  const ex = say(m, "I'd like to explore your projects"); assert.ok(ex.resolved || /residential|commercial|everything/i.test(ex.spoken));
});
test('returning to the reception is silent: no new greeting, conversation log restored', () => {
  const storage = new MemoryStorage(); const a = mk({ storage }).m; const g = a.open(); say(a, 'what services do you offer'); const nav = say(a, 'yes'); a.noteDeparture(nav); visit(a, '/services');
  const b = mk({ storage, seed: 4 }).m; const back = b.resume();
  assert.equal(back.arrival, 'returning'); assert.ok(back.messages.length >= 4, 'previous exchange is restored'); assert.equal(back.messages[0].w, 'r'); assert.equal(back.messages[0].t, g.spoken.slice(0, 520));
  assert.equal(b.state.departure, null); assert.equal(b.state.receptions, 2);
  const c = mk({ storage, seed: 9 }).m; assert.equal(c.resume().arrival, 'revisit');
  const t = say(b, 'and what about the process?'); assert.doesNotMatch(t.spoken, /welcome|back/i);
});
test('conversation log stays small and capped', () => {
  const { m, storage } = mk(); m.open(); for (let i = 0; i < 40; i++) say(m, ['what services do you offer', 'tell me about light', 'projects', 'process'][i % 4]);
  assert.ok(m.state.log.length <= 14); assert.ok(m.state.log.every((l) => l.t.length <= 520)); assert.ok(storage.getItem('top.visitor.v2').length < 14000);
});

// ---------------------------------------------------------------------------------------------------------------- inbuilt engine: phrasing, typos, follow-ups, clarification
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STUDIO } from '../src/content/studio.js';
import { distance, fixWord } from '../src/reception/engine/fuzzy.js';

const fiveServices = ['Architecture', 'Interior Design', 'Planning & Spatial Design', 'Architectural Visualization', 'Design Consultancy'];
test('different phrasings of the services question give the same answer', () => {
  for (const q of ['What services do you provide?', 'What does your firm do?', 'What kind of work do you undertake?', 'Can you tell me about your services?', 'what do u offer', 'What are your areas of expertise?', 'what services are available']) {
    const { m } = mk(); m.open(); const t = say(m, q);
    assert.equal(t.intent, 'info.services', q); assert.equal(t.action, null, q + ' must not navigate by itself');
    for (const n of fiveServices) assert.ok(t.spoken.includes(n), `${q} -> ${n}`);
  }
});
test('every service category can be asked about, by its own name or a synonym, and is answered from the site content', () => {
  const asks = { architecture: ['Do you do architecture?', 'tell me about your architecture service'], 'interior-design': ['what about interiors?', 'Do you do interior design?'], planning: ['What does your planning service involve?', 'do you offer planning'], visualization: ['Can you make 3d renders?', 'tell me about visualisation'], consultancy: ['Do you offer consultancy?', 'tell me about design consulting'] };
  for (const [slug, qs] of Object.entries(asks)) for (const q of qs) {
    const { m } = mk(); m.open(); const t = say(m, q); const sv = kb.services.find((x) => x.slug === slug);
    assert.ok(t.spoken.includes(sv.lead) || t.spoken.includes(sv.title), `${q} -> ${t.spoken.slice(0, 90)}`); assert.equal(t.action, null, q);
  }
});
test('typos and texting shorthand are tolerated', () => {
  const cases = [['whats ur servises', 'info.services'], ['tell me about intrior desing', 'info.services'], ['how does ur proces work', 'info.process'], ['wat is ur emial adress', 'info.contact'], ['shwo me the projcts', 'navigate'], ['abuot the studio', null], ['who is the foundr', 'info.team']];
  for (const [q, intent] of cases) { const { m } = mk(); m.open(); const t = say(m, q); if (intent) assert.ok(t.intent === intent || (intent === 'navigate' && (t.resolved || /project|everything/i.test(t.spoken))), `${q} -> ${t.intent} :: ${t.spoken.slice(0, 80)}`); assert.notEqual(t.intent, 'unknown', q); }
  assert.equal(distance('desing', 'design'), 1); assert.equal(fixWord('servises'), 'services'); assert.equal(fixWord('house'), 'house'); assert.equal(fixWord('contract'), 'contract'); assert.equal(fixWord('team'), 'team');
});
test('follow-up: "the second one" means Interior Design after the services were listed', () => {
  const { m } = mk(); m.open(); say(m, 'What services do you offer?');
  const t = say(m, 'Tell me more about the second one'); assert.match(t.spoken, /Interior Design/); assert.match(t.spoken, /Interiors conceived|composed together|material, light/i);
  assert.equal(t.pending.kind, 'offer'); assert.equal(m.state.focus.id, 'interior-design');
  for (const [q, name] of [['what about the first one', 'Architecture'], ['and the last one', 'Design Consultancy'], ['the third', 'Planning & Spatial Design'], ['what about the next one', 'Architectural Visualization']]) { const r = say(m, q); assert.ok(r.spoken.includes(name), `${q} -> ${r.spoken.slice(0, 70)}`); }
});
test('follow-up: "tell me more", "explain that" and "show me some examples" use the current focus', () => {
  const { m } = mk(); m.open(); say(m, 'Do you do interior design?');
  const more = say(m, 'Tell me more.'); assert.match(more.spoken, /Related studies|Light-Filled|Cantilever/i);
  const again = say(m, 'can you explain that?'); assert.match(again.spoken, /everything I have|services page/i);
  const ex = say(m, 'Show me some examples'); assert.match(ex.spoken, /Light-Filled Interior|Cantilever House/); assert.match(ex.spoken, /conceptual/i);
  const yes = say(m, 'yes'); assert.ok(yes.resolved.route.startsWith('/projects/'));
});
test('follow-up through the process stages and between topics', () => {
  const { m } = mk(); m.open(); say(m, 'How does the process work?'); const t = say(m, 'what about the second stage'); assert.match(t.spoken, /Brief & Discovery/); assert.match(t.spoken, /tested against the site/);
  const more = say(m, 'tell me more'); assert.match(more.spoken, /Gathering the information/);
  const m2 = mk().m; m2.open(); say(m2, 'how do you decide where the windows should go'); assert.notEqual(say(m2, 'tell me more').spoken, say(m2, 'tell me more').spoken);
});
test('"Can I see your work?" is understood as projects and offers the page', () => {
  const { m } = mk(); m.open(); say(m, 'What services do you offer?');
  const t = say(m, 'Can I see your work?'); assert.match(t.spoken, /projects page/i); assert.equal(t.pending.action.dest, 'projects');
  const yes = say(m, 'yes'); assert.equal(yes.resolved.route, '/projects');
  const m3 = mk().m; m3.open(); say(m3, 'show me your projects'); assert.equal(say(m3, 'residential').resolved.route, '/projects?category=Residential');
});
test('"Can I contact the team?" gives the real contact details', () => {
  const { m } = mk(); m.open(); const t = say(m, 'Can I contact the team?');
  assert.ok(t.spoken.includes(STUDIO.contact.email)); for (const p of STUDIO.contact.phones) assert.ok(t.spoken.includes(p.number));
});
test('ambiguous questions get a clarification question, and the answer resolves it', () => {
  const { m } = mk(); m.open();
  const t = say(m, 'design'); assert.match(t.spoken, /Do you mean Interior Design, Design Consultancy or the design process\?/); assert.equal(t.pending.kind, 'disambig');
  const r = say(m, 'the second'); assert.match(r.spoken, /Design Consultancy/);
  const m2 = mk().m; m2.open(); assert.match(say(m2, 'tell me more').spoken, /about what|services, the projects/i);
  assert.match(say(m2, 'what about the second one').spoken, /which one/i);
});
test('missing information is admitted, never invented; philosophy and timelines are not made up', () => {
  const { m } = mk(); m.open(); const forbid = /\b(\d+ years|since 19\d\d|award-winning|ISO|₹|\$\d|£\d|weeks|months)\b/i;
  for (const q of ['what is your design philosophy', 'how long does a project take', 'how many years of experience do you have', 'which awards have you won', 'who are your clients', 'what are your fees', 'what are your visiting hours', 'are you hiring', 'what is your instagram', 'when was the studio founded', 'what is your annual revenue']) {
    const t = say(m, q); assert.doesNotMatch(t.spoken, forbid, q); assert.equal(t.action, null, q);
  }
  assert.match(say(m, 'what is your annual revenue').spoken, /don.t have that information available at the moment\. Please contact our studio/);
  assert.match(say(m, 'what is your design philosophy').spoken, /don.t have a formal philosophy/); assert.match(say(m, 'when was the studio established').spoken, /2026/);
});
test('every number, email and address the receptionist says exists in the website content', () => {
  const { m } = mk(); m.open(); const allowed = JSON.stringify([STUDIO, kb.services, kb.projects, kb.process, kb.articles]).replace(/[^\w@.+ ]/g, ' ');
  for (const q of ['what services do you offer', 'contact details', 'where are you located', 'who leads the studio', 'how does the process work', 'tell me about the studio', 'what projects do you have', 'do you design houses', 'tell me about the journal']) {
    const spoken = say(m, q).spoken; for (const tok of spoken.match(/[\w.]+@[\w.]+|\+?\d[\d ]{4,}\d/g) || []) assert.ok(allowed.includes(tok.trim()), `${q}: "${tok}" is not in the content`);
  }
});
test('NO external AI and NO network access in the conversation code', () => {
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const files = [...walk('src/reception/engine'), 'src/reception/story.js', 'src/reception/voiceInput.js', 'src/reception/conversation.js', 'src/reception/animationController.js', 'src/content/faq.js', 'src/content/knowledge.js'];
  const banned = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts)\s*\(|https?:\/\/|openai|anthropic|gemini|generativelanguage|chatgpt|claude|llm|import\.meta\.env/i;
  for (const f of files) { const code = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n').replace(/\/\/.*$/gm, ''); assert.doesNotMatch(code, banned, f); }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')); const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.deepEqual(deps.filter((d) => /openai|anthropic|genai|gemini|langchain|transformers|tensorflow|onnx|llama|ollama|webllm/i.test(d)), []);
});

test('a repeated factual question is answered in full again, not trimmed', () => {
  const { m } = mk(); m.open(); say(m, 'what services do you offer'); const again = say(m, 'what does your firm do');
  for (const n of fiveServices) assert.ok(again.spoken.includes(n), n);
  const w = say(m, 'what is your annual revenue'); assert.match(w.spoken, /don.t have that information available at the moment/); assert.equal(w.intent, 'unverified');
  assert.equal(say(m, 'do you plan to open an office in dubai').intent, 'unverified'); assert.equal(say(m, 'blorptastic zzz').intent, 'unknown');
});

// ---------------------------------------------------------------------------------------------------------------- collapsible composer rules
import { Composer, EMPTY_MSG, FAIL_MSG } from '../src/reception/composer.js';
test('composer: closed by default; closing keeps an unsent draft; opening/closing never clears it', () => {
  const c = new Composer(); assert.equal(c.isOpen, false);
  c.open().setDraft('Do you design houses?'); c.close(); assert.equal(c.isOpen, false); assert.equal(c.draft, 'Do you design houses?'); c.open(); assert.equal(c.draft, 'Do you design houses?');
});
test('composer: empty or whitespace-only messages are rejected with a clear message', () => {
  const c = new Composer(); c.open(); assert.equal(c.canSend, false); assert.equal(c.begin(), null); assert.equal(c.error, EMPTY_MSG);
  c.setDraft('   \n '); assert.equal(c.canSend, false); assert.equal(c.begin(), null); assert.equal(c.sending, false);
});
test('composer: success clears the draft and closes; duplicates while sending are ignored', () => {
  const c = new Composer(); c.open().setDraft('  what services do you offer  '); assert.equal(c.canSend, true);
  assert.equal(c.begin(), 'what services do you offer'); assert.equal(c.sending, true); assert.equal(c.canSend, false); assert.equal(c.begin(), null, 'second submit while sending');
  c.succeed(); assert.equal(c.isOpen, false); assert.equal(c.draft, ''); assert.equal(c.sending, false); assert.equal(c.error, '');
});
test('composer: failure keeps it open, keeps the typed message and shows an understandable error; editing clears the error', () => {
  const c = new Composer(); c.open().setDraft('tell me about the process'); c.begin(); c.fail();
  assert.equal(c.isOpen, true); assert.equal(c.draft, 'tell me about the process'); assert.equal(c.error, FAIL_MSG); assert.equal(c.sending, false);
  assert.ok(c.begin(), 'can retry after a failure'); c.fail(); c.setDraft('tell me about the process please'); assert.equal(c.error, '');
});
