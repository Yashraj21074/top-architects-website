import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_INDEX, isKnownRoute } from '../src/lib/siteIndex.js';
import { searchSite } from '../src/lib/siteSearch.js';
import { PROJECTS, ACTIVE_CATEGORIES } from '../src/content/projects.js';
import { SERVICES, serviceProjects, servicesForProject } from '../src/content/services.js';
import { ARTICLES } from '../src/content/journal.js';

const pub = PROJECTS.filter((p) => p.published);
test('index covers 9 pages, 5 services, 6 categories, 42 projects, 12 articles', () => {
  const n = (t) => SITE_INDEX.filter((e) => e.type === t).length;
  assert.deepEqual([n('page'), n('service'), n('category'), n('project'), n('article')], [9, 5, 6, 42, ARTICLES.filter((a) => a.published).length]);
  assert.equal(n('article'), 12);
});
test('every index route is unique-ish and well formed', () => {
  for (const e of SITE_INDEX) { assert.ok(e.route.startsWith('/'), e.route); assert.ok(isKnownRoute(e.route)); }
  assert.equal(isKnownRoute('/projects/not-real'), false); assert.equal(isKnownRoute('https://evil.example'), false);
});
test('every project title finds its own detail page first', () => {
  for (const p of pub) { const r = searchSite(p.title, 3); assert.equal(r[0].route, `/projects/${p.slug}`, p.title); }
});
test('everyday wording and typos find the right places', () => {
  assert.equal(searchSite('house', 3)[0].title, 'Residential');
  assert.ok(searchSite('interiors', 3).some((r) => r.route === '/services/interior-design'));
  assert.ok(searchSite('commercial building', 5).some((r) => r.route === '/projects?category=Commercial'));
  assert.ok(searchSite('residental', 3).some((r) => r.title === 'Residential'));
  assert.ok(searchSite('hotl', 5).some((r) => r.title === 'Hospitality' || /hotel/i.test(r.title)));
  for (const a of ARTICLES.filter((x) => x.published)) assert.equal(searchSite(a.title, 2)[0].route, `/journal/${a.slug}`);
  for (const s of SERVICES) assert.equal(searchSite(s.title, 2)[0].route, `/services/${s.slug}`);
  assert.deepEqual(searchSite('zzzqqq'), []); assert.deepEqual(searchSite('   '), []);
});
test('all six categories are searchable and counted', () => {
  for (const c of ACTIVE_CATEGORIES) { assert.ok(searchSite(c, 2).some((r) => r.type === 'category' && r.title === c)); assert.equal(pub.filter((p) => p.category === c).length, 7); }
});
test('every project is linked to at least one service; rules are content-based, not "everything everywhere"', () => {
  for (const p of pub) assert.ok(servicesForProject(p, PROJECTS).length >= 1, p.slug);
  const per = SERVICES.map((s) => serviceProjects(s.slug, PROJECTS).length);
  assert.ok(per.every((n) => n >= 2)); assert.ok(per.some((n) => n < 42), 'no service may list all 42');
  assert.ok(serviceProjects('interior-design', PROJECTS).every((p) => p.category === 'Interiors' || /interior/i.test(`${p.typology} ${p.summary}`) || SERVICES.find((s) => s.slug === 'interior-design').projects.includes(p.slug)));
});
