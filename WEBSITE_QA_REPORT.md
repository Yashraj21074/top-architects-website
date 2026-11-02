# Website QA Report — content, scroll experience and Services revision

Environment: headless Chromium (Playwright), software WebGL, no GPU/audio/voices, no real devices. Scripts in `tools/qa/`.

## This revision — performed
- **Build / lint / unit:** `npm run build` ✓; lint 0 errors (7 warnings, mostly in the supplied reception code); `node tools/qa/dialogue.test.mjs` ✓ (updated for the new confirmed-fact lines and "again" pool).
- **Whole site, 14 URLs × 9 widths (274, 320, 375, 393, 430, 634, 768, 1024, 1440), opened-from-reception flag set:** 0 issues — no horizontal overflow, no off-screen or clipped buttons, no broken images, no console errors, one `<h1>` per page, ≥ 40 px targets, **Back to Reception** visible on every non-home page, homepage hero has the single "Explore the Studio Experience / Discover Our Studio" button. Fixed during the audit: hero grid min-content overflow at 274 px, gallery grid, mask-reveal elements never being observed (clip-path hid them from IntersectionObserver), missing word spaces in split headings.
- **Services scroll experience:** screenshots at 12 scroll positions on desktop (1440×900) and mobile (390×844): hero opens (artwork scales/drifts, ribbon lines expand, "01" emerges), each chapter reveals, planning sequence interior → plans → diagram, visualization frame expands to full width, consultancy layers appear, closing CTA with founder name/title. No horizontal overflow.
- **Reduced motion (`prefers-reduced-motion: reduce`)** on 7 pages: no sticky/pinned stages, no hidden content, no cursor, route sweep disabled, no overflow.
- **Reception regression after the dialogue/speech-rate change:** greeting uses the new confirmed-fact line; the page still opens only after the speech end event (mock engine, 251 ms after it); return greeting still context-aware.
- Earlier reception checks (logo/receptionist framing at 11 viewports, speech sequencing, Repeat/Skip/Back) were not re-run in full; only the sequencing scenario above was repeated.

## Not verified
- Real speech voices/audio, real iOS/Android devices, Firefox/Safari, and scroll smoothness on real hardware (software rendering here, so frame rates and "feel" of the scroll-driven stages are unmeasured). Transform/opacity/clip-path only, one shared passive scroll loop, observer-gated — but no profiler run.
- The custom cursor and magnetic button were only checked for presence/absence (desktop fine-pointer vs touch/reduced motion), not for feel.
- Screen readers; automated contrast audit (night/day palettes were chosen for contrast, unmeasured).
- Projects page uses an editorial grid with mask reveals; the pinned horizontal "archive" gallery from the scroll brief was intentionally not built, because the later brief asks for a restrained grid.

## Known limitations
- **Artwork resolution:** the supplied Services collage is 1254 × 1254 px. Crops were upscaled 2× (Lanczos + light sharpening) and zoom is capped (hero ≤ 1.5×, frames ≤ 1.08×); on large screens the artwork is visibly soft. A 3000 px+ version would fix this.
- **No founder portrait** has been supplied: the About, Team and Home sections show a dark monogram plate ("SJ"), not a photograph. **No CoA/RIBA logos** were supplied: the bodies are listed by name only.
- Imagery other than the homepage hero and the Services artwork is generated conceptual imagery (labelled).


