import { VisitorContext, browserStorage } from './visitorContext.js';
import { RepetitionGuard } from './repetitionGuard.js';
import { resolveIntent } from './intentResolver.js';
import { makeGenerator } from './responseGenerator.js';
import { resolveAction } from './kb.js';
import { sentences, similarity } from './text.js';

const NAV_INTENTS = new Set(['go_dest', 'view_category', 'show_project', 'show_article', 'service_detail', 'process', 'farewell', 'quiet', 'unquiet', 'inquiry', 'curiosity', 'help']);
const STAY = new Set(['reply']);

/** What kind of arrival is this? Derived ONLY from state the application recorded in this tab's session. Never claims to recognise anyone from a previous visit. */
const ctx_clear = (v) => v.clearPending();
export function deriveArrival(s) {
  if (s.farewelled) return 'after_farewell';
  if (s.unfinished) return 'interrupted';
  if (s.receptions === 0) return 'first';
  if (s.departure) return 'returning';
  return 'revisit';
}

/**
 * Orchestrates one conversation: visitor input → intent → structured context update → response → validation → memory.
 * Synchronous and DOM-free (the Story class owns speech, subtitles, animation and navigation), so the whole flow is unit-testable in Node.
 */
export class ConversationManager {
  constructor({ storage = browserStorage(), now = () => Date.now(), rng = Math.random, theme = 'day', visitor = null } = {}) {
    this.visitor = visitor || new VisitorContext(storage, now); this.guard = new RepetitionGuard({ rng });
    this.guard.load(this.visitor.s.history.filter((h) => h.w === 'r').map((h) => h.t));
    this.theme = theme; this.seq = 0;
  }
  get state() { return this.visitor.s; }
  _gen() { return makeGenerator({ ctx: this.visitor, guard: this.guard, theme: this.theme }); }

  /** The receptionist's first words on arrival: a welcome, or a continuation of the existing conversation. */
  open() {
    const v = this.visitor, kind = deriveArrival(v.s);
    v.nextTurn();
    const turn = this._finish(this._gen().open({ kind }));
    v.noteReception(); v.set('farewelled', false); v.set('unfinished', null); v.clearDeparture();
    v.save(); return { ...turn, arrival: kind };
  }

  /** A visitor who has already been welcomed in this session comes back: NO new greeting. Bookkeeping only; the panel restores `state.log`. */
  resume() {
    const v = this.visitor, kind = deriveArrival(v.s);
    v.noteReception(); v.set('farewelled', false); v.clearDeparture(); v.save();
    return { arrival: kind, messages: v.s.log.slice() };
  }

  /** input: { source: 'text'|'voice'|'chip'|'choice', text?: string, go?: {dest, slug?, category?} } */
  handle(input) {
    const v = this.visitor, g = this._gen();
    v.nextTurn(); this.seq++;
    let turn, label = input.text || '';
    if (input.go) {
      const r = resolveAction({ type: 'navigate', ...input.go });
      turn = r ? g.navTurn({ type: 'navigate', ...input.go }) : g.unknown(); label = label || `(chose ${input.go.dest})`;
      if (r) v.clearPending();
    } else {
      const r = resolveIntent(input.text, v.s); const p = v.s.pending;
      if (/\?\s*$/.test(String(input.text || '')) || /^(how|why|what|where|who|when|can|could|do|does|is|are)\b/i.test(String(input.text || '').trim())) v.noteVisitorQuestion(r.text);
      if (r.category) v.addInterest(r.category);
      if (v.s.farewelled) v.set('farewelled', false);
      turn = null;
      if (p?.key === 'projects.category' && r.category && !['farewell', 'quiet'].includes(r.intent)) { r.intent = 'view_category'; }
      if (p?.key === 'projects.category' && /\b(all|everything|every|whole)\b/.test(r.text)) { r.intent = 'go_dest'; r.dest = 'projects'; ctx_clear(v); }
      if (p?.kind === 'hoping' && !NAV_INTENTS.has(r.intent) && r.intent !== 'farewell') turn = g.answerHoping(r);
      if (!turn && p?.kind === 'focus' && !['go_dest', 'show_project', 'show_article', 'service_detail', 'farewell', 'quiet', 'reply'].includes(r.intent)) turn = g.answerFocus(r, p);
      if (!turn && (p?.kind === 'feedback' || p?.kind === 'standout') && ['browse', 'unknown'].includes(r.intent)) turn = g.handle({ ...r, intent: 'feedback', polarity: r.polarity || 'neutral' });
      if (!turn) turn = g.handle(r);
      turn.recognized = r.intent;
    }
    v.addTurn('v', label || '(input)', turn.recognized || turn.intent); if (input.text) v.addLog('v', input.text);
    return this._finish(turn);
  }

  /** Validate, de-duplicate and remember. */
  _finish(turn) {
    const v = this.visitor; const t = { ...turn };
    if (t.action) { const r = resolveAction(t.action); if (r) t.resolved = r; else { t.action = null; t.resolved = null; } }
    // near-duplicate of a recent line: say it more briefly rather than repeat it
    // near-duplicate of a recent line: drop only the sentences that repeat it and keep what is new (only conversational lines: factual answers are never shortened, and the standard "not available" line is deliberately the same each time)
    if (/^(topic|react|open|hello|thanks)/.test(t.intent || '') && this.guard.isRepeat(t.spoken) && sentences(t.spoken).length > 1) {
      const recent = this.guard.lines.slice(-4), parts = sentences(t.spoken), fresh = parts.filter((p) => !recent.some((l) => similarity(p, l) >= 0.6));
      t.spoken = (fresh.length ? fresh : parts.slice(-1)).join(' ');
    }
    t.spoken = t.spoken.replace(/\s+/g, ' ').trim();
    this.guard.commit(t.spoken);
    v.addTurn('r', t.spoken, t.intent); v.addLog('r', t.spoken);
    v.set('phase', t.phase || v.s.phase);
    v.setPending(t.pending || null);
    if (t.farewell) v.set('farewelled', true);
    if (t.action && t.resolved) v.set('lastOffer', { dest: t.action.dest, slug: t.action.slug || null });
    t.silent = !!v.s.preferences.silent || t.delivery === 'silent';
    v.set('unfinished', null);
    v.save(); return t;
  }

  // ---- lifecycle hooks the application calls ---------------------------------------------------------------------------------------
  /** The visitor pressed Back while a page was about to open. */
  cancelNavigation() { this.visitor.nextTurn(); return this._finish(this._gen().cancelNav()); }
  noteDeparture(turn) { const a = turn?.resolved || turn?.action; if (a) this.visitor.noteDeparture(a.dest || a.id, { slug: a.slug, category: a.category }); }
  /** The visitor interrupted, or left, while the receptionist was mid-sentence: remember what was being said so it can be resumed. */
  noteInterrupted(turn) { if (turn && turn.topic) { this.visitor.set('unfinished', { topic: turn.topic, intent: turn.intent }); this.visitor.save(); } }
  setTheme(t) { this.theme = t; }
}
