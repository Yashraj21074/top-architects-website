# AI Reception — Implementation Report

## Status in one line
The integration is built and tested **around** the model with a stubbed provider. **No API credentials were available, so no live model was ever called: real understanding of misspellings, speech errors and follow-ups is UNVERIFIED.** Until you configure a provider and host `/api`, the Reception behaves exactly as before (rule-based engine).

## What existed (source audit)
`src/reception/engine/*` is a deterministic dialogue system: `intentResolver.js` (pattern/intent matching), `synonyms.js` + `fuzzy.js` (typo tolerance), `responseGenerator.js` (templates), `visitorContext.js` (session memory), `conversationManager.js` (orchestration), `kb.js` (verified facts + `resolveAction()` route validator). **It contains no LLM.** The 3D scene, speech input/output, animation sync and the composer were not touched.

## What was added
| File | Role |
|---|---|
| `api/reception.js` | Serverless endpoint `POST /api/reception` (Vercel style). Validation, rate limit, retrieval, prompt, provider call, output validation. |
| `api/_providers.js` | Provider-independent layer: `AI_PROVIDER=anthropic` or `openai` (any OpenAI-compatible chat API via `AI_BASE_URL`). Timeout (`AI_TIMEOUT_MS`, default 12 s) and one retry for 429/5xx/timeout. |
| `src/lib/knowledgeBase.js` | Builds grounding facts from `src/content` (projects incl. concept/features/materials, services, articles, categories, process, founder, contact). Retrieval = the site search index + the current subject + previously listed projects. No separate database; changes to content flow through on the next build. |
| `src/lib/siteIndex.js` / `siteSearch.js` | Shared index/search (also used by EXPLORE TOP). |
| `src/reception/aiClient.js` | Browser client. Only ever calls `/api/reception`. Treats 503/404/405 as "AI not available" and stops asking for 10 minutes; network errors back off 20 s. |
| `conversationManager.handleAI()` + `story._respond()` | Typed or spoken free text goes to the AI first; if it returns nothing, the **existing engine answers** exactly as before. Chips and card choices stay on the existing engine. |
| `.env.example` | Variable names and placeholders only. |

## Behaviour design
- **Understanding:** the system prompt tells the model to expect typos, bad grammar, fragments, informal wording and speech-recognition errors and never to ask the visitor to rephrase them.
- **Grounding:** studio facts may only come from the supplied KNOWLEDGE; no invented projects, clients, locations, prices, awards or credentials; projects are described as conceptual design explorations; unknown studio details → say so and offer Contact; general architecture questions may be answered but must be framed as general information.
- **Context:** the last 8 log lines, the current subject id and the ids of the last listed projects are sent each turn (stored in the tab's sessionStorage via the existing visitor record; nothing else personal is kept). "The second one / that one / something similar" are resolved from this.
- **Navigation:** the model returns structured `{reply, action, subject, mentioned}`. `action` is passed through `resolveAction()` on the server **and again** in `_finish()` on the client; anything not a real route/slug/category is dropped. Navigation still happens through the existing flow (speak, then open, with Skip/Back).
- **Voice:** unchanged. Speech is transcribed into the composer where the visitor reviews it before sending (existing behaviour), then goes through the same path as typed text; the reply is spoken by the existing synthesis.
- **Failure:** not configured → 503 → fall back; provider error/timeout → 502/504 → fall back; invalid model output → 502 → fall back. The Reception never crashes or shows internals.

## Security
Key only in server env; never bundled (built bundle scanned: no key names or provider URLs). Input: message ≤500 chars, control characters stripped, history ≤8 × 600 chars, only `user`/`assistant` roles, ids verified against the site index. Output: URLs stripped, length capped, actions validated. Rate limit 12 requests/min per IP (in-memory per instance: add a platform/WAF limit for a hard guarantee). Logs contain status and latency only.

## Tests actually run (`tests/receptionApi.test.mjs`, 10 tests, all pass)
not-configured → 503 · only POST · bad input → 400 · request sanitising · model output validation (URL stripped, invented slug/dest dropped, real one kept, non-JSON rejected) · full round trip with a stubbed provider (prompt contains site facts and founder name; key never in response) · provider 500 → 502, garbage → `bad_model_output`, timeout → 504 (40 ms test timeout) · rate limiting · retrieval (hotel; "what materials" with current subject; "the second one" with listed ids) · client fallback and not-configured caching · conversation: context sent on turn 2, invented slug rejected, AI-off falls back to the rule engine.
These prove the plumbing and safety rules. They do **not** prove model intelligence.

## Not verified (needs credentials / environment)
Live provider call · quality of answers to the brief's example phrases ("What service u provide?", "Do you guys make inside of houses?", …) · follow-up resolution by a real model · general-architecture answers · microphone permission, real transcription and speech playback (no microphone or audio device here) · a 15-turn real conversation.

## Privacy note
When AI is enabled, visitors' typed/spoken questions are sent to the AI provider you choose. Add suitable privacy wording for your jurisdiction before launch; none was invented here. No cookies, analytics or tracking were added.

## Switching it on
See `DEPLOYMENT_GUIDE.md` §5. After deploying, test with the checklist in §7 there and then replace "UNVERIFIED" in `FINAL_TEST_REPORT.md` with real results.
