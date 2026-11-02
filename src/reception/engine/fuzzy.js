import { SLANG, VOCAB, COMMON } from './synonyms.js';
import { norm } from './text.js';
/** Optimal-string-alignment (Damerau–Levenshtein) distance: a swapped pair of letters counts as ONE typo ("desing" → "design"). */
export function distance(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
const KNOWN = new Set([...COMMON, ...VOCAB]);
const lim = (len) => (len <= 7 ? 1 : 2);
/** Correct one word towards the site vocabulary. Only words that are NOT already known, are long enough, and have exactly one nearest vocabulary word are changed. */
export function fixWord(w) {
  if (SLANG[w]) return SLANG[w];
  if (w.length < 4 || KNOWN.has(w) || /\d/.test(w)) return w;
  let best = null, bd = 99, tie = false;
  for (const v of VOCAB) { if (Math.abs(v.length - w.length) > 2) continue; const d = distance(w, v); if (d < bd) { bd = d; best = v; tie = false; } else if (d === bd && v !== best) tie = true; }
  return best && bd <= lim(w.length) && !tie ? best : w;
}
export const correct = (text) => text.split(' ').map(fixWord).join(' ');
/** Normalise → expand slang → fix typos. (Synonym canonicalisation happens after this, in the resolver.) */
export const prep = (raw) => correct(norm(raw).split(' ').map((w) => SLANG[w] || w).join(' '));
