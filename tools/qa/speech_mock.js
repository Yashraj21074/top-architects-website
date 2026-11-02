// Deterministic stand-in for the browser speech engine, used ONLY in automated tests (headless Chromium has no voices).
// It follows the real API contract: speak() queues, cancel() fires an 'interrupted' error on the active utterance,
// onstart/onboundary/onend fire as events. Mode: 'normal' (ends after END_MS) | 'silent' (never starts, like a blocked engine) | 'denied'.
(() => {
  const MODE = window.__SPEECH_MODE || 'normal', END_MS = window.__SPEECH_END_MS || 5000;
  const log = { speaks: [], cancels: 0, maxActive: 0, ends: [], nav: [] };
  window.__speech = log;
  class U { constructor(t) { this.text = t; this.voice = null; this.lang = ''; } }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true, writable: true });
  let active = null; const queue = [];
  const run = () => {
    if (active || !queue.length) return;
    const u = queue.shift(); active = u; log.maxActive = Math.max(log.maxActive, 1 + queue.length);
    if (MODE === 'denied') { setTimeout(() => { active = null; u.onerror?.({ error: 'not-allowed' }); run(); }, 10); return; }
    if (MODE === 'silent') return;                               // engine never starts or ends
    u.onstart?.(); const words = [...u.text.matchAll(/\S+/g)];
    words.forEach((w, i) => setTimeout(() => { if (active === u) u.onboundary?.({ name: 'word', charIndex: w.index, charLength: w[0].length }); }, 120 + (i * (END_MS - 400)) / words.length));
    u._t = setTimeout(() => { if (active === u) { active = null; log.ends.push({ text: u.text, at: performance.now() }); u.onend?.({}); run(); } }, END_MS);
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    speaking: false, pending: false, paused: false,
    getVoices: () => [], resume() {},
    speak(u) { if (u.text.trim() === '') return; log.speaks.push({ text: u.text, at: performance.now() }); queue.push(u); run(); },
    cancel() { log.cancels++; queue.length = 0; if (active) { const u = active; active = null; clearTimeout(u._t); setTimeout(() => u.onerror?.({ error: 'interrupted' }), 5); } },
  } });
  const push = history.pushState.bind(history);
  history.pushState = (...a) => { log.nav.push({ url: String(a[2]), at: performance.now() }); return push(...a); };
})();
