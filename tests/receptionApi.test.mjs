import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validateRequest, parseModelOutput, rateLimited } from '../api/reception.js';
import { retrieve } from '../src/lib/knowledgeBase.js';
import { askAI, _resetForTests } from '../src/reception/aiClient.js';
import { ConversationManager } from '../src/reception/engine/conversationManager.js';
import { MemoryStorage } from '../src/reception/engine/visitorContext.js';

const call = async (handler, { method = 'POST', body, headers = {} } = {}) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  await handler({ method, body, headers: { 'x-forwarded-for': headers.ip || `t${Math.random()}`, ...headers }, socket: {} }, res); return res;
};
const env = { AI_PROVIDER: 'anthropic', AI_API_KEY: 'test-key', AI_MODEL: 'test-model' };
const fakeProvider = (text, status = 200) => async () => ({ ok: status < 400, status, json: async () => ({ content: [{ type: 'text', text }] }) });

test('not configured -> 503, never a fake success', async () => {
  const r = await call(createHandler({ env: {}, log: () => {} }), { body: { message: 'hi' } });
  assert.equal(r.statusCode, 503); assert.equal(r.body.code, 'not_configured');
});
test('only POST; input validated', async () => {
  const h = createHandler({ env, fetchImpl: fakeProvider('{}'), log: () => {} });
  assert.equal((await call(h, { method: 'GET' })).statusCode, 405);
  for (const body of [null, {}, { message: '' }, { message: 'x'.repeat(501) }, { message: 5 }]) assert.equal((await call(h, { body })).statusCode, 400);
});
test('request sanitising: history capped, unknown ids dropped', () => {
  const r = validateRequest({ message: 'hello\u0000 there', history: Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'x'.repeat(2000) })).concat([{ role: 'system', text: 'evil' }]), subject: { id: 'nope' }, mentioned: ['cantilever-house', 'fake'] });
  assert.equal(r.message, 'hello there'); assert.ok(r.history.length <= 8 && r.history.every((h) => h.text.length <= 600 && h.role !== 'system'));
  assert.equal(r.subject, null); assert.deepEqual(r.mentioned, ['cantilever-house']);
});
test('model output: URLs stripped, invented destinations dropped, real ones kept', () => {
  const o = parseModelOutput('```json\n{"reply":"See https://evil.example now","action":{"type":"navigate","dest":"projects","slug":"made-up-house"},"subject":{"id":"made-up"},"mentioned":["x"]}\n```');
  assert.ok(!/http/.test(o.reply)); assert.equal(o.action, null); assert.equal(o.subject, null); assert.deepEqual(o.mentioned, []);
  const g = parseModelOutput('{"reply":"Opening it.","action":{"type":"navigate","dest":"projects","slug":"cantilever-house"},"subject":{"id":"cantilever-house"}}');
  assert.deepEqual(g.action, { type: 'navigate', dest: 'projects', slug: 'cantilever-house' });
  assert.equal(parseModelOutput('not json'), null); assert.equal(parseModelOutput('{"reply":""}'), null);
  assert.equal(parseModelOutput('{"reply":"x","action":{"type":"navigate","dest":"https://evil.example"}}').action, null);
});
test('full round trip with a stubbed provider; the prompt is grounded in site data and never exposes the key', async () => {
  let seen; const fetchImpl = async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '{"reply":"Yes, we design homes.","action":null,"subject":null,"mentioned":["cantilever-house"]}' }] }) }; };
  const r = await call(createHandler({ env, fetchImpl, log: () => {} }), { body: { message: 'Do u guys make houses?' } });
  assert.equal(r.statusCode, 200); assert.equal(r.body.reply, 'Yes, we design homes.'); assert.ok(!JSON.stringify(r.body).includes('test-key'));
  const sent = JSON.parse(seen.init.body); assert.match(sent.system, /Cantilever House/); assert.match(sent.system, /Ar\. Saurabh/); assert.equal(seen.init.headers['x-api-key'], 'test-key');
});
test('provider failure / garbage / timeout map to safe errors', async () => {
  assert.equal((await call(createHandler({ env, fetchImpl: fakeProvider('', 500), log: () => {} }), { body: { message: 'hi' } })).statusCode, 502);
  assert.equal((await call(createHandler({ env, fetchImpl: fakeProvider('blah'), log: () => {} }), { body: { message: 'hi' } })).body.code, 'bad_model_output');
  const slow = (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const r = await call(createHandler({ env: { ...env, AI_TIMEOUT_MS: '40' }, fetchImpl: slow, log: () => {} }), { body: { message: 'hi' } });
  assert.equal(r.statusCode, 504); assert.equal(r.body.code, 'timeout');
});
test('rate limiting', () => { const ip = 'rl-' + Math.random(); let last; for (let i = 0; i < 13; i++) last = rateLimited(ip, 1000 + i); assert.equal(last, true); assert.equal(rateLimited(ip, 1000 + 70000), false); });
test('retrieval returns relevant, grounded facts incl. the current subject and follow-ups', () => {
  assert.ok(retrieve('hotel', {}).some((f) => /hotel/i.test(f)));
  assert.ok(retrieve('what materials are used', { subject: { id: 'cantilever-house' } })[0].includes('Cantilever House'));
  assert.ok(retrieve('tell me about the second one', { mentioned: ['lightwell-house', 'cantilever-house'] }).some((f) => /Lightwell House|Cantilever House/.test(f)));
});
test('client: unavailable AI returns null (fallback), and caches not-configured', async () => {
  _resetForTests(); let n = 0; const f503 = async () => { n++; return { ok: false, status: 503, json: async () => ({}) }; };
  assert.equal(await askAI({ message: 'hi' }, { fetchImpl: f503 }), null); assert.equal(await askAI({ message: 'hi' }, { fetchImpl: f503 }), null); assert.equal(n, 1);
  _resetForTests(); assert.equal(await askAI({ message: 'x' }, { fetchImpl: async () => { throw new Error('offline'); } }), null); _resetForTests();
});
test('conversation: AI turn keeps context, only real routes resolve, failure falls back to the rule engine', async () => {
  _resetForTests(); const calls = [];
  const ai = async (p) => { calls.push(p); return p.message.startsWith('open') ? { ok: true, reply: 'Opening Cantilever House.', action: { type: 'navigate', dest: 'projects', slug: 'cantilever-house' }, subject: { id: 'cantilever-house' }, mentioned: [] } : { ok: true, reply: 'Here are two homes.', action: null, subject: null, mentioned: ['cantilever-house', 'lightwell-house'] }; };
  const m = new ConversationManager({ storage: new MemoryStorage(), askAI: ai });
  m.open(); const t1 = await m.handleAI({ source: 'text', text: 'show me houses' }); assert.equal(t1.spoken, 'Here are two homes.'); assert.ok(!t1.resolved);
  const t2 = await m.handleAI({ source: 'text', text: 'open the second one' });
  assert.deepEqual(calls[1].mentioned, ['cantilever-house', 'lightwell-house']); assert.ok(calls[1].history.length >= 2);
  assert.equal(t2.resolved.route, '/projects/cantilever-house');
  const bad = new ConversationManager({ storage: new MemoryStorage(), askAI: async () => ({ ok: true, reply: 'x', action: { type: 'navigate', dest: 'projects', slug: 'invented' }, subject: null, mentioned: [] }) });
  bad.open(); assert.ok(!(await bad.handleAI({ source: 'text', text: 'go' })).resolved);
  const off = new ConversationManager({ storage: new MemoryStorage(), askAI: async () => null }); off.open();
  assert.equal(await off.handleAI({ source: 'text', text: 'what services do you provide' }), null); assert.ok(off.handle({ source: 'text', text: 'what services do you provide' }).spoken.length > 10);
});
