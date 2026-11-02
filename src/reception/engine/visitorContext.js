import { kb } from './kb.js';
import { trunc } from './text.js';

/**
 * Structured visitor memory for ONE browser tab (sessionStorage: gone when the tab closes, never shared between tabs or visitors, nothing sent anywhere).
 * Only things the visitor actually said or the application observed are stored: no guesses, no personal data, no names.
 */
export const KEY = 'top.visitor.v2';
const MAX_HISTORY = 20, MAX_TRAIL = 12, MAX_Q = 8, MAX_LOG = 14, LOG_CHARS = 520;
export class MemoryStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
export const browserStorage = () => { try { const s = globalThis.sessionStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s; } catch { return new MemoryStorage(); } };

const blank = () => ({
  v: 2, phase: 'arrival', receptions: 0, purpose: null, interests: [], preferences: {}, visited: [], trail: [], lastVisit: null, departure: null,
  tour: { status: 'none' }, asked: {}, answers: {}, explained: [], visitorQs: [], history: [], summary: { turns: 0, topics: {} },
  pending: null, focus: null, list: null, log: [], lastInteractionAt: 0, farewelled: false, unfinished: null, turn: 0, unknownStreak: 0, flags: {},
});

export class VisitorContext {
  constructor(storage = browserStorage(), now = () => Date.now()) { this.storage = storage; this.now = now; this.s = this._load(); }
  _load() { try { const o = JSON.parse(this.storage.getItem(KEY)); return o && o.v === 2 ? { ...blank(), ...o } : blank(); } catch { return blank(); } }
  save() { try { this.storage.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage full or blocked: memory only */ } }
  reset() { this.s = blank(); this.save(); }

  // ---- what the visitor did on the website -------------------------------------------------------------------------------------------
  /** Called on every route change. Records which real page/slug the visitor looked at, so a return to the reception can refer to it. */
  noteRoute(pathname) {
    const m = String(pathname).match(/^\/(studio|projects|services|process|team|journal|contact)(?:\/([\w-]+))?/);
    const destOf = { studio: 'about' };
    if (!m) return;
    const dest = destOf[m[1]] || m[1], slug = m[2] || null;
    const hit = slug ? (dest === 'projects' ? kb.projects : dest === 'services' ? kb.services : dest === 'journal' ? kb.articles : []).find((x) => x.slug === slug) : null;
    const entry = { dest, slug: hit ? slug : null, title: hit?.title || null, at: this.now() };
    const last = this.s.trail[this.s.trail.length - 1];
    if (last && last.dest === dest && last.slug === entry.slug) return;
    this.s.trail = [...this.s.trail, entry].slice(-MAX_TRAIL);
    if (!this.s.visited.includes(dest)) this.s.visited.push(dest);
    this.s.lastVisit = entry; this.s.lastInteractionAt = entry.at;
    if (this.s.tour.status === 'none') this.s.tour = { status: 'started' };
    this._tourCheck(); this.save();
  }
  _tourCheck() { if (['about', 'projects', 'services', 'process'].every((d) => this.s.visited.includes(d))) this.s.tour = { status: 'completed' }; }
  /** The visitor leaves the reception for a page (chosen through the receptionist). */
  noteDeparture(dest, detail = {}) { this.s.departure = { dest, slug: detail.slug || null, category: detail.category || null, at: this.now(), mid: !!detail.mid }; this.s.farewelled = false; this.save(); }
  /** The visitor is (back) in the reception: everything they explored since leaving. */
  noteReception() { this.s.receptions += 1; this.save(); }
  explored() { const at = this.s.departure?.at ?? 0; return this.s.trail.filter((t) => t.at >= at); }
  clearDeparture() { this.s.departure = null; this.save(); }

  // ---- conversation -------------------------------------------------------------------------------------------------------------------
  nextTurn() { this.s.turn += 1; return this.s.turn; }
  addTurn(who, text, intent) {
    this.s.history.push({ w: who, t: trunc(String(text), 220), i: intent || null, n: this.s.turn });
    while (this.s.history.length > MAX_HISTORY) {                                   // compact older exchanges into counters instead of growing forever
      const old = this.s.history.shift(); this.s.summary.turns += 1;
      if (old.i) this.s.summary.topics[old.i] = (this.s.summary.topics[old.i] || 0) + 1;
    }
    this.s.lastInteractionAt = this.now();
  }
  /** The conversation as shown on screen (who said what), kept for this tab so the panel can be restored when the visitor returns. */
  addLog(who, text) { if (!text) return; this.s.log = [...this.s.log, { w: who, t: trunc(String(text), LOG_CHARS) }].slice(-MAX_LOG); }
  recent(n = 6) { return this.s.history.slice(-n); }
  addInterest(i) { if (i && !this.s.interests.includes(i)) this.s.interests = [...this.s.interests, i].slice(-8); }
  hasInterest(i) { return this.s.interests.includes(i); }
  explain(topic) { if (topic && !this.s.explained.includes(topic)) this.s.explained = [...this.s.explained, topic].slice(-20); }
  wasExplained(topic) { return this.s.explained.includes(topic); }
  noteVisitorQuestion(q) { this.s.visitorQs = [...this.s.visitorQs, q].slice(-MAX_Q); }
  asked(key) { this.s.asked[key] = this.s.turn; }
  answer(key, value) { this.s.answers[key] = value; }
  /** A question may be asked when it has not been answered, was not asked recently, and the visitor has not asked for quiet. */
  canAsk(key, cooldown = 8) { return !(key in this.s.answers) && !(key in this.s.asked && this.s.turn - this.s.asked[key] < cooldown) && !this.s.preferences.noQuestions; }
  setPending(p) { this.s.pending = p || null; }
  clearPending() { this.s.pending = null; }
  /** What the conversation is currently ABOUT ({type:'service', id…}) and the last numbered list shown ({type:'services', ids:[…], at}). Follow-ups such as "the second one" or "tell me more" resolve against these. */
  setFocus(f) { this.s.focus = f ? { ...f, turn: this.s.turn } : null; }
  setList(l) { this.s.list = l ? { ...l, turn: this.s.turn } : null; }
  set(k, v) { this.s[k] = v; }
  setPref(k, v) { this.s.preferences = { ...this.s.preferences, [k]: v }; }
  snapshot() { return JSON.parse(JSON.stringify(this.s)); }
}
