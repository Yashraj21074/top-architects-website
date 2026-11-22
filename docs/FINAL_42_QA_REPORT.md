# Final QA report — 42-project update

Automated checks run with Playwright (Chromium, simulated touch) against the production build, plus unit tests. **Real Android/iOS devices were NOT tested.**

| Requirement | Result | Evidence |
|---|---|---|
| Exactly 42 public projects, 7 per category, 5 images each, 210 unique images | PASS | `tests/portfolio.test.mjs` (7 tests); browser run: All = 42, each category = 7, no duplicate titles |
| All image files exist, none enlarged beyond native width | PASS | unit tests; 0 broken images across all project pages |
| Every project card opens the correct page: correct title, 5 distinct loaded images mapped to that project, lightbox 5/5 | PASS at 1440, 768 and 390 px | `tools/qa/final42.py` (42 projects x 3 viewports, 210 images each) |
| Retired older projects not public | PASS | /projects/hillside-retreat and /projects/light-filled-interior show "not found"; absent from lists, services, reception assistant, journal links |
| Category filters | PASS at 3 viewports | 7 tiles + 7 gallery covers per category |
| Gallery: no pause/play/arrows, continuous motion, hover slow-down and restore, drag both ways, swipe both ways, seamless loop, larger cards, no overflow | PASS at 1920, 1440, 1366, 768, 390, 375 px | `tools/qa/gallery_motion.py` (simulated touch events) |
| Homepage has one reception CTA in the hero; old CTAs removed | PASS | hero contains exactly 1 link; body has 1 reception link. The site header (all pages) still has its own "Enter 3D Reception" button (visible on desktop only) |
| Back navigation (history-based labels, scroll/category/gallery restore, fallbacks, browser Back/Forward) | PASS at 3 viewports | `tools/qa/final42.py` (45 checks each). "Back to 3D Reception" tested with a simulated history entry |
| Other pages and 3D Reception | PASS (loads, canvas present, no console errors) | The reception's 3D interaction itself was not exercised |
| Lint / unit tests / build | 0 errors (6 pre-existing warnings) / 56 pass / builds | |
| Real-device touch | NOT VERIFIED | |

## Notes and unresolved items
- The three ZIPs contain 40 projects. Cantilever House and Cloudstone Mountain House (completed earlier, already on the site / in the repo) make up the 42.
- All supplied images are below 2304 x 1536 (most 1264–1679 px wide) and are shown at native size.
- Coastal Retreat Resort images show a logo-style mark at the bottom-right; left exactly as supplied.
- Boutique Hotel Suite images 1, 3 and 5 are very similar views.
- Part 3 view labels / alt text and the 14 new descriptions were written from the images only (no locations, clients, dates, awards or build status) and should be proof-read.
- Decorative images on the Services and Journal pages were deliberately left unchanged.
- The "Be welcomed at the studio." band on the homepage remains, now without a button.
- Running two browsers at once on a slow machine can slow the gallery and trigger harmless 3D texture warnings; the checks pass when run one at a time.
