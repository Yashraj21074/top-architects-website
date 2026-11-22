import { firstWords, similarity, norm } from './text.js';

// Stock phrases that are fine now and then but feel robotic when they dominate. They are allowed at most once per WINDOW lines.
const STOCK = ['welcome to top architects', 'how can i help you today', "that's interesting", 'that is interesting', 'absolutely', 'wonderful', 'let me show you around', 'how was your experience', 'anything else i can help', 'is there anything else', 'of course', 'certainly', 'great question', 'sounds exciting', 'sounds wonderful'];
const WINDOW = 7, SIMILAR = 0.62;

/**
 * Keeps a rolling record of what the receptionist has said and scores candidate wording against it:
 *  • near-duplicate sentences (word + word-pair overlap, not exact match)        • the same opening words as a recent line
 *  • repeated acknowledgement class ('agree', 'praise'…)                            • stock phrases used recently
 *  • the same follow-up question (by key) asked again too soon.
 * `choose(slot, candidates)` returns the least repetitive candidate; `commit(text)` records what was finally said.
 */
export class RepetitionGuard {
  constructor({ rng = Math.random, recent = [] } = {}) { this.rng = rng; this.lines = recent.slice(-24); this.slots = {}; this.cls = []; this.keys = []; }
  /** Restore after a page reload / remount: pass the receptionist's recent lines. */
  load(lines) { this.lines = (lines || []).slice(-24); }
  _score(text, cls, slot, avoid = []) {
    let p = 0; const recent = this.lines.slice(-8);
    recent.forEach((l, i) => { const w = 0.5 + 0.5 * ((i + 1) / recent.length); const s = similarity(text, l); if (s > 0.3) p += s * 2 * w; });
    (this.slots[slot] || []).slice(-5).forEach((l, i, a) => { const s = similarity(text, l); if (s > 0.25) p += s * 3 * (0.6 + 0.4 * ((i + 1) / a.length)); });
    const op = firstWords(text, 2); if (op) recent.slice(-4).forEach((l) => { if (firstWords(l, 2) === op) p += 0.9; });
    if (cls && this.cls.slice(-2).includes(cls)) p += 1.2;
    const t = norm(text); for (const s of STOCK) if (t.includes(s) && recent.slice(-WINDOW).some((l) => norm(l).includes(s))) p += 2.2;
    if (avoid.includes(text)) p += 5;
    return p;
  }
  /** candidates: strings or { t, cls }. Returns the chosen text; ties are broken at random so equal options still rotate. */
  choose(slot, candidates, avoid = []) {
    const c = candidates.map((x) => (typeof x === 'string' ? { t: x } : x)).filter((x) => x && x.t);
    if (!c.length) return '';
    const scored = c.map((x) => ({ x, s: this._score(x.t, x.cls, slot, avoid) + this.rng() * 0.15 }));
    scored.sort((a, b) => a.s - b.s);
    const best = scored[0].x; (this.slots[slot] = this.slots[slot] || []).push(best.t); if (best.cls) this.cls.push(best.cls);
    this.slots[slot] = this.slots[slot].slice(-8); this.cls = this.cls.slice(-6);
    return best.t;
  }
  /** Highest similarity of `text` to any of the last `n` receptionist lines. */
  maxSimilarity(text, n = 4) { return this.lines.slice(-n).reduce((m, l) => Math.max(m, similarity(text, l)), 0); }
  isRepeat(text) { return this.maxSimilarity(text) >= SIMILAR; }
  commit(text) { this.lines.push(text); this.lines = this.lines.slice(-24); }
  noteAsked(key, turn) { this.keys.push({ key, turn }); this.keys = this.keys.slice(-12); }
  askedRecently(key, turn, cooldown = 8) { return this.keys.some((k) => k.key === key && turn - k.turn < cooldown); }
}
export const SIMILAR_THRESHOLD = SIMILAR;
