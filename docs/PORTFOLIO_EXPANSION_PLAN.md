# TOP Architects + Partners — Portfolio Expansion Audit & Plan

## Read-only audit findings

**Existing codebase:** React 19, Vite 8, React Router 7, Three.js 0.170, and the site's own CSS/token system. The project does not use Tailwind or GSAP. Route definitions live in `src/App.jsx`; `/projects/:slug` already opens the reusable `ProjectDetail` page. The homepage, editorial pages, header, cursor, route sweep, shared day/night theme, and reception experience are separate existing features and are out of scope for redesign.

**3D reception:** `/reception` is lazy-loaded as its own route/chunk. The interactive reception and voice/conversation modules do not depend on portfolio gallery rendering. Portfolio work will avoid modifying reception files except for accurate project-status wording where the receptionist describes portfolio work.

**Current project data:** `src/content/projects.js` is already the single portfolio source. It contains seven published design records: one Residential, two Commercial, one Institutional, one Public & Landscape, one Interiors, and one Hospitality. They are clearly described as unrealized design work; no client, award or completion claims are present. The requested target is exactly seven projects in each of six categories: retain these seven identities, add six Residential, five Commercial, and six in each of the other four categories (35 additions; 42 total). The updated presentation will identify them as **Proposed Designs**, not as completed or commissioned work.

**Current portfolio UI:** `Projects.jsx` filters by URL search parameter and renders `ProjectMarquee`; category counts are not shown. `ProjectMarquee` currently expands every gallery into repeated horizontal cards, which would place many image elements on the listing page at 210 images. `ProjectDetail.jsx`, `ProjectCard.jsx`, and `ProjectLightbox.jsx` are reusable and already provide unique slug routes, related projects, previous/next links, native modal keyboard controls and Escape-to-close. Touch-swipe navigation is not present. `Img.jsx` supports the existing central image registry, responsive WebP variants and native lazy loading; it can be extended compatibly for structured per-project image objects.

**Image inventory:** 158 image files were inventoried under `public/` and `assets/`: 117 WebP, 24 PNG, 15 JPG and 2 JPEG. The 15 existing photorealistic project originals are 2304×1536 JPEGs. The Cantilever House set has five distinct, coherent exterior/interior views and can be retained as its five-view gallery. The other six project records have only one or two suitable views; two legacy `tower-plaza`/`facade-fins` gallery references are stylized, lower-quality illustrations and will not be presented as project visualizations. Existing responsive variants and source images remain available for unrelated pages. One exact duplicate exists between the process image `public/img/process/image-6.jpeg` and the homepage hero original; neither is a project-gallery view.

**Brand assets:** The website supplies official transparent day and night lockups in `public/logo/top-logo-trim.png` and `public/logo/top-logo-trim-night.png` (both 1587×882). The image-generation prompts will not ask models to draw either mark. Clean source images remain unaltered; branded WebP derivatives will carry the suitable official variant exactly once.

**Baseline checks before changes:** `npm test` passes 49/49. `npm run build` succeeds, with Vite's existing large reception/Three.js chunk advisory. `npm run lint` has zero errors and six warnings in existing reception modules only. The existing QA report records prior responsive/navigation/reception checks; those features remain outside the implementation scope.

## Integration plan

1. **Project data before image production:** Combine the seven existing identities with 35 new distinct projects. Validate exactly seven projects in each of Residential, Commercial, Institutional, Public & Landscape, Interiors and Hospitality; all 42 titles/slugs unique; exactly five gallery records per project. Each proposal will carry a realistic brief, functional programme/requirements, credible floor or site organization, approximate scale/capacity where appropriate, structural system and construction logic, material palette, circulation and environmental/site response. Keep project facts plausible and internally consistent. Mark every record **Proposed Design**. Do not invent clients, awards, construction dates, commissions or completion/build status.
2. **Category-by-category image production:** Keep the existing five-view Cantilever House set. Complete the other six existing galleries from suitable supplied images and create only the missing views, replacing the two unsuitable stylized illustrations. Produce exactly five distinct image sources per displayed project, following the category-specific view set in the tracker. Generate each new project's hero first and use that local hero as the reference for its other views. Prompts should specify constructable geometry, plausible structure, realistic material junctions, credible circulation, site planning and climate response; avoid impossible cantilevers, distorted proportions, fantasy forms, decorative structures without function, people, text and generated logos. Reserve a calm right-centre edge for later logo placement. Complete all seven projects in one category before starting the next.
3. **Clean sources and official watermark derivatives:** Preserve source originals under `assets/generated-originals/projects/`. Create responsive 800/1400/2400 px WebP display derivatives under `public/img/projects/`. Sample local luminance at the watermark position and choose the supplied official day lockup `public/logo/top-logo-trim.png` over lighter areas or official night lockup `public/logo/top-logo-trim-night.png` over darker areas; both are original TOP assets, not recoloured or recreated. Each display derivative carries exactly one logo, on the right, slightly inset and vertically centred, at 5–7% of image width and 80–90% opacity. Preserve the exact logo RGB colors, proportions and typography; add no halo, panel, banner, border or tagline. Keep relative placement/scale consistent across responsive variants. Page components must use the branded derivative directly and must not add another watermark overlay.
4. **Preserve and extend the existing UI:** Reuse the central data and routes; retain the curved marquee and drag/keyboard controls using one cover per project, not all 210 gallery views. Add accurate All + six category filter counts and an editorial responsive project listing using existing reveal/transition utilities and theme tokens. Extend `Img` compatibly so non-portfolio pages keep their current string-ID behavior while portfolio records use structured image metadata and local responsive paths.
5. **Project detail and lightbox:** Keep `/projects/:slug`; render a watermarked cover hero and all five watermarked views in the gallery, with title/category, proposal status, brief, programme, design approach, materials, related links, previous/next and return-to-portfolio links. Extend the existing native lightbox with descriptive per-view captions/alt text and horizontal touch swipe while retaining close, Escape, arrow-key and previous/next controls. Project wording identifies proposed design intent and does not imply a built, commissioned or completed project.
6. **Verification and handoff:** Validate categories/counts, unique identities/asset paths, exactly five gallery images per project, local source and derivative existence, responsive variants, watermark coverage/placement and clean originals. Run existing tests, build and lint; browser-check filters, all project routes, gallery/lightbox interactions, image requests and representative responsive/theme states. Do not claim checks that were not actually performed. Package the complete source and local image assets in `TOP-Architects-Partners-7-portfolio-42x5.zip` with an implementation report.

## Proposed project record

```js
{
  id, slug, title, category, typology, location,
  summary, functionalBrief, programme: [],
  floorOrSiteOrganization, structuralSystem, constructionLogic,
  approach: [], materials: [], status: 'proposed',
  visualAnchors: [],
  gallery: [
    { id, view, alt, scenePrompt }
    // exactly five distinct source views; responsive variants do not add gallery entries
  ]
}
```

The seven existing project identities and their design intent remain recognizable. All 42 are presented as proposed architectural designs; no text claims that they are built, completed, commissioned or award-winning. Clean image originals remain separately available from their watermarked responsive derivatives.
