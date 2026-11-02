/**
 * State of the collapsible message composer. Pure logic (no DOM) so the rules can be tested:
 *  - closed by default; opening and closing never touch the conversation
 *  - closing KEEPS the unsent draft
 *  - an empty message is rejected; a message already being sent cannot be sent twice
 *  - success: the draft is cleared and the composer closes. Failure: it stays open, the draft is kept and an error is shown.
 */
export const EMPTY_MSG = 'Please type a message first.';
export const FAIL_MSG = 'Sorry, that didn’t go through. Your message is still here, so you can try again.';
export class Composer {
  constructor(draft = '') { this.isOpen = false; this.draft = draft; this.sending = false; this.error = ''; }
  open() { this.isOpen = true; this.error = ''; return this; }
  close() { this.isOpen = false; this.error = ''; return this; }               // the draft is deliberately kept
  setDraft(text) { this.draft = String(text ?? ''); if (this.error) this.error = ''; return this; }
  get canSend() { return !this.sending && this.draft.trim().length > 0; }
  /** Returns the message to send, or null (and sets `error` when the visitor should be told why). */
  begin() {
    if (this.sending) return null;                                             // duplicate submission: ignored silently
    if (!this.draft.trim()) { this.error = EMPTY_MSG; return null; }
    this.sending = true; this.error = ''; return this.draft.trim();
  }
  succeed() { this.sending = false; this.draft = ''; this.error = ''; this.isOpen = false; return this; }
  fail(message = FAIL_MSG) { this.sending = false; this.error = message; this.isOpen = true; return this; }
}
