/**
 * Receptionist animation states. Uses ONLY what the rig actually supports (verified in bodyMotion.js / headTracker.js):
 * desk hand poses (typing / mouse / rest), whole-body facing, head tracking toward the visitor, subtle speaking head motion,
 * and single head cues (nod / tilt / glance). There is no facial rig, so no lip-sync is attempted.
 *
 *   idle        working at the laptop
 *   greeting    turns to the visitor, relaxed hands, a brief nod
 *   speaking    speaking head motion on (never together with listening)
 *   listening   speaking motion off, attentive; a small tilt when the visitor starts typing or speaking
 *   explaining  like speaking, with the calm poses cycling
 *   offering    glances toward the options panel when suggesting where to go
 *   leaving     a nod as the visitor is sent off to a page
 *   returning   a quick acknowledging nod when the visitor comes back
 *   farewell    a nod, then back to work
 */
export const ANIM = ['idle', 'greeting', 'speaking', 'listening', 'explaining', 'offering', 'leaving', 'returning', 'farewell'];
export class ReceptionAnimator {
  constructor() { this.state = 'idle'; this.body = null; this.tracker = null; this.speaking = false; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; }
  attach({ body, tracker }) { this.body = body; this.tracker = tracker; }
  /** Mutually exclusive: speaking switches the listening posture off and vice versa. */
  set(state) { if (!ANIM.includes(state)) return; this.state = state; this.speaking = state === 'speaking' || state === 'explaining' || state === 'greeting' && this.speaking; }
  setSpeaking(on) { this.speaking = !!on; if (on && this.state === 'listening') this.state = 'speaking'; if (!on && (this.state === 'speaking' || this.state === 'explaining')) this.state = 'listening'; }
  /** Per-frame: the single place that drives the speaking motion. */
  frame() { if (this.body) this.body.talkTarget = this.speaking && this.state !== 'listening' && !this.reduced ? 1 : 0; }
  cue(kind) { this.body?.cue?.(kind); }
  /** Turn-level cue chosen by the response ('nod' | 'tilt' | null). */
  forTurn(turn) { if (turn?.cue) this.cue(turn.cue); }
}
