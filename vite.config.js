import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { STUDIO } from './src/content/studio.js';
import { SITE_INDEX } from './src/lib/siteIndex.js';

// ONE source of truth for the automatic theme:
//   hours   -> src/config/theme.json   (also imported by the runtime watcher, src/lib/theme.js)
//   colours -> src/styles/tokens.css   (--color-background in :root and in :root[data-theme='night'])
// This plugin turns both into a tiny pre-paint script + style so the first frame is already in the right theme (no flash).
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const cfg = JSON.parse(read('./src/config/theme.json'));
const tokens = read('./src/styles/tokens.css');
const bgOf = (block) => block.match(/--color-background:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
const dayBg = bgOf(tokens.slice(tokens.indexOf(':root {')));
const nightBg = bgOf(tokens.slice(tokens.indexOf(":root[data-theme='night']")));
if (!dayBg || !nightBg) throw new Error('theme: could not read --color-background for day/night from src/styles/tokens.css');

const themeInline = () => ({
  name: 'inline-theme',
  transformIndexHtml: () => [
    { tag: 'script', injectTo: 'head',                // after <meta name="theme-color"> so the browser UI colour is set before first paint; still ahead of <body> rendering
      children: `(function(){var h=new Date().getHours(),n=!(h>=${cfg.dayStartHour}&&h<${cfg.nightStartHour}),e=document.documentElement;e.dataset.theme=n?'night':'day';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',n?'${nightBg}':'${dayBg}');})();` },
    { tag: 'style', injectTo: 'head-prepend', children: `html{background:${dayBg}}html[data-theme='night']{background:${nightBg}}` },
  ],
});
// SEO files. Absolute URLs (canonical, og:url, og:image, sitemap) need the real domain, which is deployment configuration, not code:
// set SITE_URL (e.g. https://www.example.com) when building. Without it the build is still valid but emits no sitemap / canonical (nothing is guessed).
const SITE_URL = (globalThis.process?.env?.SITE_URL || '').replace(/\/$/, '');
const seo = () => ({
  name: 'seo',
  transformIndexHtml: () => {
    const tags = [];
    if (SITE_URL) tags.push({ tag: 'link', attrs: { rel: 'canonical', href: SITE_URL + '/', 'data-base': SITE_URL }, injectTo: 'head' }, { tag: 'meta', attrs: { property: 'og:url', content: SITE_URL + '/' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image', content: SITE_URL + '/img/render-commercial-facade-1400.webp' }, injectTo: 'head' }, { tag: 'meta', attrs: { name: 'twitter:image', content: SITE_URL + '/img/render-commercial-facade-1400.webp' }, injectTo: 'head' });
    // Structured data uses only details already published on the Contact page (src/content/studio.js).
    const c = STUDIO.contact, ld = { '@context': 'https://schema.org', '@type': 'Organization', name: STUDIO.name, foundingDate: String(STUDIO.established), email: c.email, telephone: c.phones.map((p) => p.number.replace(/\s/g, '')),
      founder: { '@type': 'Person', name: STUDIO.founder.name, jobTitle: STUDIO.founder.title }, address: { '@type': 'PostalAddress', streetAddress: c.address.slice(0, 2).join(', '), addressLocality: c.address[2] }, ...(SITE_URL ? { url: SITE_URL + '/' } : {}) };
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(ld), injectTo: 'head' });
    return tags;
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}` });
    if (SITE_URL) {                                            // every route from the content files (pages, services, categories excluded: they are query views, projects, articles)
      const urls = SITE_INDEX.filter((e) => e.type !== 'category').map((e) => SITE_URL + (e.route === '/' ? '/' : e.route));
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n` });
    }
  },
});
export default defineConfig({ plugins: [react(), themeInline(), seo()], build: { chunkSizeWarningLimit: 800 } });
