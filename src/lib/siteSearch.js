// Small, dependency-free search over SITE_INDEX: tolerant of partial words, plurals, one-letter typos and everyday wording.
import { SITE_INDEX } from './siteIndex.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (w) => (w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '') : w);
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'me', 'my', 'show', 'see', 'find', 'about', 'with', 'i', 'want', 'need', 'do', 'does', 'did', 'you', 'u', 'ur', 'your', 'yours', 'we', 'us', 'our', 'guys', 'make', 'makes', 'can', 'could', 'please', 'tell', 'what', 'which', 'are', 'is', 'have', 'has', 'kind', 'kinds', 'work', 'works', 'any', 'some', 'there', 'that', 'this', 'it', 'be', 'would', 'like', 'how', 'where', 'who', 'ones', 'one']);
// everyday word -> words that appear in the site's own labels (so "house" finds Residential, "office" finds Commercial ...)
const SYN = {
  house: ['residential', 'residence', 'villa'], houses: ['residential'], home: ['residential', 'residence'], homes: ['residential'], villa: ['residential'], apartment: ['residential', 'penthouse'],
  office: ['commercial', 'workplace'], offices: ['commercial'], workplace: ['commercial'], building: ['architecture'], buildings: ['architecture'], tower: ['commercial'], shop: ['commercial', 'retail'], retail: ['commercial'],
  school: ['institutional'], college: ['institutional'], campus: ['institutional'], civic: ['institutional'], library: ['institutional'], hospital: ['institutional'], museum: ['institutional'],
  park: ['public', 'landscape'], garden: ['landscape'], plaza: ['public'], street: ['public'], outdoor: ['landscape'],
  hotel: ['hospitality'], resort: ['hospitality'], restaurant: ['hospitality'], cafe: ['hospitality'], spa: ['hospitality'],
  interior: ['interiors', 'interior design'], interiors: ['interior design'], furniture: ['interior'], inside: ['interiors'],
  render: ['visualization'], renders: ['visualization'], visualisation: ['visualization'], '3d': ['visualization', 'reception'], image: ['visualization'],
  plan: ['planning'], masterplan: ['planning'], urban: ['planning'], advice: ['consultancy'], consult: ['consultancy'], consultant: ['consultancy'],
  email: ['contact'], phone: ['contact'], address: ['contact'], reach: ['contact'], about: ['studio'], team: ['team'], founder: ['team', 'studio'], essay: ['journal'], blog: ['journal'], article: ['journal'], news: ['journal'],
};
const lev1 = (a, b) => { // true when edit distance <= 1
  if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) { for (let k = 0; k < a.length - 1; k++) if (a[k] !== b[k]) return a[k] === b[k + 1] && a[k + 1] === b[k] && a.slice(k + 2) === b.slice(k + 2); }   // adjacent swap ("ligth")
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
  return e + (a.length - i) + (b.length - j) <= 1;
};
const prepared = SITE_INDEX.map((e) => ({ e, title: norm(e.title), titleW: norm(e.title).split(' ').map(stem), textW: new Set(norm(`${e.text} ${e.sub}`).split(' ').map(stem)), cat: norm(e.category || '') }));

function scoreToken(r, tok, weight) {
  const s = stem(tok); let sc = 0;
  if (r.titleW.includes(s)) sc = 10; else if (r.titleW.some((w) => w.startsWith(s) && s.length >= 2)) sc = 8; else if (s.length >= 4 && r.titleW.some((w) => lev1(w, s))) sc = 6;
  else if (r.textW.has(s)) sc = 3; else if (s.length >= 3 && [...r.textW].some((w) => w.startsWith(s))) sc = 2;
  return sc * weight;
}
/** @returns {Array<{type,id,title,sub,route,score}>} best first. */
export function searchSite(query, limit = 12, { loose = false } = {}) {
  const q = norm(query); if (!q) return [];
  const toks = q.split(' ').filter((t) => !STOP.has(t)); if (!toks.length) return [];
  const exp = toks.map((t) => [[t, 1], ...(SYN[t] || []).flatMap((x) => norm(x).split(' ')).map((x) => [x, 0.7])]);
  const res = [];
  for (const r of prepared) {
    let total = 0, hit = 0;
    for (const alts of exp) { const best = Math.max(...alts.map(([t, w]) => scoreToken(r, t, w))); if (best > 0) { hit++; total += best; } }
    if (!hit) continue;
    if (!loose && hit < Math.ceil(toks.length / 2)) continue;                         // multi-word queries must match at least half the words
    if (r.title === q) total += 30; else if (r.title.startsWith(q)) total += 12;
    if (hit === toks.length) total += 4;
    if (r.e.type === 'category' || r.e.type === 'service') total += 4;      // broader destinations surface slightly ahead of equal project matches
    res.push({ ...r.e, score: total });
  }
  return res.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit).map(({ text, ...x }) => x);   // eslint-disable-line no-unused-vars
}
