import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
test('theme hours live only in src/config/theme.json', () => {
  const cfg = JSON.parse(read('../src/config/theme.json')), html = read('../index.html'), vite = read('../vite.config.js'), rt = read('../src/lib/theme.js');
  assert.equal(cfg.dayStartHour, 7); assert.equal(cfg.nightStartHour, 18);
  assert.ok(!/getHours\(\)/.test(html), 'index.html must not carry its own theme script');
  assert.ok(/theme\.json/.test(vite) && /theme\.json/.test(rt), 'both pre-paint plugin and runtime watcher read theme.json');
  assert.ok(!/\b(7|18)\b/.test(rt.replace(/\/\/.*$/gm, '').replace(/theme\.json/g, '')), 'no hard-coded hours in theme.js');
});
test('pre-paint colours are read from tokens.css, not repeated', () => {
  const vite = read('../vite.config.js'); assert.ok(/tokens\.css/.test(vite));
  assert.ok(!/#f3f0e8|#101722/i.test(vite) && !/#f3f0e8|#101722/i.test(read('../src/lib/theme.js')));
});
test('active-navigation indicator is Royal Blue by day and Gold by night', () => {
  const t = read('../src/styles/tokens.css');
  assert.match(t.slice(0, t.indexOf("data-theme='night'")), /--color-nav-indicator:\s*#304d78/i);
  assert.match(t.slice(t.indexOf("data-theme='night'")), /--color-nav-indicator:\s*#ba8e34/i);
});
test('legacy Menu implementation is gone', () => {
  assert.ok(!/MobileMenu|mnav|>Menu</.test(read('../src/components/Header.jsx')));
});
