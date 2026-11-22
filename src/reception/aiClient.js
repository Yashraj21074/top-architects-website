// Browser side of the AI receptionist. Talks ONLY to our own /api/reception (the provider key lives on the server).
// Returns a validated result or null: callers then fall back to the built-in rule-based conversation engine, so the Reception never depends on the AI.
const TIMEOUT_MS = 15000;
let offUntil = 0;                                   // after "not configured" / network failure, skip the AI for a while instead of delaying every turn

export const aiAvailable = (now = Date.now()) => now >= offUntil;
export async function askAI(payload, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (!aiAvailable(now()) || typeof fetchImpl !== 'function') return null;
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetchImpl('/api/reception', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ac.signal });
    if (r.status === 503 || r.status === 404 || r.status === 405) { offUntil = now() + 10 * 60 * 1000; return null; }   // endpoint missing / not configured (static hosting)
    if (!r.ok) { if (r.status === 429) offUntil = now() + 30 * 1000; return null; }
    const d = await r.json();
    return d && d.ok && typeof d.reply === 'string' ? d : null;
  } catch { offUntil = now() + 20 * 1000; return null; }
  finally { clearTimeout(t); }
}
export const _resetForTests = () => { offUntil = 0; };
