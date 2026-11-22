# CHANGED FILES (relative to `TOP_NAV_FILTERS_THEMED.zip`)

## Modified (23)
| File | Why |
|---|---|
| `vite.config.js` | Theme hours from `theme.json` and colours from `tokens.css` into one pre-paint script (after the theme-color meta); SEO plugin (JSON-LD, robots, optional sitemap/canonical via `SITE_URL`) |
| `index.html` | Removed my duplicate inline theme script; added Open Graph / Twitter meta |
| `.gitignore` | Ignore `.env*` except `.env.example` |
| `src/lib/theme.js` | Browser UI colour read from tokens on first run too |
| `src/styles/tokens.css` | `--color-nav-indicator`, `--color-error`; muted text value comments |
| `src/styles/components.css` | Removed legacy `.mnav`/`.nav-toggle`; active-nav indicator + non-colour cues; footer token |
| `src/styles/studio.css` | Studio H1 clipping fix; contact form + 404 styles |
| `src/styles/portfolio.css` | Active chip count contrast |
| `src/main.jsx` | Import `explore.css` |
| `src/components/Header.jsx` | Rewritten: desktop links, EXPLORE TOP trigger, no Menu |
| `src/components/ReceptionReturnBar.jsx` | "RETURN TO …" control, category-aware labels |
| `src/components/motion.jsx` | `Words`: aria-label only on headings (invalid ARIA fix) |
| `src/components/ProjectMarquee.jsx` | Accessible name now derives from visible text; unused vars removed |
| `src/components/ProjectCard.jsx` | Location shown where recorded |
| `src/pages/ProjectDetail.jsx` | Category in breadcrumb, viewer/gallery button names, services via `servicesForProject` |
| `src/pages/ServiceDetail.jsx` | Lists all relevant projects (`serviceProjects`) |
| `src/pages/Contact.jsx` | Labels, required markers, inline validation, honest status |
| `src/pages/NotFound.jsx` | Themed 404 with routes home, noindex |
| `src/hooks/useTitle.js` | Title + OG/Twitter + canonical + optional noindex |
| `src/content/projects.js` | Similarity-based `related()` |
| `src/content/services.js` | `serviceProjects()`, `servicesForProject()` |
| `src/reception/story.js` | `_respond()`: AI first for typed/spoken text, fall back to engine |
| `src/reception/engine/conversationManager.js` | `handleAI()`; injectable `askAI` |

## New (16 + screenshots)
`api/reception.js`, `api/_providers.js`, `.env.example`, `vercel.json`, `src/components/ExploreTop.jsx`, `src/styles/explore.css`, `src/lib/siteIndex.js`, `src/lib/siteSearch.js`, `src/lib/knowledgeBase.js`, `src/reception/aiClient.js`, `tests/explore.test.mjs`, `tests/theme-source.test.mjs`, `tests/receptionApi.test.mjs`, `tools/qa/browser_theme_nav_filters.py`, `tools/qa/browser_routes_search_viewports.py`, `tools/qa/browser_a11y_forms.py`; reports (`FINAL_*`, `EXPLORE_TOP_*`, `AI_RECEPTION_*`, `DEPLOYMENT_GUIDE`, `CHANGED_FILES`); `screenshots/` (25 real PNGs).

## Removed
No files removed. Removed *code*: `MobileMenu` and the `.mnav*` / `.nav-toggle` rules (replaced by EXPLORE TOP), and the duplicate inline theme script in `index.html`.

## Preserved
Logo assets, all images, `public/models` (3D character and desk), all content modules except the two additive functions above, the Reception scene/animation/speech code, routing, existing tests (all 56 still pass unchanged).


---

# ROUND 2 (relative to `TOP_ARCHITECTS_PARTNERS_UI_UX_FINAL.zip`)

## Modified (21)
| File | Why |
|---|---|
| `src/components/Header.jsx` | Desktop hover shortcuts (Projects / Services / Journal) with keyboard, touch and no-flicker behaviour; header wording |
| `src/components/ExploreTop.jsx` | Initial panel reduced to the 9 main destinations (+ search, trail) |
| `src/components/Layout.jsx` | Mounts `HashScroll` |
| `src/components/journal.jsx` | No "Illustrative" label / date unless recorded; image credit; category bar no longer scrolls the page |
| `src/content/journal.js` | Now assembles the 12 new stories |
| `src/content/services.js` | Service images replaced; `serviceAnchor` / `serviceHref` |
| `src/pages/Article.jsx` | Four header layouts, credit, studies / service / CTA block, related stories |
| `src/pages/Journal.jsx` | New hero image + caption; old notes section removed |
| `src/pages/Services.jsx` | Stable section ids (`architecture`, `interior-design`, …) |
| `src/pages/Home.jsx`, `Studio.jsx`, `Contact.jsx` | Cartoon images replaced; off-brand colour removed |
| `src/reception/engine/ideas.js`, `kb.js` | Point to the new Journal |
| `src/styles/explore.css` | Dropdown, simplified panel, service-anchor offsets |
| `src/styles/journal.css` | Article header layouts, credit, end block, cover-fit fixes |
| `src/styles/studio.css` | Footer duplicate-logo override removed |
| `tests/explore.test.mjs` | 12 articles |
| `tools/qa/browser_a11y_forms.py`, `browser_routes_search_viewports.py`, `browser_theme_nav_filters.py` | Updated for the new navigation and Journal |

## New (10)
`src/components/HashScroll.jsx` · `src/content/journal/{helpers,index,a01-04,a05-08,a09-12}.js` · `tests/journal.test.mjs` · `tools/qa/browser_dropdown_navigation.py` · `tools/qa/browser_journal_axe.py` · `IMAGE_AUDIT_REPORT.md`; `screenshots/` regenerated from the final build.

## Removed
No files. Removed content: the four old articles and four notes (`content/journal.js`), the Journal "notes" section, the legacy `svc-N` section ids, and the long category/service/project lists in EXPLORE TOP.
