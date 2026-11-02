// Small text utilities shared by the intent resolver, the repetition guard and the speech layer. Pure functions: no DOM, so they run in Node tests.
export const norm = (s = '') => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s'+&-]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('a an the and or but of to in on at for with is are was were be been it its this that these those i you we our your my me us do does did can could would should will shall have has had as by from about so just very really there here then than into out'.split(' '));
export const contentWords = (s) => norm(s).split(' ').filter((w) => w && !STOP.has(w));
const jac = (A, B) => { if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const bigrams = (w) => new Set(w.slice(1).map((x, i) => w[i] + ' ' + x));
/** 0..1 — how alike two sentences are. Averages word overlap and word-pair overlap, so "That sounds exciting" / "That sounds wonderful" still score as close. */
export function similarity(a, b) {
  const wa = norm(a).split(' ').filter(Boolean), wb = norm(b).split(' ').filter(Boolean);
  const ca = contentWords(a), cb = contentWords(b);
  const lex = jac(new Set(ca), new Set(cb)), pair = jac(bigrams(wa), bigrams(wb));
  const shape = jac(new Set(wa.slice(0, 3)), new Set(wb.slice(0, 3)));                  // same opening words → feels repeated even if the rest differs
  return Math.min(1, 0.45 * lex + 0.4 * pair + 0.15 * shape);
}
export const sentences = (s) => (String(s).match(/[^.!?]+[.!?]*/g) || []).map((x) => x.trim()).filter(Boolean);
export const firstWords = (s, n = 2) => norm(s).split(' ').slice(0, n).join(' ');
export const wordCount = (s) => (String(s).match(/\S+/g) || []).length;
export const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Text sent to the speech engine. Same number of whitespace-separated tokens as the caption, so subtitle sync (mapBoundary) still lines up. */
export function prepareSpeech(text) {
  return String(text)
    .replace(/TOP ARCHITECTS \+ PARTNERS/g, 'TOP Architects and Partners')
    .replace(/\bAr\.(?=\s)/g, 'Architect')
    .replace(/\s\+\s/g, ' and ')
    .replace(/\bB\.Arch\.?/g, 'Bachelor of Architecture').replace(/\bM\.Arch\.?/g, 'Master of Architecture');
}
/** Map a speech-engine character position (in the spoken text) to the matching position in the caption by token index. */
export function mapBoundary(spoken, display, charIndex, charLength = 0) {
  const toks = (s) => [...String(s).matchAll(/\S+/g)].map((m) => ({ s: m.index, e: m.index + m[0].length }));
  const a = toks(spoken), b = toks(display); if (!a.length || !b.length) return Math.min(display.length, charIndex + charLength);
  let k = a.findIndex((t) => charIndex >= t.s && charIndex < t.e); if (k < 0) k = a.findIndex((t) => t.s >= charIndex); if (k < 0) k = a.length - 1;
  if (a.length === b.length) return b[k].e;
  return b[Math.min(b.length - 1, Math.round((k / a.length) * (b.length - 1)))].e;
}
