# Bespoke Architecture Studio — Technical Design Reference

**Purpose.** Read-only analysis of the user-supplied Bespoke reference ZIP, translated into the actual implementation in the supplied TOP Architects + Partners website. The Bespoke archive was inspected but not modified or copied into TOP. This report distinguishes reference behavior from TOP-specific adaptations.

## Reference inspection scope

The reference archive contains 12 files: `README.md`, `index.html`, `metadata.json`, `package.json`, `src/App.tsx`, `src/index.css`, `src/main.tsx`, `tsconfig.json`, `untitled.tsx`, `vite.config.ts`, `.env.example`, and `.gitignore`. The marquee is implemented in `src/App.tsx`; its styles are in `src/index.css`. The reference is a single-page React app: it has no separate Projects route or project-detail system. Its six gallery images are remote image URLs, not local project assets.

## 1. Curved horizontal architectural image marquee

The reference uses a centered horizontal, non-wrapping flex track inside an `overflow-hidden` section. Its gallery wrapper uses `relative py-4 overflow-hidden select-none`; its track is `flex w-max gap-3 sm:gap-4 py-4` and the image cards are `flex-shrink-0`. Six image URLs are duplicated (`[...IMAGES, ...IMAGES]`) to provide the repeated content needed for a seamless pass.

The curved top and bottom edges are not made by bending the row or rounding every photograph. Two absolutely positioned, pointer-transparent SVG overlays paint white masks over the moving track. Each mask uses `viewBox="0 0 1440 100"` and `preserveAspectRatio="none"`; its height is 80 px below `sm`, and 100 px at `sm` and above. Top path:

```svg
M0 0H1440V50C1440 50 1200 100 720 100C240 100 0 50 0 50V0Z
```

Bottom path (mirrored):

```svg
M0 100H1440V50C1440 50 1200 0 720 0C240 0 0 50 0 50V100Z
```

The masks sit at `z-10` with `pointer-events-none`. They produce shallow concave wave boundaries across the gallery while keeping the photograph bodies rectangular. The perceived curve comes from the SVG edge masks—not from card-by-card tilt, rotation, or a sinusoidal layout.

## 2. Continuous image movement and animation speed

A `requestAnimationFrame` loop is created once in `useEffect`. The reference stores the horizontal track offset in a ref and writes it directly as `translate3d(offset, 0, 0)`, with `willChange: transform`. With no active drag and inertial velocity at or below `0.1`, it subtracts `SPEED = 0.8` from the offset on every frame. The intended direction is right-to-left. At 60 Hz, this is about 48 CSS pixels per second; the original is frame-count based, so actual px/s varies with the display frame rate.

The loop measures `track.scrollWidth / 2` as one image cycle and wraps the offset into `(-halfWidth, 0]`. The duplicate image set gives the track room to reset without showing a blank gap, provided the repeated cycle is wide enough for the viewport. The reference does not expose a user pause control, stop on hidden tabs, or check `prefers-reduced-motion`; its RAF loop continues when reduced motion is requested.

## 3. Mouse/touch dragging and interaction physics

The reference handles `onPointerDown`, `onPointerMove`, `onPointerUp`, and `onPointerCancel` on the track. On pointer down it sets a drag ref, clears velocity, tries `setPointerCapture`, and stores the starting x-coordinate, track offset, and `performance.now()` timestamp. On movement it computes `dx`, clamps elapsed time to at least 1 ms, and estimates velocity at roughly 60 Hz with `(dx / dt) * 16`. It updates the offset by pointer displacement and wraps across the repeated-cycle boundary, adjusting the drag origin to prevent a jump.

After release it attempts to release pointer capture. The RAF loop applies velocity once per nominal frame, decaying it with `velocity *= 0.95`; once magnitude is below `0.1` px/frame, autoplay resumes. This is exponential friction—not a spring or a physics library. `touch-none`, `cursor-grab`/`cursor-grabbing`, `draggable={false}` and `pointer-events-none` on photos support direct dragging and prevent the browser's native image-drag ghost. A “See Projects” CTA gives the same velocity ref a brief `-12` px/frame impulse.

## 4. Image proportions, spacing and curved positioning

The reference card is `w-60 h-80` on narrow screens and `sm:w-80 sm:h-[32rem]` at `sm` and above. With Tailwind's default spacing scale, those boxes are 240 × 320 CSS px (3:4) and 320 × 512 CSS px (5:8). These are card-box ratios, not asserted source-image ratios; `object-cover` fills/crops each box. Cards have 12 px gaps below `sm`, 16 px at `sm`+, `rounded-2xl`, a neutral loading background, and `overflow-hidden`. No project-specific curved card transforms exist; only the top/bottom SVG masks curve the sequence.

## 5. Hover effects and transitions

