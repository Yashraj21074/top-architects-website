/**
 * Speech playback with a REAL completion signal.
 * `speak()` resolves with { reason } where reason is:
 *   'ended'       – the browser's speech engine reported that the utterance finished (the only "spoken completely" signal)
 *   'cancelled'   – cancel()/a newer speak() interrupted it (callers must NOT navigate)
 *   'unavailable' – no usable speech (unsupported, blocked by autoplay policy, no voice, or the engine never started)
 *   'error'       – the engine reported a failure
 * Durations are never guessed from text length. The only timer is a start-watchdog that detects an engine that never starts.
 */
const START_WATCHDOG_MS = 3500;

class Speaker {
  constructor() { this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window; this.unlocked = false; this.blocked = false; this.job = null; this.seq = 0; }

  /** Call from a deliberate user gesture (e.g. clicking Enter 3D Reception). Primes the engine so later speech is allowed. */
  unlock() {
    if (!this.supported || this.unlocked) return;
    try { speechSynthesis.resume?.(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this.unlocked = true; } catch { /* keep working without speech */ }
  }

  pickVoice() {
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); if (!vs.length) return null;
    const score = (v) => { const n = v.name; let s = 0;
      if (/natural|neural|online|premium|enhanced/i.test(n)) s += 6;
      if (/(google uk english male|daniel|george|ryan|guy|aaron|arthur|oliver|james|mark|david|alex|ravi|rishi)/i.test(n)) s += 4;
      if (/(female|zira|samantha|susan|hazel|karen|victoria|fiona|moira|tessa|libby|sonia|jenny|aria)/i.test(n)) s -= 6;
      if (/^en-(GB|IN|AU)/i.test(v.lang)) s += 2; else if (/^en-US/i.test(v.lang)) s += 1;
      if (/espeak|compact/i.test(n)) s -= 5; return s; };
    return vs.slice().sort((a, b) => score(b) - score(a))[0];
  }

  /** Stop speech now. The pending speak() promise resolves with 'cancelled'; its callbacks can no longer fire. */
  cancel() {
    const j = this.job; this.job = null; this.seq++;
    if (j) { clearTimeout(j.watchdog); j.settle('cancelled'); }
    if (this.supported) { try { speechSynthesis.cancel(); } catch { /* ignore */ } }
  }

  speak(text, { onStart, onBoundary, rate = 1.0, pitch = 0.96 } = {}) {
    this.cancel();
    return new Promise((resolve) => {
      if (!this.supported) { resolve({ reason: 'unavailable' }); return; }
      const id = ++this.seq; let done = false, started = false;
      const job = { settle: (reason) => { if (done) return; done = true; clearTimeout(job.watchdog); if (this.job === job) this.job = null; resolve({ reason }); } };
      this.job = job;
      const alive = () => !done && this.job === job && this.seq === id;       // stale callbacks are ignored
      let u;
      try {
        u = new SpeechSynthesisUtterance(text);
        const v = this.pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
        u.rate = rate; u.pitch = pitch; u.volume = 1;
        u.onstart = () => { if (!alive()) return; started = true; clearTimeout(job.watchdog); onStart?.(); };
        u.onboundary = (e) => { if (alive() && e.name !== 'sentence') onBoundary?.(e.charIndex, e.charLength || 0); };
        u.onend = () => { if (alive()) job.settle('ended'); };
        u.onerror = (e) => { if (!alive()) return;
          if (e.error === 'interrupted' || e.error === 'canceled') job.settle('cancelled');
          else if (e.error === 'not-allowed') { this.blocked = true; job.settle('unavailable'); }
          else job.settle('error'); };
        job.watchdog = setTimeout(() => { if (alive() && !started) { try { speechSynthesis.cancel(); } catch { /* ignore */ } job.settle('unavailable'); } }, START_WATCHDOG_MS);
        // Chrome ignores a speak() issued in the same tick as cancel(); defer one macrotask.
        setTimeout(() => { if (alive()) { try { speechSynthesis.speak(u); } catch { job.settle('unavailable'); } } }, 30);
      } catch { job.settle('unavailable'); }
    });
  }
}
export const speaker = new Speaker();
export const unlockSpeech = () => speaker.unlock();