---
(Previous revision's reception/responsive results follow for reference.)

Environment: Linux sandbox, headless Chromium (Playwright), **software WebGL** (a few fps), no GPU, no audio output, no speech voices, no real phones. Scripts: `tools/qa/*`.

## 1. 3D reception at each width (`reception_responsive.py`, real scene, completed logo, subtitles visible)
Measured by projecting the logo plane, head and upper body through the live camera and comparing them with the on-screen UI boxes. In every row: complete logo inside the scene area and viewport; head and upper body inside the scene area; **no UI box overlaps the logo, head or upper body**; no clipped/off-screen controls; no horizontal overflow; canvas drawing buffer aspect = CSS aspect (0 % error, i.e. no stretching).

| Viewport | Logo width (px) | Name line height (px) | Gap logo→head (px) | Receptionist height (px) | Menu |
|---|---|---|---|---|---|
| 274×653 | 189 | 8.0 | 50 | 123 | 6 rows + scroll peek |
| 320×568 | 168 | 7.2 | 44 | 111 | 6 + scroll peek |
| 375×667 | 231 | 9.8 | 59 | 159 | 6 + scroll peek |
| 393×852 | 288 | 12.3 | 74 | 196 | all 7 visible |
| 430×932 | 316 | 13.5 | 82 | 216 | all 7 |
| 634×844 | 335 | 14.3 | 84 | 242 | all 7 |
| 768×1024 | 432 | 18.4 | 107 | 319 | all 7 |
| 1024×768 | 399 | 17.0 | 94 | 327 | all 7 |
| 1440×900 | 470 | 20.0 | 111 | 385 | all 7 |
| 1920×1080 | 465 | 19.8 | 115 | 346 | all 7 |
| 844×390 (phone landscape) | 159 | 6.8 | 40 | 116 | all 7 (2 columns) |

Rotation 390×844 → 844×390 → 390×844: identical results to a fresh load each time (framing re-fits, canvas stays undistorted). Screenshots were inspected at 274, 320, 375, 393, 844×390, 1024, 1440 and at 393 in both day and night: crest, "TOP" and "ARCHITECTS + PARTNERS" are all visible and readable. Below ≈ 400 px width the smallest line is 7–10 px tall: legible but small — the physical limit of a 0.5 m logo on a phone-sized scene window.

## 2. Whole-site responsive audit (`site_responsive.py`)
14 URLs × 9 widths (274, 320, 375, 393, 430, 634, 768, 1024, 1440) = 126 page checks, all with the "opened from reception" flag set: **0 issues** — no horizontal overflow, no off-screen/clipped buttons, no broken images, no console errors, one `<h1>` per page, buttons ≥ 40 px, and the **← Back to Reception** button fully visible on every non-home page. Two real defects found and fixed during the audit: a 12-column gallery grid whose gaps overflowed at 274 px, and grids sized by min-content (now `minmax(0,1fr)`).

## 3. Requirements checklist
1. Receptionist clearly visible at all widths — yes (table above).
2. Menu fits or scrolls — yes: 3-column grid (4 on ≥ 600 px), scrolls with a visible peek on short screens; 44 px targets; focus and pressed states.
3. Back to Reception on every page opened from the reception — yes (sticky, tested at all widths; stays visible when scrolling).
4. Homepage hero has no "Explore Our Projects" button — confirmed (one button).
5. New button opens the existing reception — yes: "EXPLORE THE STUDIO EXPERIENCE" (≥ 401 px), "DISCOVER OUR STUDIO" (≤ 400 px); width 234–353 px, no clipping.
6. Repeat Greeting — 4 rapid taps on a touch device: identical text, never more than one utterance active, no extra navigation (speech mock).
7. No overflow or clipped controls at the tested widths — yes.

## 4. Speech/navigation (re-run after the layout rewrite; mock speech API)
Page opens 251 ms after the engine's end event and not before; Skip opens it once, 19 ms after the tap, with no second navigation; switching destination mid-line opens only the new page; external cancel never navigates; Back appears only while a selection is pending; speech blocked or unavailable → subtitle shown in full, then one navigation. Returning from a page gives a return greeting from that page's pool; repeated returns add "Good to see you again…" lines. `node tools/qa/dialogue.test.mjs` passes. Also verified: Home (375×667 touch) → hero button → reception → About → Back to Reception → returning greeting.

## Not verified / limitations
- **Real speech voices and audio output**, real-device browsers (iOS Safari/Chrome Android, URL-bar and keyboard behaviour), and real-time animation smoothness were not tested; layout uses `100dvh`, `visualViewport` and ResizeObserver but this was only exercised by viewport resizing in Chromium.
- The 3D renders at a few fps here, so the logo assembly animation was completed programmatically in the measurements; on a real GPU it plays in a few seconds.
- No Firefox/WebKit runs. No screen-reader or automated contrast audit.
- Pages opened directly (no reception flag) intentionally show no Back to Reception bar; navigation there is the header plus breadcrumbs.
- No mouth animation or blinking is possible with the supplied character model (documented earlier).
