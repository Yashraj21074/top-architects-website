# FINAL TEST REPORT — TOP Architects + Partners

**Environment:** Linux container, Node (project lockfile), headless **Chromium** via Playwright (Python) against `vite preview` of the production build on `localhost:4173`; browser clock mocked to force Day/Night and boundary times; axe-core (installed outside the project) for accessibility scans. **Not available:** Firefox/Safari/Edge, physical devices, screen reader, microphone/audio hardware, TV browser, live AI provider, Lighthouse.
Statuses: PASS · PARTIAL · FAIL · BLOCKED · UNVERIFIED · N/A. Results below were re-run on the final build. Scripts: `tools/qa/browser_*.py` (they expect a preview server on port 4173).

## Commands and results
| Command | Result |
|---|---|
| `npx eslint .` | 0 errors, 6 warnings (all pre-existing, in `src/reception/*`) |
| `npm test` (`node --test tests/*.test.mjs`) | **76 / 76 pass** (56 existing, unmodified + 20 new) |
| `npx vite build` | Pass. CSS 113.2 KB (22.1 KB gzip), main JS 531.1 KB (153.6 KB gzip) |
| `SITE_URL=… npx vite build` | Pass; `sitemap.xml` has 60 URLs, canonical + og:url present |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Secret scan of `dist/` | No key names / provider URLs (one random-byte match inside the binary `.glb`, not text) |
| `python3 tools/qa/browser_theme_nav_filters.py` | 34 / 34 pass |
| `python3 tools/qa/browser_routes_search_viewports.py` | 46 / 46 pass |
| `python3 tools/qa/browser_a11y_forms.py` | 10 / 10 pass + axe scan below |

