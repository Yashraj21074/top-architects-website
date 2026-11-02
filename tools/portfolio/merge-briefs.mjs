import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const draftPath = path.join(root, 'docs/PORTFOLIO_CATALOG_DRAFT.json');
const outputPath = path.join(root, 'docs/PORTFOLIO_CATALOG_ENRICHED.json');
const categories = [
  ['Residential', 'residential'],
  ['Commercial', 'commercial'],
  ['Institutional', 'institutional'],
  ['Public & Landscape', 'public-landscape'],
  ['Interiors', 'interiors'],
  ['Hospitality', 'hospitality'],
];
const requiredBriefFields = [
  'functionalBrief',
  'programme',
  'floorOrSiteOrganization',
  'areaOrScale',
  'structuralSystem',
  'constructionLogic',
  'environmentalResponse',
];
const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
const seenSlugs = new Set();
const seenTitles = new Set();
const seenAssetKeys = new Set();
const countByCategory = Object.fromEntries(categories.map(([name]) => [name, 0]));
const errors = [];

for (const project of draft.projects) {
  if (seenSlugs.has(project.slug)) errors.push(`Duplicate slug: ${project.slug}`);
  seenSlugs.add(project.slug);
  project.status = 'proposed';
  project.statusLabel = 'Proposed Design';
  if (typeof project.location === 'string') {
    project.location = project.location.replace(/^Conceptual setting\s*[—–-]\s*/i, 'Proposed site context · ');
  }
  const titleKey = project.title.trim().toLowerCase();
  if (seenTitles.has(titleKey)) errors.push(`Duplicate project title: ${project.title}`);
  seenTitles.add(titleKey);
  if (!(project.category in countByCategory)) errors.push(`Unrecognized category ${project.category}: ${project.slug}`);
  else countByCategory[project.category]++;
  if (project.gallery?.length !== 5) errors.push(`${project.slug} does not have exactly five gallery records.`);
  for (const image of project.gallery ?? []) {
    if (!image.assetKey || seenAssetKeys.has(image.assetKey)) errors.push(`Missing or duplicate gallery asset key: ${image.assetKey}`);
    seenAssetKeys.add(image.assetKey);
  }
}

for (const [category, key] of categories) {
  const briefPath = path.join(root, `docs/portfolio-briefs/${key}.json`);
  if (!fs.existsSync(briefPath)) {
    errors.push(`Missing category brief file: ${briefPath}`);
    continue;
  }
  const file = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
  if (file.category !== category) errors.push(`${key} brief reports category ${file.category}, expected ${category}.`);
  const records = file.projects ?? [];
  const projectMap = new Map(records.map(record => [record.slug, record]));
  if (records.length !== 7 || projectMap.size !== 7) errors.push(`${category} brief must contain exactly seven unique slugs.`);
  const categoryProjects = draft.projects.filter(project => project.category === category);
  if (categoryProjects.length !== 7) errors.push(`${category} catalog has ${categoryProjects.length} entries, expected seven.`);
  for (const project of categoryProjects) {
    const brief = projectMap.get(project.slug);
    if (!brief) {
      errors.push(`Missing ${category} brief for ${project.slug}.`);
      continue;
    }
    for (const field of requiredBriefFields) {
      const value = brief[field];
      const valid = Array.isArray(value) ? value.length >= 4 && value.length <= 10 && value.every(item => typeof item === 'string' && item.trim()) : typeof value === 'string' && value.trim().length >= 12;
      if (!valid) errors.push(`${project.slug} has an invalid or empty ${field}.`);
      else project[field] = value;
    }
  }
  for (const slug of projectMap.keys()) {
    if (!categoryProjects.some(project => project.slug === slug)) errors.push(`Unexpected slug in ${category} brief: ${slug}`);
  }
}

if (draft.projects.length !== 42) errors.push(`Expected 42 projects, found ${draft.projects.length}.`);
for (const [category, count] of Object.entries(countByCategory)) {
  if (count !== 7) errors.push(`${category} has ${count} projects, expected seven.`);
}
if (seenAssetKeys.size !== 210) errors.push(`Expected 210 distinct image asset keys, found ${seenAssetKeys.size}.`);
if (errors.length) {
  console.error(JSON.stringify({errors, countByCategory, projectCount: draft.projects.length, galleryAssetKeys: seenAssetKeys.size}, null, 2));
  process.exitCode = 1;
} else {
  draft.briefEnrichment = {
    categoryCount: Object.fromEntries(categories.map(([name]) => [name, 7])),
    proposalStatus: 'Proposed Design',
    source: 'Six category-specific structured briefs; project identities and five-view image plans unchanged.',
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(draft, null, 2)}\n`);
  console.log(JSON.stringify({outputPath, projects: draft.projects.length, galleryImages: seenAssetKeys.size, countByCategory}, null, 2));
}
