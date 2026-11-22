// Provider-independent LLM layer. Configure with environment variables only (never in frontend code):
//   AI_PROVIDER = anthropic | openai        (openai = any OpenAI-compatible chat-completions endpoint)
//   AI_API_KEY  = secret key                (server-side only)
//   AI_MODEL    = model name
//   AI_BASE_URL = optional override (e.g. a compatible gateway)
async function post(fetchImpl, url, headers, body, timeoutMs) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ac.signal });
    if (!r.ok) { const e = new Error(`provider_${r.status}`); e.status = r.status; throw e; }
    return await r.json();
  } catch (e) { if (e.name === 'AbortError') { const x = new Error('provider_timeout'); x.timeout = true; throw x; } throw e; }
  finally { clearTimeout(t); }
}
const timeout = (env) => Number(env.AI_TIMEOUT_MS) || 12000;     // provider call timeout (ms)
const PROVIDERS = {
  anthropic: async ({ fetchImpl, env, system, messages }) => {
    const d = await post(fetchImpl, `${env.AI_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, { 'x-api-key': env.AI_API_KEY, 'anthropic-version': '2023-06-01' },
      { model: env.AI_MODEL, max_tokens: 700, temperature: 0.4, system, messages }, timeout(env));
    return (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  },
  openai: async ({ fetchImpl, env, system, messages }) => {
    const d = await post(fetchImpl, `${env.AI_BASE_URL || 'https://api.openai.com'}/v1/chat/completions`, { authorization: `Bearer ${env.AI_API_KEY}` },
      { model: env.AI_MODEL, max_tokens: 700, temperature: 0.4, messages: [{ role: 'system', content: system }, ...messages] }, timeout(env));
    return d.choices?.[0]?.message?.content || '';
  },
};
export const isConfigured = (env) => !!(env.AI_API_KEY && env.AI_MODEL && PROVIDERS[env.AI_PROVIDER]);
/** One retry on transient failures (429 / 5xx / timeout). Returns the model's text. */
export async function complete(args) {
  const run = PROVIDERS[args.env.AI_PROVIDER];
  try { return await run(args); }
  catch (e) { if (e.timeout || e.status === 429 || e.status >= 500) return await run(args); throw e; }
}
