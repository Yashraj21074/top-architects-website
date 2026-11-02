# Reception conversation engine (inbuilt, no external AI)

Everything the receptionist says is produced by our own JavaScript, in the browser, from the website's own content files. There is **no** AI model, AI API, cloud conversation service, analytics or tracking. `tests/conversation.test.mjs` contains a test that scans the conversation code and `package.json` for network calls, AI vendor names and AI packages.

## Where the knowledge lives (edit these, not the engine)
| File | Contents |
|---|---|
| `src/content/studio.js` | introduction, founder, contact details |
| `src/content/services.js`, `projects.js`, `process.js`, `team.js`, `journal.js`, `destinations.js` | the same content the website pages render, so answers cannot drift from the site |
| `src/content/knowledge.js` | extra confirmed facts. A field set to `null` means "not supplied": the receptionist says it doesn't have it. Also holds the standard "not available" line |
| `src/content/faq.js` | frequently asked questions: example phrasings, an answer built from the content above, and an optional page to offer |
| `src/reception/engine/synonyms.js` | slang, the typo-correction vocabulary, and the synonym rules that rewrite different phrasings into one canonical question |
| `src/reception/engine/ideas.js` | general architectural ideas (light, materials, circulation…), kept separate from claims about the practice |

## How a message is understood (`src/reception/engine/`)
1. `fuzzy.js` + `synonyms.js`: lowercase, expand shorthand ("ur" → "your"), correct typos towards the site vocabulary (Damerau–Levenshtein distance, only when exactly one close match exists and the word is not an ordinary English word), then rewrite synonym phrasings ("what does your firm do?" → "what services do you offer").
2. `intentResolver.js`: rules for about 30 intents; extracts the pages, project types, services and topics named; recognises references ("the second one", "tell me more", "show me some examples", "explain that") and short replies ("yes", "why?") against the pending question; matches FAQ entries by shared meaning words.
3. `visitorContext.js`: structured session state: `focus` (what the conversation is about), `list` (the last numbered list shown), `pending` (the open question), interests, visited pages, topics explained, questions asked, a capped log. Stored in this tab's sessionStorage only.
4. `responseGenerator.js`: builds the answer from the content (never from typed-in facts) and chooses wording through `repetitionGuard.js`. Ambiguous requests produce a clarification question; unanswerable ones produce the standard "not available" line plus the Contact page.
5. `conversationManager.js`: orchestration. Navigation is only ever an action validated against the real routes (`kb.js: resolveAction`); nothing can invent a URL.

## Interface and voice
Typing is always available. The microphone dictates into the field for review and never sends by itself. Browser speech recognition is performed by the browser, and some browsers use an online service for it, so voice is optional. Speech output uses the browser's built-in speech synthesis. Returning from another page does not repeat the greeting; the conversation panel is restored.

Run: `npm install`, `npm run dev`, `npm test`, `npm run check` (lint + tests + build).

## Interface (reception UI)
- The message box is a collapsible composer. It is closed by default; an "Ask" button in the conversation header opens it (heading "Ask the Receptionist", a text field with the microphone and a Send arrow, and a Close button). It never covers the scene.
- Rules live in `src/reception/composer.js` and are unit-tested: an empty message is rejected with a message; a message cannot be sent twice; on success the field is cleared and the composer closes; on failure it stays open with the text intact and an error; closing (button, Escape, choosing a page) keeps an unsent draft.
- Voice: dictation only. Recognised words go into the field for review and are never sent automatically. Pressing the mic again, or Escape, cancels.
- Returning from a page: no new greeting is spoken; the conversation panel is restored from this tab's session.
- Navigation: the seven pages only, in a two-column grid on phones.
