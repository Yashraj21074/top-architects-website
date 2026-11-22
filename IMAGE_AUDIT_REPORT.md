# SITE-WIDE IMAGE AUDIT — TOP Architects + Partners

## Headline finding
**The source contains no photographs.** `src/content/images.js` and `portfolioImages.js` describe every image as a "conceptual render", "illustrative concept art" or "proposed design visualization", and `public/` holds only those files. I had no means to obtain licensed architectural photography or to verify usage rights for external images, and I did not fabricate any. So the requirement for *real photographs* is **not met**; what this round did is remove every cartoon-style image and replace it with the studio's own most photographic project visualizations, each used only where it matches the subject. Real photographs can be dropped in later without code changes (see "How to add real photography").

## What counts as "cartoonish" here
14 legacy images (`villa-dusk, villa-pool, villa-detail, tower-low, tower-plaza, civic-front, civic-aerial, interior-living, interior-stair, landscape-garden, landscape-pavilion, resort-hill, facade-fins, studio-model`): flat low-poly scenes with lollipop trees. They were visible on the homepage, Studio, Contact, all five service pages and the whole old Journal. Everything else is photo-real CGI.

## Pages inspected
Homepage · 3D Reception introduction section · About / Studio · Projects landing (carousel covers) · all 42 project detail pages (210 gallery images) · six category views · Services landing · five service detail pages · Our Process · Team · Journal landing · all 12 Journal articles · Contact · 404 · Footer · EXPLORE TOP. Desktop 1440/1280, tablet 1024/820, mobile 390/360 (route sweeps for overflow and broken images; visual review at desktop and 390 px).

## Replaced
| Where | Was | Now | Why |
|---|---|---|---|
| **Homepage — "3D Reception / Be welcomed at the studio."** (slogan, wording and CTA untouched) | `interior-stair` (low-poly stair and lamps) | `portfolio/executive-office-1` — *The Executive Office: reception and corridor* (stone reception desk, timber panelling, glazed meeting rooms, soft linear lighting) | The most believable "arriving at a studio reception" image available; the 3D receptionist itself is untouched |
| Studio page image band | `landscape-garden` | `render-landscape-pavilion` | cartoon scene |
| Contact page image | `landscape-pavilion` | `render-landscape-pavilion-close` | cartoon scene |
| Service pages (Architecture / Interior Design / Planning / Visualization / Consultancy) | `villa-pool` / `interior-living` / `civic-aerial` / `tower-plaza` / `facade-fins` | `render-villa-poolside` / `render-interior-living` / `render-hospitality-resort` / `render-commercial-tower` / `render-commercial-facade` | cartoon scenes; each new image matches its service |
| Journal (old 4 articles + 4 "notes") | `villa-dusk`, low-poly covers | removed with the old content; 12 new stories use 47 distinct project images (3–5 each, none repeated), each captioned with the project it belongs to and credited "TOP Architects + Partners" | brief |
| Journal landing hero | `villa-dusk` | `portfolio/riverstone-arts-terraces-1` | cartoon scene |
| Homepage banner eyebrow colour | off-brand `#e6cfa3` | brand gold token | colour consistency |

## Retained (authentic to the studio's own work, not cartoonish)
Homepage hero poster/video frame · the 42 projects' covers and galleries (210 images, each tied to its own project — no substitution) · the `render-*` set · Cantilever House images.

## Retained but flagged (stylised / look artificial; no authentic alternative exists)
- **Services landing hero** (`artwork/ribbon-*`): glossy cream-and-gold ribbon collage with the TOP logo; also the `artwork/` stills inside the service chapters (bedroom, living, villa, books, materials, plans, sketch). Stylised CG art rather than architecture. Recommend replacing with photography of the studio's material library / drawings.
- **Our Process** (`process/image-1…5`): staged studio tabletops (models, plans, samples). They read as CGI. Recommend real photographs of the studio.

## Still needing genuine photography
1. All 42 portfolio projects (no photograph of any project exists in the source).
2. A real studio / reception photograph for the homepage banner (current image is a project visualization of an executive-office interior).
3. Team / founder portraits (the Team page has none).
4. Services hero and Process imagery (above).
5. Journal heroes and supporting images (all currently project visualizations).

## Visible labels on images — decision needed
The shared `Img` component still prints a small **"Illustrative render"** tag on project and service images, and the footer says "TOP portfolio imagery is illustrative; it does not depict completed or commissioned work." (You asked me to keep the footer text exactly.) These are honest disclosures, not "AI" labels, and I left them. Journal images carry no tag. Tell me if you want the tag removed on some surfaces; removing it while the imagery remains renders is a transparency call for you.

## Unused legacy files
The 14 cartoon-style images still exist in `public/img/` (and in the registry) only because five *unpublished* legacy project records in `src/content/projects.js` reference them; none is shown anywhere. They can be deleted together with those records.

## Verification
- 112+ route loads across all 42 projects, services, 12 articles in Day and Night: no broken images (`naturalWidth === 0`), no overflow.
- Journal: automated test that every article image resolves in the registry, none is reused, none is a legacy cartoon id.
- Visual review: homepage banner, Studio, services detail, Journal landing, four article layouts (desktop), mobile article header.
- Not verified: every one of the 210 project images was not individually reviewed by eye.

## How to add real photography
Put the file in `public/img/…` and register it in `src/content/images.js` (id → src/width/height/alt/focal point), then change the `image:` id in `src/content/journal/*.js` (articles), `src/content/services.js` (services) or the page JSX. The Journal templates already handle missing supporting images (remove a `F()`/`PAIR()` block).
