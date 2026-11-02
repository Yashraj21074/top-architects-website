import { ConversationManager } from '../src/reception/engine/conversationManager.js';
import { MemoryStorage } from '../src/reception/engine/visitorContext.js';
export const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const mk = (opts = {}) => { const storage = opts.storage || new MemoryStorage(); return { storage, m: new ConversationManager({ storage, rng: seeded(opts.seed || 7), theme: opts.theme || 'day', now: opts.now || (() => 1_700_000_000_000) }) }; };
export const say = (m, text) => m.handle({ source: 'text', text });
// Simulates the application after a navigation: visitor opens a page (via the receptionist), browses, comes back.
export const visit = (m, path, { leaveVia = null } = {}) => { if (leaveVia) m.noteDeparture(leaveVia); m.visitor.noteRoute(path); };
