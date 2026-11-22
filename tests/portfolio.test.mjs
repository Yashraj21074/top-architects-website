// Public portfolio integrity: exactly 42 projects, 7 per category, 5 images each (210 unique), no retired/old projects anywhere public.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROJECTS, ACTIVE_CATEGORIES, getProject, related } from '../src/content/projects.js';
import { IMAGES, imgSrc } from '../src/content/images.js';
import { SERVICES } from '../src/content/services.js';
import { ARTICLES } from '../src/content/journal.js';

const pub = PROJECTS.filter((p) => p.published);
const RETIRED = ['hillside-retreat', 'light-filled-interior'];

test('exactly 42 unique public projects, 7 in each of the six categories', () => {
  assert.equal(pub.length, 42);
  assert.equal(new Set(pub.map((p) => p.slug)).size, 42);
  assert.equal(new Set(pub.map((p) => p.title)).size, 42);
  assert.deepEqual(ACTIVE_CATEGORIES, ['Residential', 'Institutional', 'Public & Landscape', 'Commercial', 'Hospitality', 'Interiors']);
  for (const c of ACTIVE_CATEGORIES) assert.equal(pub.filter((p) => p.category === c).length, 7, c);
});
test('every public project has exactly five distinct, registered images; 210 in total, none shared', () => {
  const all = [];
  for (const p of pub) {
    assert.equal(p.gallery.length, 5, p.slug);
    assert.equal(new Set(p.gallery).size, 5, p.slug);
    assert.equal(p.cover, p.gallery[0], p.slug);
    for (const id of p.gallery) assert.ok(IMAGES[id], `${p.slug}: ${id} not registered`);
    all.push(...p.gallery);
  }
  assert.equal(all.length, 210); assert.equal(new Set(all).size, 210);
});
test('every image file referenced by the public portfolio exists on disk', () => {
  for (const p of pub) for (const id of p.gallery) {
    const meta = IMAGES[id]; const widths = meta.widths || [800, 1400, 2400];
    for (const w of widths) assert.ok(fs.existsSync(`public${imgSrc(id, w)}`), `${p.slug}: missing ${imgSrc(id, w)}`);
  }
});
test('portfolio images are never enlarged beyond their native width', () => {
  for (const [id, m] of Object.entries(IMAGES)) if (m.widths && m.w) assert.ok(Math.max(...m.widths) <= m.w, id);
});
test('retired older projects are not public anywhere', () => {
  for (const slug of RETIRED) {
    assert.ok(PROJECTS.some((p) => p.slug === slug), `${slug} record is kept on file`);
    assert.equal(getProject(slug), undefined, `${slug} must not resolve publicly`);
  }
  for (const p of pub) assert.ok(related(p, 6).every((r) => r.published && !RETIRED.includes(r.slug)));
  for (const s of SERVICES) for (const slug of s.projects || []) assert.ok(getProject(slug), `service ${s.slug} references ${slug}`);
  for (const a of ARTICLES) if (a.project) assert.ok(getProject(a.project), `article ${a.slug} references ${a.project}`);
});
test('Finned Façade Study and Rotating Tower Study keep their URLs and now use the Part 3 images', () => {
  for (const slug of ['finned-facade', 'rotating-tower']) {
    const p = getProject(slug); assert.ok(p); assert.equal(p.category, 'Commercial');
    assert.ok(p.gallery.every((id) => id.startsWith(`portfolio/${slug}-`)));
  }
});
test('new Part 3 descriptions do not state locations, clients, dates, awards or build status', () => {
  const bad = /\b(award|client|completed|constructed|built in|opened in|20[0-3]\d)\b/i;
  for (const slug of ['coastal-retreat-resort', 'desert-luxury-resort', 'heritage-courtyard-hotel', 'lakeside-luxury-resort', 'mountain-view-resort', 'tropical-boutique-resort', 'urban-business-hotel', 'boutique-hotel-suite', 'executive-office', 'serene-residence', 'wellness-sanctuary', 'boutique-retail-experience', 'learning-commons', 'urban-penthouse']) {
    const p = getProject(slug); assert.ok(p, slug);
    const text = [p.summary, p.concept, ...p.approach, ...p.materials, p.context, ...(p.programme || [])].join(' ');
    assert.ok(!bad.test(text), `${slug}: ${text.match(bad)}`);
    assert.match(p.location, /unspecified/i);
  }
});
