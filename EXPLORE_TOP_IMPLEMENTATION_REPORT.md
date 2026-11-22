# EXPLORE TOP — Implementation Report

> **Updated in round 2.** The initial overlay panel now lists **only the nine main destinations** (plus search, the "You are here" trail and Enter 3D Reception); the category / service / project / article lists described below were removed per the newer brief. Those destinations are reached through desktop hover shortcuts (≥1241px), on their own pages, or through search, which still opens the exact destination directly. Desktop direct links + hover shortcuts are documented in FINAL_IMPLEMENTATION_REPORT.md §R2.2.

## Removed legacy menu
`Header.jsx` no longer contains a "Menu" button or `MobileMenu`; `.mnav*` and `.nav-toggle` CSS were deleted; `tests/theme-source.test.mjs` fails if they return. One navigation system exists per breakpoint.

## Behaviour by device
| Viewport | Header |
|---|---|
| ≥1241px (1440, 1280) | Logo, direct links, Enter 3D Reception. No overlay needed. |
| ≤1240px (1024, 820, 390, 360) | Logo + **Explore TOP** control (44px min target). Direct links hidden, so no duplicate navigation. |

The overlay (`src/components/ExploreTop.jsx`, `src/styles/explore.css`) is a portal on `<body>` (the header's `backdrop-filter` otherwise confines fixed children), uses `100dvh`, `env(safe-area-inset-*)`, locks background scroll, scrolls internally, and closes automatically if the viewport grows to desktop or the route changes. Colours are tokens only: ivory / Royal Blue / gold lines by day, Midnight Navy / ivory / gold at night. Motion: a short fade-in, disabled under `prefers-reduced-motion` (tested).

## Content (all from the content modules via `src/lib/siteIndex.js`; nothing hard-coded)
9 pages · 5 services · 4 journal articles · 6 categories (with counts, linking to `/projects?category=…`) · 42 projects grouped by category. Tested: exact counts, and every link resolves to a registered route.

## Search
`src/lib/siteSearch.js` over the same index: partial words, plurals, one-letter typos and swaps ("residental", "ligth"), stop-word removal, and everyday words mapped to site terms (house/home/villa → Residential, office/tower → Commercial, interiors → Interior Design, hotel/resort → Hospitality, school/library → Institutional, park/plaza → Public & Landscape, render → Visualization …). Labelled results (Page / Service / Category / Project / Journal), `role="status"` result count, **Clear** action, elegant no-results state. Tested: every one of the 42 project titles, 4 articles and 5 services returns its own page first; "house" → Residential first; "interiors" → Interior Design; "commercial building" → Commercial.

## Current location
"You are here" trail from the real route: `Home / Projects / Residential / Cantilever House` (category level appears only for projects or a filtered list; services and articles have no invented levels).

## Keyboard / touch
Tab and Shift+Tab are trapped inside the dialog (80 presses each tested), Escape clears a non-empty search first and then closes, focus returns to the trigger, Enter opens the highlighted result, ArrowDown/ArrowUp move from the search box through results (no background scroll), ArrowLeft/Right move between destinations when not typing. Touch: targets ≥44px; on touch devices the search box is not auto-focused so the on-screen keyboard does not cover the list.

## Not built (by instruction)
No Forward button, history panel or Recent-journey list (second brief forbids them). Browser Back/Forward work normally and were tested from the overlay.

## TV remote / directional navigation — **UNVERIFIED**
Arrow-key navigation is implemented and was tested with a keyboard only. No TV browser or remote was available, so TV support is not claimed.
