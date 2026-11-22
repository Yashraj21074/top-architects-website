import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = path.join(root, 'docs/PORTFOLIO_CATALOG_ENRICHED.json');
const outputRoot = path.join(root, 'docs/portfolio-generation');
const categories = ['Residential', 'Commercial', 'Institutional', 'Public & Landscape', 'Interiors', 'Hospitality'];
const batchSize = 5;

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const errors = [];
const outputs = [];

function chunks(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

function promptFor(project, image, {isHero, reference}) {
  const anchors = (project.visualAnchors ?? []).map(value => `- ${value}`).join('\n');
  const referenceInstruction = reference
    ? `Use the provided source image as a strict design-identity reference. Preserve its exact building or space geometry, roof form, façade and opening rhythm, material palette, landscape character and site logic. Show the same proposed project from a genuinely different camera position; do not redesign it.`
    : `This is the first hero view for this proposed design. Establish a coherent, buildable architectural identity from the anchors below; this image will become the reference for the remaining four views.`;
  return [
    `Create one photorealistic high-end architectural visualization for a ${project.category} portfolio entry by TOP Architects + Partners. It is a Proposed Design, not a documentary image of built work.`,
    `Project: ${project.title}. Typology: ${project.typology}. Proposed site context: ${project.location.replace(/^Proposed site context\s*·\s*/i, '')}.`,
    `Design intent: ${project.summary}`,
    `Functional brief: ${project.functionalBrief}`,
    `Approximate scale: ${project.areaOrScale}`,
    `Buildability: follow ordinary load paths and plausible spans; use construction logic and materials consistent with the typology, site climate, and scale.`,
    anchors ? `Fixed visual identity anchors; preserve all across views:\n${anchors}` : '',
    `Required view (${image.view}): ${image.scenePrompt}`,
    referenceInstruction,
    `Composition: landscape 3:2. Architectural subject clear and readable with realistic foreground, middle distance and background. Leave a quiet, low-detail margin at the right side near vertical centre for a small official logo to be added later; do not place the focal architectural detail in that small safe zone.`,
    `Style: restrained premium international architectural visualization; natural daylight or coherent specified weather, believable material texture, physically plausible structure and junctions, realistic human-scale proportions, measured landscaping and grounded shadows.`,
    `Constraints: no people, text, signage, captions, letters, invented logos or watermark. Show only one image, no panels, contact sheets or collage. Use realistic, buildable architecture; retain the specified programme, circulation, scale and material logic.`,
    `Avoid: impossible cantilevers, floating structure, distorted windows, inconsistent roofs, implausible stairs, decorative structures without function, fantasy forms, duplicate camera composition, oversaturated CGI, random stock buildings, text and branding.`,
  ].filter(Boolean).join('\n\n');
}

for (const category of categories) {
  const projects = catalog.projects.filter(project => project.category === category);
  if (projects.length !== 7) {
    errors.push(`${category} has ${projects.length} projects, expected seven.`);
    continue;
  }
  const heroItems = [];
  const viewItems = [];
  for (const project of projects) {
    if (project.gallery?.length !== 5) {
      errors.push(`${project.slug} has ${project.gallery?.length ?? 0} gallery records, expected five.`);
      continue;
    }
    const hero = project.gallery[0];
    const heroSource = path.join(root, hero.sourcePath);
    if (!fs.existsSync(heroSource)) {
      heroItems.push({
        projectSlug: project.slug,
        projectTitle: project.title,
        view: hero.view,
        path: heroSource,
        prompt: promptFor(project, hero, {isHero: true, reference: false}),
        aspect_ratio: '3:2',
        references: [],
        transparent_background: '',
      });
    }
    for (const image of project.gallery.slice(1)) {
      const source = path.join(root, image.sourcePath);
      if (fs.existsSync(source)) continue;
      viewItems.push({
        projectSlug: project.slug,
        projectTitle: project.title,
        view: image.view,
        path: source,
        prompt: promptFor(project, image, {isHero: false, reference: true}),
        aspect_ratio: '3:2',
        references: [heroSource],
        transparent_background: '',
      });
    }
  }
  const file = {
    category,
    projectCount: projects.length,
    imagesToGenerate: heroItems.length + viewItems.length,
    heroBatches: chunks(heroItems, batchSize),
    viewBatches: chunks(viewItems, batchSize),
  };
  fs.mkdirSync(outputRoot, {recursive: true});
  const name = category.toLowerCase().replaceAll(' & ', '-').replaceAll(' ', '-');
  const outputPath = path.join(outputRoot, `${name}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(file, null, 2)}\n`);
  outputs.push({category, outputPath, projects: projects.length, heroes: heroItems.length, additionalViews: viewItems.length, batches: file.heroBatches.length + file.viewBatches.length});
}

if (errors.length) {
  console.error(JSON.stringify({errors, outputs}, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({catalogPath, categories: outputs, totalImagesToGenerate: outputs.reduce((sum, item) => sum + item.heroes + item.additionalViews, 0)}, null, 2));
}