## Matrix
| Area | Status | Evidence / limits |
|---|---|---|
| Automated tests | PASS | 76/76 |
| Build | PASS | above |
| Lint | PASS | 0 errors; 6 pre-existing warnings |
| **Theme: boundaries** | PASS | 06:59→night, 07:00→day, 17:59→day, 18:00→night, 00:00→night, 12:00→day; `data-theme` already correct on first parse (pre-paint) |
| Theme: open-tab transition | PASS | clock advanced across 18:00 without reload: day→night; kept after route navigation and reload |
| Theme: browser UI colour | PASS | `theme-color` = #101722 at night / #F3F0E8 by day (bug found and fixed this round) |
| Theme: no wrong-theme flash | PARTIAL | attribute and html background are correct at first parse; no frame-by-frame paint capture was taken |
| Single source for hours | PASS | `tests/theme-source.test.mjs` |
| Active-nav underline colour | PASS | computed `rgb(48,77,120)` day, `rgb(186,142,52)` night; `aria-current="page"` present |
| Studio heading clipping | PASS | no clipped line at 1440/1280/1024/820/390/360 |
| Old Menu removed | PASS | no "Menu" button at any of 6 viewports; test guards the code |
| Desktop vs tablet/mobile nav | PASS | links ≥1241px; Explore TOP ≤1240px (1440, 1280 / 1024, 820, 390, 360) |
| EXPLORE TOP content | PASS | exactly 9 pages, 5 services, 6 categories, 42 projects, 4 articles |
| EXPLORE TOP search | PASS | "house", "interiors", "commercial building", a full project title, a partial article title, typos; every project/article/service title finds itself first (unit test); no-results + Clear |
| EXPLORE TOP keyboard | PASS | Tab/Shift+Tab trapped (80 presses), ArrowDown/Up, Enter, Esc, focus restored to trigger |
| EXPLORE TOP fits viewport | PASS | no overflow at 6 viewports × 2 themes |
| EXPLORE TOP touch | PARTIAL | target sizes by CSS (≥44px); no touch events / device were exercised |
| TV remote / d-pad | UNVERIFIED | arrow keys tested with a keyboard only |
| Current-location trail | PASS | "Projects" shown on /projects |
| Browser Back / Forward | PASS | after opening a result from the overlay |
| Recent journey / Forward button | N/A | intentionally not built (later brief forbids; see report §11) |
| Contextual return link | PASS | "RETURN TO RESIDENTIAL" from a filtered list and the filter is restored; "RETURN TO PROJECTS" on direct load; services → SERVICES; article → JOURNAL |
| Scroll restoration on return | UNVERIFIED | existing mechanism, not re-measured this round |
| Six category filters | PASS | each active (`aria-pressed`), 7 projects, URL updates |
| All 42 project pages | PASS | Day and Night: title matches, no broken images, no overflow, one return link |
| Service pages | PASS | 5 pages load; link counts equal `serviceProjects()` (32/8/16/3/2); Contact link present |
| Journal | PASS | 4 articles open with reading-progress element |
| Project-to-service coverage | PASS | every project in ≥1 service; no service lists all 42 (unit test) |
| Lightbox keys/swipe | UNVERIFIED | existing component, not exercised this round |
| Contact form validation | PASS | empty submit → 3 inline errors + focus; bad email/short message rejected |
| Contact form submission | N/A | mailto-based by design; delivery cannot be observed; page never claims delivery |
| 404 | PASS | themed, links home/projects/services/contact, `noindex` |
| Reduced motion | PASS (EXPLORE TOP) | animation `none` under `prefers-reduced-motion` |
| **Responsive** | PASS | 12 routes × 6 viewports × 2 themes: zero horizontal overflow, zero page errors |
| Accessibility — axe-core WCAG 2.0–2.2 A/AA | PASS | **0 violations** on 12 routes × 2 themes + EXPLORE TOP in both themes (after fixes) |
| Accessibility — manual | PARTIAL | keyboard walk of EXPLORE TOP and form done; no screen reader; no full-site keyboard walk; axe does not cover everything |
| Reception: scene loads | PASS | reaches ready state in both themes (previous round) |
| Reception: AI plumbing | PASS | 10 API/client/conversation tests with a stubbed provider |
| Reception: live AI replies | **BLOCKED** | no credentials |
| Reception: understanding quality | **UNVERIFIED** | needs a live model |
| Reception: fallback | PASS | not-configured, provider error, timeout, bad output all fall back (unit tests) |
| Reception: voice (mic, transcription, speech playback) | UNVERIFIED | no audio hardware; code path unchanged |
| SEO | PARTIAL | titles/meta/OG/JSON-LD/robots/sitemap/canonical verified in build output and unit-level; no crawler or social-preview tool run |
| Performance | PARTIAL | bundle sizes measured; no Lighthouse / Web Vitals run |
| Browser compatibility | PARTIAL | Chromium only; Firefox, Safari, Edge UNVERIFIED |
| Real devices | UNVERIFIED | responsive emulation only (not equivalent) |
| Analytics / cookies | N/A | none present, none added |

## Defects found and fixed during this testing
1. `theme-color` stayed on the Day colour at night (script ran before the meta tag).
2. ArrowDown from the search box skipped to "Clear".
3. Provider-validation whitespace bug and chatty-query retrieval (stop-words) found by new unit tests.
4. axe: invalid `aria-label` on non-heading text, accessible-name mismatches (marquee cards, viewer/gallery buttons), night chip-count contrast 4.46:1.
5. My earlier test sweep counted unpublished slugs as "projects" (corrected).

## Remaining limitations
Pre-existing lint warnings (6, Reception code). Items marked UNVERIFIED/BLOCKED/PARTIAL above. The visitor-facing privacy wording for AI processing is not written (no policy invented).


---

# ROUND 2 RESULTS (navigation, Journal, imagery, footer)

Same environment as above (headless Chromium via Playwright against `vite preview`; mocked clock for Day/Night except keyboard tests, because the mocked clock also freezes `requestAnimationFrame`; the first-visit intro splash is pre-dismissed through `sessionStorage` so it does not take keyboard focus).

