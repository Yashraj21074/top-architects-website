import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DESTINATIONS } from '../content/destinations.js';
import { unlockSpeech } from '../lib/speech.js';
import { setOrigin } from '../lib/entryOrigin.js';
import './reception.css';

export default function ReceptionPage() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading');   // loading | ready | error
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    document.title = '3D Reception — TOP Architects + Partners';
    document.body.style.overflow = 'hidden';
    let disposeFn = null, cancelled = false;
    setOrigin('reception');                            // the visitor is (back) in the reception: pages opened from here return here
    unlockSpeech();                                    // arriving via a click on "Enter 3D Reception" counts as the user gesture
    (async () => {
      try {
        const { startReception } = await import('./start.js');        // 3D code + three.js load only on this route
        const h = await startReception({
          canvas: canvasRef.current,
          onProgress: (p) => !cancelled && setProgress(p),
          onNavigate: (d) => { setOrigin('reception'); navigate(d.route, { state: { origin: 'reception' } }); },   // d.route is validated by the conversation engine (real pages only)
        });
        disposeFn = h.dispose;
        if (cancelled) { h.dispose(); return; }
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        console.warn('Reception unavailable:', e);
        setErrMsg(e?.message === 'WEBGL_UNAVAILABLE' ? 'Your browser could not start 3D graphics (WebGL).' : 'The 3D reception could not be loaded.');
        setPhase('error');
      }
    })();
    return () => { cancelled = true; document.body.style.overflow = ''; disposeFn?.(); window.speechSynthesis?.cancel?.(); delete document.body.dataset.story; };
  }, [navigate]);

  return (
    <div className="reception-root" data-phase={phase}>
      <canvas id="stage" ref={canvasRef} aria-label="Interactive 3D receptionist at the TOP Architects + Partners reception desk. Move the cursor or touch the screen and the receptionist's head follows." />

      {/* All interface sits OUTSIDE #scene-window, which is the area reserved for the 3D scene (the camera fits logo + receptionist into it). */}
      <div id="story" hidden={phase !== 'ready'}>
        <div className="r-bar">
          <Link to="/" className="r-exit" aria-label="Exit the reception and return to the homepage">← <span className="long">Exit to Home</span><span className="short">Home</span></Link>
          <div id="story-tools" hidden>
            <button id="t-skip" type="button" aria-label="Skip introduction" hidden><span className="long">Skip Introduction</span><span className="short">Skip</span></button>
            <button id="t-back" type="button" aria-label="Cancel and choose another page" hidden>Back</button>
          </div>
        </div>
        <div id="scene-window" aria-hidden="true"></div>
        <section id="convo" aria-label="Conversation with the receptionist" hidden>
          <header className="convo__head">
            <span className="convo__label">Top Reception</span>
            <span id="say-status" role="status" aria-live="polite"></span>
            <button id="ask-fab" type="button" aria-label="Ask the Receptionist" aria-expanded="false" aria-controls="say-form" hidden><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5.5h16v10H12l-4.5 3.5v-3.5H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" /><path d="M8 9.5h8M8 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" /></svg><span className="fab__t">Ask</span></button>
          </header>
          <div id="msgs" role="log" aria-live="polite" aria-relevant="additions" tabIndex={0}></div>
        </section>
        <form id="say-form" role="dialog" aria-labelledby="composer-t" aria-modal="false" autoComplete="off" noValidate data-open="false">
          <div className="composer__head"><h2 id="composer-t">Ask the Receptionist</h2><button id="composer-close" type="button" aria-label="Close message box"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg></button></div>
          <div className="say__field">
            <label className="sr-only" htmlFor="say-input">Type your message to the receptionist</label>
            <input id="say-input" type="text" maxLength={240} placeholder="Type your message..." enterKeyHint="send" autoComplete="off" autoCapitalize="sentences" spellCheck="true" />
            <button id="say-mic" className="say__btn" type="button" aria-pressed="false" aria-label="Speak your question"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3ZM6 11.5V12a6 6 0 0 0 12 0v-.5M12 18v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg></button>
            <button id="say-send" className="say__btn say__send" type="submit" aria-label="Send message" aria-disabled="true"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg></button>
          </div>
          <p id="composer-err" role="alert"></p>
        </form>
        <nav id="choices" aria-label="Main pages" hidden></nav>
      </div>

      {phase === 'loading' && (
        <div className="r-loading" role="status" aria-live="polite">
          <Link to="/" className="r-exit r-exit--float">← <span className="long">Exit to Home</span><span className="short">Home</span></Link>
          <img src="/logo/top-logo-trim-sm.png" alt="" width="190" height="106" />
          <div className="r-bar-load" aria-hidden="true"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p>Entering the reception…</p>
        </div>
      )}
      {phase === 'error' && (
        <div className="r-error" role="alert">
          <h1>{errMsg}</h1>
          <p>You can still explore the website directly.</p>
          <ul>{DESTINATIONS.map((d) => <li key={d.id}><Link to={d.route} className="btn btn--light">{d.label}</Link></li>)}</ul>
          <Link to="/" className="link" style={{ color: '#fff', borderColor: '#b08d57' }}>Return to the homepage</Link>
        </div>
      )}
    </div>
  );
}
