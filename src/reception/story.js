import { DESTINATIONS, destById } from '../content/destinations.js';
import { ConversationManager, deriveArrival } from './engine/conversationManager.js';
import { prepareSpeech, mapBoundary } from './engine/text.js';
import { visitor } from './conversation.js';
import { ReceptionAnimator } from './animationController.js';
import { createVoiceInput } from './voiceInput.js';
import { Composer } from './composer.js';
import { speaker } from '../lib/speech.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const WORK_GAZE = { x: 0.55, y: -0.02 };       // toward the monitor on his left (screen right)
const PAUSE_GAZE = { x: 0.62, y: 0.03 };
const NAV_BREATH_MS = 250;                      // a beat between the last word and the page transition
const DRAFT_KEY = 'top.reception.draft';
const RATE = { warm: [0.98, 1.0], calm: [0.95, 0.96], brisk: [1.06, 0.98], reflective: [0.93, 0.94] };

/**
 * Receptionist: attention/work state machine + conversation delivery.
 * States: WORKING, PAUSING, NOTICING_VISITOR, GREETING, LISTENING, EXPLAINING, FAREWELL, RETURNING_TO_WORK.
 *
 * WHAT is said comes from ConversationManager (src/reception/engine): structured visitor memory, intent understanding, repetition control, validated actions.
 * HOW it is delivered lives here: speech + subtitles, interruption, input (typed / spoken / suggested replies / destination cards), animation cues, navigation.
 *
 * Speech rules:
 *  - A page opens ONLY after speaker.speak() resolves with reason 'ended' (real engine completion), after Skip, or – when speech is unavailable or the visitor chose
 *    quiet mode – once the text has been fully shown.
 *  - Every line has a token (`lineTok`); every visitor turn has a token (`turnTok`). Stale completions and stale async answers are ignored,
 *    and navigation is guarded by `navTok` so it fires at most once per selection.
 */
export class Story {
  constructor({ onNavigate = null, theme = 'day' } = {}) {
    this.onNavigate = onNavigate; this.theme = theme;
    this.body = null; this.tracker = null; this.disposed = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mgr = new ConversationManager({ visitor, theme });     // the whole conversation runs locally: no network, no external AI
    this.arrival = deriveArrival(visitor.s); this.returning = this.arrival !== 'first';
    this.anim = new ReceptionAnimator();
    this.state = 'WORKING'; this.stT = 0; this.t = 0; this.att = 0; this.base = WORK_GAZE;
    this.visitorSeen = false; this.attachedAt = null; this.nextPause = 9 + Math.random() * 7; this.idleSince = 0;
    this.typing = null;          // { text, shown, boundary, done, doneAt, textOnly }
    this.look = null; this.padPrev = {}; this.driven = false;
    this.lineTok = 0; this.navTok = 0; this.turnTok = 0; this.pick = null; this.pending = null; this.speaking = false; this.currentLine = null; this.turn = null;
    this.busy = false; this.stick = true; this.preVoice = ''; this.liveEl = null; this.typEl = null;
    this.ac = new AbortController();
    this._build(); this._bind(); this._restoreLog();
    setTimeout(() => { if (!this.driven && !this.disposed) this._fallback = setInterval(() => this.update(0.1), 100); }, 2500);   // no WebGL: dialogue still runs
    this._enter('WORKING');
  }

  attach({ body, tracker }) { this.body = body; this.tracker = tracker; this.anim.attach({ body, tracker }); this.attachedAt = this.t; this._enter('WORKING'); }