The reference has no card-specific zoom, parallax, caption, tilt, or hover transition. The gallery movement is an imperative transform. The cursor changes between grab and grabbing while pressed. Header links, close controls, buttons and the meeting UI use conventional color/opacity/transform transitions; menu entries stagger on opening. “See Projects” does not navigate or scroll—it adds a brief impulse to the marquee velocity.

TOP's adaptation applies low-amplitude image scaling and an arrow lift on hover/focus, without adding a stack of competing effects. It pauses autoplay while the pointer is over the gallery or keyboard focus is within it, so the real project links can be activated reliably; the underlying play/pause choice is retained.

## 6. Typography and editorial layouts

The reference places a large centered title and brief supporting statement above a wide image-only movement strip, followed by a short centered paragraph and two text CTAs. Its heading scales from Tailwind `text-4xl` through `lg:text-[5.5rem]`, with strong weight, tight tracking and `leading-[1.05]`; body copy scales from `text-base` to `md:text-xl`. Its inline logo is small, and the overall palette is restrained white/neutral. The images themselves have no captions or project facts.

TOP already has a distinct editorial system—Cormorant Garamond and Inter, warm ivory/limestone, graphite and bronze, a blue logo asset, project content, conceptual-study notices, asymmetric page grids and page-specific motion timing. Those TOP design choices take precedence. The reference contributes a movement motif and image silhouette, not its brand, palette, logo, copy, project content, route structure or typography treatment.

## 7. Navigation drawer and UI/UX interactions

The reference header is fixed, with an inline SVG logo at left, centered hamburger, “Book a meeting” CTA on larger screens, and a spacer balancing the logo on mobile. Opening the menu shows a dim, blurred, click-to-close backdrop behind a white panel. On mobile, the menu covers the viewport and enters from below; at `sm` and above it becomes a right-side panel up to `max-w-sm`, entering from the right. Its four links—Work, Index, Events, Projects—stagger by `150 + i × 60 ms`; the booking CTA uses 400 ms. Menu/booking dialogs lock body scrolling. A meeting modal asks for required name, email and project brief and displays local success state; the reviewed code does not submit a booking request to a backend.

TOP's navigation is intentionally different and already more complete: canonical destinations come from `src/content/destinations.js`; its mobile menu is a portal dialog with Escape handling, focus trap, background-scroll lock and active-route state, plus the 3D reception link. The Team destination is deliberately excluded from the ordinary menu (`nav:false`) but remains a route and reception destination. Those labels, route rules, logo and reception link were preserved rather than replaced by the Bespoke drawer.

## 8. Animation implementation and TOP-specific translation

The reference uses React refs, `requestAnimationFrame`, pointer events, `setPointerCapture`, `performance.now()` and direct `style.transform` updates. It has no spring/marquee package, CSS keyframe for track movement, IntersectionObserver for the marquee, or time-based spring. Its six cards load lazily from a remote WebP proxy with a CDN fallback. It has no keyboard gallery control, pause/resume, reduced-motion behavior or project metadata in the strip.

TOP uses local multi-resolution WebP sources through `src/content/images.js` and `src/components/Img.jsx`; project data is in `src/content/projects.js` and each supplied published entry is explicitly a conceptual study. The implementation in `src/components/ProjectMarquee.jsx` uses the current filtered TOP project records, their existing `cover`, `slug`, `title`, `category` and `typology`, existing image registry, and existing `/projects/:slug` routes. It borrows the reference's SVG curve paths and repeated track only; it adds no external image source or dependency.

The TOP movement is elapsed-time-normalized: 0.8 px per nominal 60 Hz frame (about 48 px/s), with per-frame friction `0.95` normalized for elapsed time, a 0.1 px/frame threshold, pointer capture and a 5 px drag-vs-click threshold. Each project expands into separate cards for its distinct gallery image IDs instead of cloning one cover; the Residential filter now presents five different views before the seamless cycle repeats, and each card still links to the existing project detail. Fifteen custom photorealistic architectural concept renders were generated: one new hero view for each of the seven existing studies, plus four additional Residential angles and one alternate view each for the Civic Hall, garden pavilion, interior and hospitality studies. Their 2304 × 1536 masters are kept in `assets/generated-originals/`; 800, 1400 and full-source WebP variants are in `public/img/`. No project records were added.

The measured cycle repeats enough times to cover the viewport, including narrow one-category filters. Individual cards are also positioned on an arched curve (54 px desktop amplitude, 28 px mobile) and receive a subtle tangent-following tilt; the SVG top/bottom masks now overlap the card images rather than just covering empty padding. This makes the strip's curved silhouette visible in both card placement and clipped image edges. `Home`/arrow-key and previous/next buttons nudge the strip; repeated cycles are hidden from assistive technology and removed from tab order. A play/pause control is provided. Autoplay starts paused for `prefers-reduced-motion`, pauses when the user hovers, holds/drags, or focuses the gallery, and resumes on exit unless deliberately paused. The masks use the active TOP `--bg` token, so they follow day/night theme.

