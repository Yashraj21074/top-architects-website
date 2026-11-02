// Dialogue variety/context tests (plain Node, no browser). Run: node tools/qa/dialogue.test.mjs
const store = {}; globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => delete store[k] };
const { conversation } = await import('../../src/reception/conversation.js');
const D = await import('../../src/content/dialogue.js');
const { DESTINATIONS } = await import('../../src/content/destinations.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const ids = DESTINATIONS.map((d) => d.id);
ok(D.FIRST.length >= 4, 'FIRST has >=4 variants');
for (const id of ids) {
  ok((D.INTRO[id] || []).length >= 4, `INTRO.${id} has >=4 (has ${(D.INTRO[id] || []).length})`);
  ok((D.RETURN[id] || []).length >= 4, `RETURN.${id} has >=4`);
  for (const [, sug] of D.RETURN[id] || []) ok(!sug || ids.includes(sug), `RETURN.${id} suggests valid id ${sug}`);
}
ok(D.RETURN_GENERIC.length >= 4 && D.BACK.length >= 4 && D.INTRO_AGAIN.length >= 4, 'generic pools >=4');
// 1) never repeat consecutively, and all variants appear before any repeats (rotation)
for (const id of ids) {
  const seen = []; let prev = null;
  for (let i = 0; i < D.INTRO[id].length; i++) { const t = conversation.intro(id); ok(t !== prev, `intro.${id} consecutive repeat`); prev = t; seen.push(t); break; }
}
Object.keys(store).forEach((k) => delete store[k]);
const poolOf = (id) => D.INTRO[id]; const got = new Set(); let last = null;
for (let i = 0; i < poolOf('team').length; i++) { const t = conversation._pick('x.team', poolOf('team')); ok(t !== last, 'rotation no consecutive repeat'); last = t; got.add(t); }
ok(got.size === poolOf('team').length, `rotation covers all ${poolOf('team').length} variants before repeating (got ${got.size})`);
for (let i = 0; i < 200; i++) { const t = conversation._pick('x.team', poolOf('team')); ok(t !== last, 'long-run consecutive repeat'); last = t; }
// 2) first visit vs returning, and context of the page just left
Object.keys(store).forEach((k) => delete store[k]);
const first = conversation.greeting('day'); conversation.noteReception();
ok(D.FIRST.some((f) => (f.text || f) === first), 'first-visit greeting comes from FIRST'); ok(!/Good evening/.test(first), 'day theme does not use night greeting');
Object.keys(store).forEach((k) => delete store[k]);
const night = conversation.greeting('night'); ok(!/Good (morning|afternoon)/.test(night), 'night theme avoids morning/afternoon');
conversation.noteReception(); conversation.noteVisit('projects');
const ret = conversation.greeting('day'); ok(D.RETURN.projects.some(([t]) => t === ret) || D.RETURN_COMMON.includes(ret) || D.RETURN_AGAIN.includes(ret), 'return from projects uses RETURN.projects / common / again pool');
// suggestions skip already-visited destinations
for (let i = 0; i < 30; i++) { const l = conversation.greeting('day'); const hit = D.RETURN.projects.find(([t]) => t === l); if (hit && hit[1]) ok(!conversation.hasVisited(hit[1]), 'suggestion not already visited'); }
conversation.noteVisit('services'); conversation.noteVisit('process');
for (let i = 0; i < 30; i++) { const l = conversation.greeting('day'); const hit = D.RETURN.projects.find(([t]) => t === l); if (hit && hit[1]) ok(!['services', 'process', 'projects'].includes(hit[1]), 'suggestion avoids visited services/process'); }
// 3) already-visited destination uses the "again" pool
conversation.noteVisit('projects'); ok(D.INTRO_AGAIN.map((l) => l.replace('{name}', 'Projects')).includes(conversation.intro('projects')), 'revisited destination uses INTRO_AGAIN');
ids.forEach((id) => conversation.noteVisit(id)); conversation.noteVisit('contact');
ok(D.RETURN_ALL.includes(conversation.greeting('day')), 'all destinations visited -> RETURN_ALL');
ok(D.FIRST.some((f) => (f.text || f).startsWith('Welcome to TOP ARCHITECTS + PARTNERS. It')), 'brief example first greeting present');
ok(D.RETURN_COMMON.length >= 1 && D.RETURN_AGAIN.some((l) => l.startsWith('Good to see you again.')), 'brief example return lines present');
console.log(fail ? `${fail} FAILURE(S)` : 'dialogue tests: all passed');
process.exit(fail ? 1 : 0);
