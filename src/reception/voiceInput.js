/**
 * Speech recognition wrapper (Web Speech API). Never starts without a click/tap, shows its state, submits only a FINAL result (once),
 * and reports problems so the interface can fall back to typing. Where the API does not exist, `supported` is false and the mic button stays hidden.
 */
export function createVoiceInput({ onInterim, onFinal, onState, onError, lang } = {}) {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return { supported: false, start() {}, stop() {}, abort() {}, get active() { return false; } };
  let rec = null, active = false, delivered = false;
  const set = (st) => onState?.(st);
  const end = () => { active = false; rec = null; set('idle'); };
  return {
    supported: true,
    get active() { return active; },
    start() {
      if (active) return; delivered = false;
      try {
        rec = new SR(); rec.lang = lang || navigator.language || 'en-GB'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
        rec.onstart = () => { active = true; set('listening'); };
        rec.onresult = (e) => {
          let interim = '', fin = '';
          for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; (r.isFinal ? (fin += r[0].transcript) : (interim += r[0].transcript)); }
          if (interim && !fin) onInterim?.(interim.trim());
          if (fin && !delivered) { delivered = true; set('processing'); onFinal?.(fin.trim()); }
        };
        rec.onerror = (e) => {
          const code = e.error; const msg = code === 'not-allowed' || code === 'service-not-allowed' ? 'Microphone access isn’t available, so please type instead.'
            : code === 'no-speech' ? 'I didn’t catch anything. You can try again or type.' : code === 'audio-capture' ? 'No microphone was found. Please type instead.' : code === 'network' ? 'Voice recognition needs a connection. Please type instead.' : code === 'aborted' ? '' : 'Voice input stopped. Please type instead.';
          if (msg) onError?.(msg, code); end();
        };
        rec.onend = end; rec.start();
      } catch { onError?.('Voice input couldn’t start. Please type instead.', 'start'); end(); }
    },
    stop() { try { rec?.stop(); } catch { /* ignore */ } },
    abort() { try { rec?.abort(); } catch { /* ignore */ } end(); },
  };
}