| Command | Result |
|---|---|
| `npx eslint .` | 0 errors, 6 warnings (pre-existing) |
| `npm test` | **83 / 83 pass** (round 1: 76; +7 Journal content tests; Journal/explore counts updated to 12 stories) |
| `npx vite build` | Pass. CSS 118.5 KB (23.1 KB gzip), main JS 582.7 KB (171.0 KB gzip) |
| `tools/qa/browser_dropdown_navigation.py` | **58 / 58** |
| `tools/qa/browser_theme_nav_filters.py` | 34 / 34 |
| `tools/qa/browser_routes_search_viewports.py` | **54 / 54** |
| `tools/qa/browser_a11y_forms.py` | 10 / 10; axe: earlier 25 of 26 views clean, the one failure (Journal image-credit contrast 3.78:1 from `opacity: .85`) was fixed |
| `tools/qa/browser_journal_axe.py` | **26 / 26**: landing + 12 articles × Day/Night: 0 axe WCAG 2.0–2.2 A/AA violations, no horizontal overflow, no broken images |

## Matrix
| Area | Status | Evidence / limits |
|---|---|---|
| Footer: exactly one logo | PASS | 1 visible logo at 1440 / 820 / 390 × Day / Night; all footer text verified unchanged |
| Footer: production build | PASS | |
| Desktop header: required links in order, no EXPLORE TOP | PASS | 1440 and 1280; header fits without overflow |
| Hover dropdowns: no flicker, close on leave | PASS | pointer path parent → panel simulated |
| Projects shortcuts (×6) | PASS | each opens filtered, chip active, cards on screen, URL has category; refresh keeps it; Back leaves it; contextual Return says "Return to Residential" |
| Services shortcuts (×5) | PASS | each lands on its section with the heading clear of the sticky header; pasted URL in a new tab, refresh and same-page smooth scroll + Back all verified |
| Journal shortcuts (×12) | PASS | direct to `/journal/<slug>`, title matches; panel fits viewport at 1280×800 |
| Parent links | PASS | Projects / Services / Journal open their main pages at the top, unfiltered |
| Keyboard (Tab to chevron, Enter, ArrowDown ×n, Esc, Enter on item) | PASS | focus restored to chevron on Esc |
| Touch alternative | PARTIAL | the chevron opens the panel via click; no real touch device or touch events |
| Mobile/tablet EXPLORE TOP | PASS | only 9 destinations; Projects / Services / Journal open directly at 390 and 820; search opens an exact destination |
| Day / Night | PASS | dropdowns and Journal reviewed in both themes; axe both themes |
| Journal: 12 stories, unique slugs, 4 layouts, 3–5 images each, no repeats, no legacy image ids, exact project titles, no buzzwords / labels | PASS | `tests/journal.test.mjs` |
| Journal: all 12 articles + landing render | PASS | route sweeps + axe; visual review of 4 layouts (desktop) and the mobile header |
| Journal: reads as human editorial writing | UNVERIFIED | subjective; needs editorial review |
| Journal: body length | PARTIAL | 600–700 words, under the 700–1,000 guide |
| Image audit | PARTIAL | see IMAGE_AUDIT_REPORT.md: all 210 project images were not individually viewed |
| Real photography | **BLOCKED** | none in source; none could be obtained or licensed |
| Homepage "Be welcomed at the studio" visual | PASS (replaced) | reviewed; slogan text untouched; interior is a project visualization, not a photograph |
| Browsers / devices / screen reader / TV remote | UNVERIFIED | Chromium only, as in round 1 |

## Defects found and fixed in round 2
1. Footer: both logos visible in Day (CSS override).
2. Journal landing opened scrolled ~1,300 px down (category bar `scrollIntoView`).
3. Journal/banner images letterboxed (image component "contain" mode) on mobile and in classic headers.
4. Journal image credits failed contrast (opacity).
5. Two Journal project names did not match the records (caught by the new title test).
6. Test-harness issues (mocked clock vs rAF, intro splash focus, selectors hitting hidden dropdown links) fixed in `tools/qa/`.