  // ------------------------------------------------------------------------------------------ DOM
  _build() {
    this.root = $('story'); this.convo = $('convo'); this.msgs = $('msgs'); this.status = $('say-status'); this.choicesEl = $('choices');
    this.form = $('say-form'); this.input = $('say-input'); this.micBtn = $('say-mic'); this.sendBtn = $('say-send'); this.fab = $('ask-fab'); this.closeBtn = $('composer-close'); this.errEl = $('composer-err');
    this.toolsEl = $('story-tools'); this.tools = { skip: $('t-skip'), back: $('t-back') };
    this.root.hidden = false; this.convo.hidden = true; this.fab.hidden = true;     // the composer starts closed; the Ask button appears with the conversation
    this.cards = DESTINATIONS.map((d, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.dataset.id = d.id; b.dataset.route = d.route;
      b.innerHTML = `<span class="choice-n">0${i + 1}</span><span class="choice-label">${d.label}</span>`;
      b.setAttribute('aria-label', `${d.label} — ${d.sub}`);
      this.choicesEl.appendChild(b); return b;
    });
    this.choicesEl.hidden = false;
    // voice: dictation only. The recognised words go into the box for the visitor to review, edit and send; nothing is submitted automatically.
    this.voice = createVoiceInput({
      onInterim: (t) => { this.input.value = this.preVoice + t; this._syncSend(); },
      onFinal: (t) => this._voiceDone(t),
      onState: (st) => { this.micBtn.setAttribute('aria-pressed', String(st === 'listening')); if (st === 'listening') this._status('Listening…', 'listening'); else if (st === 'processing') this._status('Processing…', 'busy'); else if (this.status.dataset.kind === 'listening' || this.status.dataset.kind === 'busy') this._status(''); },
      onError: (msg) => { this.input.value = this.preVoice.trim(); this._syncSend(); this._status(msg, 'warn', 7000); this.input.focus({ preventScroll: true }); },
    });
    this.micBtn.title = 'Speak your question. Your browser performs the speech recognition, and some browsers use an online service for it. Typing is always available.';
    if (!this.voice.supported) { this.micBtn.classList.add('is-off'); this.micBtn.setAttribute('aria-disabled', 'true'); this.micBtn.title = 'Voice input is not supported in this browser'; }
    let draft = ''; try { draft = sessionStorage.getItem(DRAFT_KEY) || ''; } catch { /* no storage: no draft */ }
    this.composer = new Composer(draft); this.input.value = draft; this._syncSend();
  }
  /** A visitor who has been here in this session sees the same conversation again (no new greeting is spoken). */
  _restoreLog() {
    for (const m of visitor.s.log) this._addMsg(m.w, m.t, { quiet: true });
    if (visitor.s.log.length) { this.convo.hidden = false; this._syncFab(); this.stick = true; this._scroll(true); }
  }
  // ---- the collapsible composer
  _openComposer() {
    if (this.composer.isOpen || this.disposed) return;
    this.composer.open(); this.form.dataset.open = 'true'; this._syncFab(); this.fab.setAttribute('aria-expanded', 'true'); this._showError('');
    requestAnimationFrame(() => { if (this.composer.isOpen) this.input.focus({ preventScroll: true }); });     // focus after the panel becomes visible
  }
  _closeComposer({ restoreFocus = true } = {}) {
    if (this.form.dataset.open !== 'true') return;                                // decided by what is on screen (the state object may already say "closed" after a success)
    this.composer.setDraft(this.input.value).close();                             // an unsent message is kept
    if (this.voice.active) this.voice.abort();
    this.form.dataset.open = 'false'; this._syncFab(); this.fab.setAttribute('aria-expanded', 'false'); this._showError('');
    if (restoreFocus) this.fab.focus({ preventScroll: true });
  }
  _syncFab() { this.fab.hidden = this.convo.hidden || this.composer.isOpen; }
  _showError(msg) { this.errEl.textContent = msg || ''; }
  /** Sending from the composer: the composer closes ONLY after the conversation system has accepted the message; on failure it stays open with the text intact. */
  async _sendFromComposer() {
    this.composer.setDraft(this.input.value);
    const text = this.composer.begin();
    if (!text) { if (this.composer.error) { this._showError(this.composer.error); this.input.focus({ preventScroll: true }); } return; }
    this._syncSend(); this._showError('');
    const res = await this._deliverInput({ source: 'text', text });
    if (res.ok) { this.composer.succeed(); this.input.value = ''; this.preVoice = ''; try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } this._syncSend(); this._closeComposer(); }
    else { this.composer.fail(); this._showError(this.composer.error); this._syncSend(); this.input.focus({ preventScroll: true }); }
  }
  // aria-disabled (not `disabled`): Enter / Send on an empty message must still run validation and say why nothing was sent
  _syncSend() { const ok = !!this.input.value.trim() && !this.busy && !this.composer?.sending; this.sendBtn.setAttribute('aria-disabled', String(!ok)); }
  // ---- conversation panel
  _addMsg(who, text, { live = false, quiet = false } = {}) {
    const el = document.createElement('div'); el.className = `msg msg--${who}`; if (quiet) el.style.animation = 'none';
    const lab = document.createElement('span'); lab.className = 'msg__who'; lab.textContent = who === 'r' ? 'Reception' : 'You';
    const t = document.createElement('p'); t.className = 'msg__t';
    if (who === 'r' && live) {                           // the full text reserves the final height; the visible copy grows as subtitles while she speaks; screen readers get the whole line once
      const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
      const ghost = document.createElement('span'); ghost.className = 'ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.textContent = text;
      const liveEl = document.createElement('span'); liveEl.className = 'live'; liveEl.setAttribute('aria-hidden', 'true');
      t.append(sr, ghost, liveEl); el.live = liveEl;
    } else t.textContent = text;
    el.append(lab, t); this.msgs.appendChild(el);
    const all = [...this.msgs.querySelectorAll('.msg:not(.msg--typing)')]; all.forEach((m, i) => m.classList.toggle('msg--old', i < all.length - 2));
    this.convo.hidden = false; this._syncFab(); this._scroll(true); return el;
  }
  _typing(on) {
    if (on && !this.typEl) { const el = document.createElement('div'); el.className = 'msg msg--r msg--typing'; el.innerHTML = '<span class="msg__who">Reception</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">Preparing a reply</span>'; this.msgs.appendChild(el); this.typEl = el; this._scroll(true); }
    else if (!on && this.typEl) { this.typEl.remove(); this.typEl = null; }
  }
  _scroll(force = false) { if (force || this.stick) this.msgs.scrollTop = this.msgs.scrollHeight; }
  _voiceDone(text) {
    this.input.value = (this.preVoice + text).replace(/\s+/g, ' ').trim(); this._syncSend();
    this._status('Review your question, then press send.', 'hint', 6500);
    this.input.focus({ preventScroll: true }); try { this.input.setSelectionRange(this.input.value.length, this.input.value.length); } catch { /* not supported */ }
  }
  _status(t, kind = '', ttl = 0) { if (!this.status) return; clearTimeout(this._stT); this.status.textContent = t || ''; this.status.dataset.kind = t ? kind : ''; if (ttl) this._stT = setTimeout(() => { if (this.status.textContent === t) this._status(''); }, ttl); }
  _on(t, type, fn, o = {}) { t.addEventListener(type, fn, { ...o, signal: this.ac.signal }); }
  _bind() {
    const seen = () => { this.visitorSeen = true; this.idleSince = 0; speaker.unlock(); };
    for (const ev of ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel']) this._on(window, ev, seen, { passive: true });
    this.cards.forEach((b) => this._on(b, 'click', () => this.choose(b.dataset.id, b)));
    this._on(this.choicesEl, 'keydown', (e) => this._arrowNav(e));
    this._on(this.tools.skip, 'click', () => this.skip());
    this._on(this.tools.back, 'click', () => this.back());
    this._on(this.msgs, 'scroll', () => { this.stick = this.msgs.scrollHeight - this.msgs.scrollTop - this.msgs.clientHeight < 40; }, { passive: true });
    // Enter (or the send button) submits; empty text and in-flight requests are ignored
    this._on(this.form, 'submit', (e) => { e.preventDefault(); this._sendFromComposer(); });          // Enter and the Send button both land here
    this._on(this.fab, 'click', () => this._openComposer());
    this._on(this.closeBtn, 'click', () => this._closeComposer());
    this._on(this.input, 'input', () => {
      if (this.speaking || this.state === 'GREETING' || this.state === 'EXPLAINING') this._interrupt();
      this.anim.set('listening'); this._syncSend();
      try { this.input.value ? sessionStorage.setItem(DRAFT_KEY, this.input.value) : sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      this.composer.setDraft(this.input.value); this._showError('');
    });
    this._on(this.input, 'focus', () => { speaker.unlock(); });
    this._on(this.micBtn, 'click', () => {
      speaker.unlock();
      if (!this.voice.supported) { this._status('Voice input isn’t supported in this browser. Please type your question.', 'warn', 6500); return; }
      if (this.voice.active) { this._cancelVoice(); return; }                              // second press = cancel
      this.preVoice = this.input.value ? this.input.value.trim() + ' ' : '';
      this._interrupt(); this.anim.set('listening'); this.anim.cue('tilt'); this.voice.start();
    });
    this._on(window, 'keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.voice.active) { e.preventDefault(); this._cancelVoice(); return; }
      if (this.composer.isOpen) { e.preventDefault(); this._closeComposer(); return; }
      this.back();
    });
    // on-screen keyboard: keep the input in view and step the page list aside while typing
    const vv = window.visualViewport;
    if (vv) {
      const host = this.root.parentElement;
      const upd = () => {
        const open = window.innerHeight - vv.height > 140;
        this.root.classList.toggle('kbd', open);
        host.style.height = open ? `${vv.height}px` : ''; host.style.transform = open ? `translateY(${vv.offsetTop}px)` : '';
      };
      this._on(vv, 'resize', upd); this._on(vv, 'scroll', upd);
    }
    this._on(window, 'pagehide', () => this.dispose(), { once: true });
    this._on(window, 'top-theme', (e) => { this.theme = e.detail; this.mgr.setTheme(e.detail); });
  }
  _cancelVoice() { this.voice.abort(); this.input.value = this.preVoice.trim(); this.composer.setDraft(this.input.value); this._syncSend(); this._status('Voice input cancelled.', 'hint', 2500); }
  dispose() { if (this.disposed) return; this.disposed = true; this.lineTok++; this.navTok++; this.turnTok++; this.ac.abort(); clearInterval(this._fallback); clearTimeout(this._navTimer); clearTimeout(this._byeTimer); this.voice?.abort(); clearTimeout(this._stT); const h = this.root?.parentElement; if (h) { h.style.height = ''; h.style.transform = ''; } if (this.speaking) this.mgr.noteInterrupted(this.turn); speaker.cancel(); }

  _arrowNav(e) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }; if (!(e.key in keys)) return;
    e.preventDefault(); const i = this.cards.indexOf(document.activeElement);
    this.cards[(i + keys[e.key] + this.cards.length) % this.cards.length].focus();
  }

  // ------------------------------------------------------------------------------------------ speech + subtitles
  /**
   * Show `text` as subtitles while speaking it. Resolves { reason, tok } – callers must check `tok === this.lineTok`.
   * The spoken form (pronunciation fixes) has the same word count as the caption, so boundary events map word-for-word.
   * With `silent` (quiet mode) nothing is spoken: the text appears at reading pace.
   */
  async _say(text, { silent = false, delivery = 'calm' } = {}) {
    const tok = ++this.lineTok; this.currentLine = text;
    clearTimeout(this._navTimer);
    this.liveEl = this._addMsg('r', text, { live: true }).live;    // the message reserves its final height up front, so nothing moves while the subtitles grow
    this.typing = { text, shown: 0, boundary: false, done: false, textOnly: false, speechStarted: false };
    this.liveEl.textContent = this.reduced ? text : '';
    if (this.reduced) { this.typing.shown = text.length; this.typing.done = true; this.typing.doneAt = this.t; }
    if (silent) { this.typing.textOnly = true; this.speaking = false; this.anim.setSpeaking(false); return { reason: 'unavailable', tok }; }
    this.speaking = true; this.anim.setSpeaking(true);
    const spoken = prepareSpeech(text); const [rate, pitch] = RATE[delivery] || RATE.calm;
    const res = await speaker.speak(spoken, {
      rate, pitch,
      onStart: () => { if (tok === this.lineTok && this.typing) this.typing.speechStarted = true; },
      onBoundary: (i, len) => {
        if (tok !== this.lineTok || !this.typing) return;
        const ty = this.typing; ty.boundary = true;
        ty.shown = Math.max(ty.shown, Math.min(text.length, mapBoundary(spoken, text, i, len)));
        this.body?.speakKick?.();
      },
    });
    if (tok !== this.lineTok || this.disposed) return { reason: 'stale', tok };
    this.speaking = false; this.anim.setSpeaking(false);
    const ty = this.typing;
    if (res.reason === 'ended') this._showAll();
    else if (res.reason === 'unavailable' || res.reason === 'error') { if (ty) { ty.textOnly = true; } }   // text-only: reveal continues at reading pace
    return { reason: res.reason, tok };
  }
  _showAll() { const ty = this.typing; if (ty && !ty.done) { ty.shown = ty.text.length; if (this.liveEl) this.liveEl.textContent = ty.text; this._scroll(); ty.done = true; ty.doneAt = this.t; } }
  _stopSpeech() { this.lineTok++; this.speaking = false; this.anim.setSpeaking(false); speaker.cancel(); }
  /** The visitor started to type / speak / chose something while the receptionist was talking: stop gracefully, remember what was being said, listen. */
  _interrupt() {
    if (this.speaking) this.mgr.noteInterrupted(this.turn);
    this._stopSpeech(); this._showAll(); this.navTok++; clearTimeout(this._navTimer); clearTimeout(this._byeTimer); this.pending = null;
  }

  // ------------------------------------------------------------------------------------------ visitor input
  /** Typed or (reviewed and sent) spoken text. */
  submit(text, source = 'text') { return this._deliverInput({ source, text }); }
  /** A page from the list. Allowed at any time; a new selection cleanly replaces an active one. */
  choose(id, el) {
    const d = destById(id); if (!d) return;
    if (this.state === 'EXPLAINING' && this.pick?.id === id && !this.pick.slug && !this.pick.category) return;
    const r = (el || this.cards[0]).getBoundingClientRect();
    this.look = { x: clamp(((r.left + r.width / 2) / innerWidth) * 2 - 1, -1, 1), y: clamp(-(((r.top + r.height / 2) / innerHeight) * 2 - 1), -1, 1), until: this.t + 2.2 };
    this._select(id); this._closeComposer({ restoreFocus: false });
    return this._deliverInput({ source: 'choice', go: { dest: id }, text: `Take me to ${d.label}` });
  }
  _select(id) { this.cards.forEach((c) => { if (c.dataset.id === id) c.dataset.selected = 'true'; else delete c.dataset.selected; }); }

  /** Returns { ok } so the composer knows whether the conversation system accepted the message. Duplicates return { ok: false, dup: true } and show nothing. */
  async _deliverInput(input) {
    if (this.disposed) return { ok: false, dup: true };
    if (this.busy && input.source !== 'choice') return { ok: false, dup: true };    // one request at a time: no duplicate submissions
    const sig = JSON.stringify(input), now = performance.now();
    if (sig === this._lastSig && now - this._lastAt < 700) return { ok: false, dup: true };   // double click / double tap
    this._lastSig = sig; this._lastAt = now;
    speaker.unlock(); this.visitorSeen = true; this.idleSince = 0;
    this._interrupt();
    const tok = ++this.turnTok;
    this.busy = true; this._syncSend(); this._status('');
    this.anim.set('listening'); this.anim.cue('tilt', 1.2);
    const echo = input.text ? this._addMsg('v', input.text) : null;
    this._typing(true);                                                           // discreet "preparing a reply" dots
    let turn;
    try { [turn] = await Promise.all([Promise.resolve().then(() => this.mgr.handle(input)), new Promise((r) => setTimeout(r, this.reduced ? 0 : 380))]); }
    catch (e) {                                                                   // not accepted: nothing is shown as sent, and the caller keeps the text
      console.warn('conversation error', e); this._typing(false); echo?.remove(); if (tok === this.turnTok) this.busy = false; this._syncSend();
      return { ok: false };
    }
    this._typing(false);
    if (tok === this.turnTok) { this.busy = false; this._syncSend(); }
    if (tok !== this.turnTok || this.disposed) return { ok: true };               // accepted, but a newer visitor turn replaced its answer
    this._deliver(turn); return { ok: true };
  }
  _deliver(turn) {
    this.turn = turn;
    if (turn.resolved) { this.pick = turn.resolved; this._select(turn.resolved.id); this.navTok++; this._enter('EXPLAINING'); }
    else if (turn.farewell) this._enter('FAREWELL');
    else this._enter('LISTENING');
  }

  skip() {
    if (this.state === 'EXPLAINING') { this._stopSpeech(); this._showAll(); this._navigate(this.navTok); }      // Skip: go now
    else if (this.state === 'GREETING') { this._stopSpeech(); this._showAll(); this._enter('LISTENING', { keep: true }); }
    else if (this.state === 'LISTENING' || this.state === 'FAREWELL') { this._stopSpeech(); this._showAll(); }
    else if (this.state === 'NOTICING_VISITOR') this._enter('GREETING');
  }
  back() {
    if (this.state !== 'EXPLAINING') return;                                     // Back only means something while a selection is pending
    this._stopSpeech(); this.navTok++; this.pick = null; this._select(null); this.turn = this.mgr.cancelNavigation(); this._enter('LISTENING');
  }

  // ------------------------------------------------------------------------------------------ state machine
  _enter(s, opts = {}) {
    this.state = s; this.stT = 0; document.body.dataset.story = s;
    const b = this.body;
    switch (s) {
      case 'WORKING': if (b) { b.autoPoses = false; b.request('typing'); b.facingTarget = 8; } this.visitorSeen = !!this.returning; this.base = WORK_GAZE; this.anim.set('idle');
        this.nextPause = 8 + Math.random() * 9; break;
      case 'PAUSING': if (b) { b.request('mouse'); b.facingTarget = 9; } this.base = PAUSE_GAZE; break;
      case 'NOTICING_VISITOR': if (b) { b.autoPoses = false; b.request('rest'); b.facingTarget = 0; } this.anim.set(this.returning ? 'returning' : 'greeting'); break;
      case 'GREETING': {                                                           // hands stay relaxed on the desk
        if (b) { b.facingTarget = 0; b.autoPoses = true; b.request('rest'); }
        this.convo.hidden = false; this._syncFab();                                  // the Ask button appears with the conversation panel
        if (this.arrival !== 'first') {                                            // already welcomed in this session: no new greeting, the conversation is simply there
          this.mgr.resume(); this.anim.set('returning'); this.anim.cue('nod'); this._enter('LISTENING', { keep: true }); return;
        }
        this.anim.set('greeting'); this.anim.cue('nod');
        this.turn = this.mgr.open(); this._present(this.turn, 'listen'); break; }
      case 'LISTENING': if (b) { b.autoPoses = true; b.request('rest'); } this.idleSince = 0; this.anim.set('listening');
        if (!opts.keep && this.turn) this._present(this.turn, 'none'); break;
      case 'EXPLAINING': {
        if (b) { b.autoPoses = true; b.request('rest'); b.facingTarget = 0; }
        this.anim.set('explaining'); this.navTok++; this._present(this.turn, 'navigate'); break; }
      case 'FAREWELL': if (b) { b.autoPoses = true; b.request('rest'); b.facingTarget = 0; } this.anim.set('farewell'); this._present(this.turn, 'farewell'); break;
      case 'RETURNING_TO_WORK': if (b) { b.facingTarget = 8; b.autoPoses = false; b.request('typing'); } this.base = WORK_GAZE; this.anim.set('idle'); break;
    }
    this._tools();
  }
  _present(turn, then) { this.anim.forTurn(turn); this._speakAndThen(turn.spoken, then, turn); }
  _tools() {
    this.tools.skip.hidden = !((this.state === 'GREETING' && this.arrival === 'first') || this.state === 'EXPLAINING' || this.speaking);   // only while there is something to skip
    this.tools.back.hidden = this.state !== 'EXPLAINING';
    this.toolsEl.hidden = this.tools.skip.hidden && this.tools.back.hidden;
  }

  /** Speak `text`, then act ONLY on a genuine, current completion. `then`: 'navigate' | 'listen' | 'farewell' | 'none'. */
  async _speakAndThen(text, then, turn = null) {
    const navTok = this.navTok, silent = !!turn?.silent;
    const { reason, tok } = await this._say(text, { silent, delivery: turn?.delivery });
    this._tools();
    if (reason === 'stale' || reason === 'cancelled') return;                       // interrupted: never navigate
    if (tok !== this.lineTok || this.disposed) return;
    if (then === 'navigate') {
      if (reason === 'ended') this._navTimer = setTimeout(() => this._navigate(navTok), NAV_BREATH_MS);
      else this.pending = { navTok, tok, textOnly: true };                           // speech unavailable / quiet: update() navigates once the text is fully shown
    } else if (then === 'listen') {
      if (this.state === 'GREETING') { if (reason === 'ended') this._enter('LISTENING', { keep: true }); else this.pending = { listen: true, tok, textOnly: true }; }
    } else if (then === 'farewell') {
      if (this.state === 'FAREWELL') { if (reason === 'ended') this._byeTimer = setTimeout(() => this.state === 'FAREWELL' && this._enter('RETURNING_TO_WORK'), 1600); else this.pending = { bye: true, tok, textOnly: true }; }
    }
  }

  _navigate(navTok) {
    if (this.disposed || navTok !== this.navTok || !this.pick || this.navigated === navTok) return;
    this.navigated = navTok; this.pending = null;                                    // at most once per selection
    const d = this.pick; this.body?.request('rest'); this.anim.set('leaving'); this.anim.cue('nod');
    this.mgr.noteDeparture(this.turn);
    this.onNavigate?.(d);
  }

  // ------------------------------------------------------------------------------------------ per-frame
  update(dtRaw) {
    this.driven = true; const dt = clamp(dtRaw, 0, 0.1); this.t += dt; this.stT += dt;
    const ty = this.typing;
    if (ty && !ty.done) {
      if (ty.textOnly) { ty.shown = Math.min(ty.text.length, ty.shown + dt * 26); }                      // reading-pace reveal (speech unavailable / quiet)
      else if (!ty.boundary && ty.speechStarted) { ty.shown = Math.min(ty.text.length * 0.95, ty.shown + dt * 14); }   // display-only estimate until the engine reports boundaries
      const n = Math.floor(ty.shown);
      if (n !== ty.lastN) { ty.lastN = n; if (this.liveEl) this.liveEl.textContent = ty.text.slice(0, n); this._scroll(); }
      if (ty.shown >= ty.text.length) { ty.done = true; ty.doneAt = this.t; if (this.liveEl) this.liveEl.textContent = ty.text; }
    }
    const pend = this.pending;
    if (pend && ty?.done && pend.tok === this.lineTok && this.t - ty.doneAt > 0.9) {
      this.pending = null;
      if (pend.navTok != null) this._navigate(pend.navTok); else if (pend.listen && this.state === 'GREETING') this._enter('LISTENING', { keep: true }); else if (pend.bye && this.state === 'FAREWELL') this._enter('RETURNING_TO_WORK');
    }
    const sinceAttach = this.attachedAt == null ? (this.body ? 0 : this.t) : this.t - this.attachedAt;
    const noGL = !this.body;

    switch (this.state) {
      case 'WORKING':
        if ((this.visitorSeen && sinceAttach > 2.6 && this.stT > 2.4) || (this.stT > 5.5 && sinceAttach > 5.5) || (noGL && this.stT > 0.8)) this._enter('NOTICING_VISITOR');
        else if (this.stT > this.nextPause) this._enter('PAUSING');
        break;
      case 'PAUSING':
        if (this.visitorSeen && sinceAttach > 2.6) this._enter('NOTICING_VISITOR');
        else if (this.stT > 3.2 + (this.nextPause % 2.5)) this._enter('WORKING');
        break;
      case 'NOTICING_VISITOR': if (this.stT > (noGL ? 0.1 : this.returning ? 0.9 : 1.7)) this._enter('GREETING'); break;   // someone coming back is noticed sooner
      case 'LISTENING': this.idleSince += dt; if (this.idleSince > 75 && !noGL && !this.speaking && document.activeElement !== this.input && !this.voice.active) this._enter('RETURNING_TO_WORK'); break;
      case 'RETURNING_TO_WORK': if (this.stT > 2.2) this._enter('WORKING'); break;
    }

    // natural speaking: subtle head motion only (hands never leave the desk); the animator guarantees speaking and listening never overlap
    this.anim.frame();

    const tr = this.tracker;
    if (tr) {
      const attending = !['WORKING', 'PAUSING', 'RETURNING_TO_WORK'].includes(this.state);
      const k = 1 - Math.exp(-dt * (attending ? 2.4 : 1.6));
      this.att += ((attending ? 1 : 0) - this.att) * k; tr.attend = this.att; tr.base.x = this.base.x; tr.base.y = this.base.y;
      if (this.look && this.t < this.look.until) { tr.target.x = this.look.x; tr.target.y = this.look.y; } else this.look = null;
    }
    this.pollPad();
  }

  // ------------------------------------------------------------------------------------------ gamepad menu navigation
  pollPad() {
    if (!navigator.getGamepads) return;
    let p = null; for (const g of navigator.getGamepads()) if (g && g.connected && g.buttons?.length >= 4) { p = g; break; }
    if (!p) return;
    const edge = (i) => { const d = !!p.buttons[i]?.pressed, was = this.padPrev[i]; this.padPrev[i] = d; return d && !was; };
    const list = this.cards;
    const move = (dir) => { const i = list.indexOf(document.activeElement); list[(i + dir + list.length) % list.length].focus(); };
    if (edge(14) || edge(12)) move(-1); if (edge(15) || edge(13)) move(1);
    if (edge(0)) { const a = document.activeElement; if (a && (list.includes(a) || a.closest?.('#story-tools'))) a.click(); else list[0].focus(); }
    if (edge(1)) this.back();
  }
}