Each project-detail hero/gallery image can open `src/components/ProjectLightbox.jsx`: a native modal dialog with image index, previous/next controls, arrow-key browsing, Escape-to-close and native modal focus handling. The generated views are mapped onto existing studies while case-study facts, categories, slugs, routes and navigation remain in place; the conceptual-study disclosure is preserved.

Other pages retain their already distinct motion instead of repeating the marquee everywhere: Home keeps its supplied-image split hero and 3D reception CTA, with an immediate TOP-specific statement, portfolio/studio actions and a shorter brand reveal; Studio and Team keep the founder plate/monogram and editorial reveal; Services keeps its five-chapter scroll exhibition; Process keeps its six-stage progress rail and native details accordions; Journal retains its editorial cover, filters and reading restoration; Contact keeps its visible mailto-only disclosure. Project detail gains its own lightbox interaction.

## Preservation and implementation guardrails

- Keep all existing routes, project slugs, page copy, route wiring, TOP assets and `src/content` records unchanged unless strictly needed for presentation.
- Do not add, rename, reorder or invent projects, years, locations, project statuses, members, testimonials, journal claims or statistics. Retain the “conceptual study” and “illustrative” disclosures.
- Preserve `public/img/hero/original-supplied-hero.jpeg` and the current homepage hero renderer (`src/components/HeroMedia.jsx`); do not substitute imagery or animate that image without authorization.
- Retain TOP wordmark artwork and blue logo color, automatic day/night theme, shared reveal/parallax engine, responsive behavior and reduced-motion handling.
- Leave `/reception`, both GLB models and the 3D scene/speech/conversation/input/framing/lifecycle code untouched.
- Keep Contact explicitly mailto-only; introduce no backend or external API.

## Validation evidence

- `npm run check` passed: ESLint reported 0 errors (6 warnings in existing, unrelated reception files), all 49 unit tests passed, and the Vite production build completed. The existing large-chunk warning concerns the separate Three.js reception bundle.
- Screenshot-free Chromium/Playwright smoke audit covered eight routes (`/`, `/projects`, two project details, `/services`, `/process`, `/journal`, `/contact`) at nine viewport widths (274, 320, 375, 393, 430, 634, 768, 1024 and 1440 px): all 72 route-width combinations had one H1, zero horizontal overflow, no broken eagerly-loaded images and no console/page errors.
- Browser interaction checks passed for autoplay and pause/resume, button and arrow-key nudges, hover and press-to-pause, drag without accidental navigation, five distinct Residential views with visible card curvature, distinct views in the Institutional filter, project-detail navigation, lightbox open/next/Escape close, two-image wrap and reduced-motion default pause with explicit playback.
- Full `npm audit` reports five moderate issues in the supplied development lint toolchain; `npm audit --omit=dev` reports zero production vulnerabilities. No unrelated dependency upgrades were made.
- No screenshots, reference-source edits, new project records, external assets, routes, production services or backend behavior were added.


## Latest TOP presentation refinements (31 October 2026)

The archive now introduces **“Design explorations.”** as a TOP Architects + Partners portfolio instead of leading with the generic “conceptual studies” label. Its compact two-column intro moves the image strip earlier on desktop. Cards use desktop width `clamp(17rem, calc(22vw - var(--pm-gap)), 34rem)` and mobile width `min(64vw, 17rem)`, with a higher-contrast category pill/title. A computed inverse of each card’s `--curve-y` positions its caption above the fixed lower SVG mask at all points on the wave, while the card image continues to follow the curve; hover/focus adds only a subtle lift.

The full TOP logo now appears only in the opening animation; the homepage hero does not repeat it as a large overlay (the small navigation mark remains). The hero shows the short line **“Spaces shaped by material, light and context.”**, the verified studio introduction, a visible Projects CTA and a Studio link over the supplied moving full-bleed image. The logo reveal is a full-color rise/scale/focus animation and fades into the page; the lower-page 3D Reception remains. The TOP receptionist and project-detail pages also use brand-specific design-exploration wording and retain an unambiguous disclosure that illustrative renders are not photographs of completed or commissioned projects.

The five-chapter Services experience now uses the clean local 800/1400/2400 px responsive sources for the architecture, entrance, interiors, hospitality-visualization and consultancy images, replacing soft crops from the supplied composite. The original Services opening collage, planning drawing, and all source originals were preserved. Eight mapped image families are checked for all three responsive widths.


**Asset-resolution clarification:** the registry suffix `2400` names the full-source slot; the generated masters are 2304 × 1536 px, with genuine 800 px and 1400 px responsive downscales. No synthetic upscaling is used.
