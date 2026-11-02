# TOP Architects + Partners — Website

**Stack:** React 19 + Vite + React Router; the supplied 3D reception runs on three.js r170 (the version it was tuned on). No backend, database or form — content lives in plain data files.

## Run
```bash
npm install            # or: npm ci
npm run dev            # http://localhost:5173
npm run build && npm run preview     # http://localhost:4173
# automated checks (Playwright, Python): tools/qa/  (site_responsive.py, reception_responsive.py, speech.py, flow_mobile.py)
npm run lint
npm test               # current conversation / receptionist unit tests
```
Hosting: any static host with an SPA fallback (serve `index.html` for unknown paths).

## Content status (what is confirmed)
Confirmed and live: practice name, **established 2026**, founder **Ar. Saurabh S Jadhav — Founder & Principal — B.Arch., M.Arch.**, email, two phone numbers (Mumbai/India, London/UK), the Navi Mumbai office address, five services, six-stage process, and the names *Council of Architecture* and *RIBA* (listed under "Professional bodies" by name only — no membership or status is claimed). All in `src/content/studio.js`.
Still needed (nothing is invented; absent items are simply not shown): founder **portrait** (`STUDIO.founder.portrait`, ideally 4:5, 1600 px+), official **philosophy wording**, **social profile URLs / QR codes**, CoA and RIBA **logos** if wanted, real **projects and photography**, and real **journal articles**. The original Services opening collage remains preserved; chapter photographs use clean 2304 × 1536 full-source renders plus responsive 800/1400 px derivatives.

## Scroll experience
`src/lib/scrollEngine.js` is the single passive scroll loop (rAF, IntersectionObserver-gated) that writes one CSS variable (`--p`) per tracked element; all motion is then pure CSS using `transform`, `opacity` and `clip-path` (no layout work while scrolling). Components: `Reveal` (rise / mask / words / line), `Words`, `Parallax`, `Ribbon`, `SpatialDiagram`, page progress hairline, route sweep, desktop-only cursor ring and a barely-there magnetic hero button (`src/components/motion.jsx`). Pinned/scroll-driven stages apply only at ≥ 901 px and with motion enabled; phones, tablets and `prefers-reduced-motion` get a calm vertical sequence with simple reveals. There is no smooth-scroll library: native scrolling is kept for responsiveness.
Services (`src/pages/Services.jsx`, `src/styles/studio.css`): the original supplied collage still opens the page, then 01 Architecture → 02 Interior Design → 03 Planning & Spatial Design (interior → drawing → masterplan → spatial diagram) → 04 Architectural Visualization (framed image expands to full viewport) → 05 Design Consultancy (image → material → detail → decision) → closing call to action. Service photography now uses local 800/1400 px responsive WebP derivatives and full-source 2304 × 1536 WebPs; the planning drawing and original collage remain untouched.

## Contact form
The contact page has a form that **opens the visitor's email app** with a pre-addressed message (`mailto:`); it sends nothing itself and says so. No backend exists.

## Pages (header, footer and reception share one list: `src/content/destinations.js`)
About Us / Studio `/studio` → Projects `/projects` → Services `/services` → Our Process `/process` → Team `/team` → Journal `/journal` → Contact `/contact`, plus the Home page `/` and the 3D reception `/reception` (lazy-loaded; the only 3D experience). Detail pages: `/projects/:slug`, `/services/:slug`, `/journal/:slug`.

## Homepage image
Your supplied image is the hero. The untouched original is kept at `public/img/hero/original-supplied-hero.jpeg`. Web versions (`hero-560/900/1100/1400.webp`, quality 92) differ from it in one way only: a 14 px right and 17 px bottom strip of pure-white scan border was trimmed (1414×1600 → 1400×1583). No other crop, stretch or colour change; the night theme applies a CSS grade at display time.

## Reception layout and camera (responsive)
- The interface never sits on the 3D scene. `#scene-window` (an empty grid cell) is the area the scene may occupy; landscape = control column | scene, portrait = controls, subtitles, **scene**, then a compact 3-column menu (scrolls if the screen is very short).
- `src/reception/framing.js` fits the **complete logo + head + upper body** (and the desk/side context when there is room) into that window by choosing the camera distance; the field of view is fixed, so nothing is stretched. It re-fits on resize, rotation, `visualViewport` changes (mobile browser bars) and when subtitles change height, with smoothing. Safe-area insets and `100dvh` are used.
- The logo plane was enlarged from 0.44 m to 0.54 m high and raised to y = 1.90 m (`CONFIG.logo` in `src/reception/config.js`) so the "ARCHITECTS + PARTNERS" line clears the receptionist's head.

## Back to Reception
Pages opened from the reception show a sticky **← Back to Reception** bar under the header (`src/components/ReceptionReturnBar.jsx`, flag in `src/lib/fromReception.js`, session only). It is cleared when the reception opens or the visitor goes to the homepage; pages opened directly don't show it (the header's *Enter 3D Reception* is always available).

## Day / night theme
Automatic, from the visitor's local time. Hours: `src/config/theme.json` (`dayStartHour` 7, `nightStartHour` 18). A tiny inline script injected by `vite.config.js` sets the theme before first paint (no flash); `src/lib/theme.js` re-checks every 30 s and on tab focus. Tokens: `src/styles/tokens.css`. The reception scene lights/exposure follow the same theme.

## Receptionist speech (how it works)
- `src/lib/speech.js` wraps the browser speech engine. A destination opens **only** after its introduction resolves with `ended` (the engine's real completion event), after **Skip Introduction**, or — if speech is genuinely unavailable/blocked — after the subtitle text has been shown in full. No timers estimate speech length (one start-watchdog detects an engine that never starts).
- Every line carries a token; cancelled, replaced, repeated or skipped lines can never trigger navigation, and navigation fires at most once per selection.
- Sound is on by default (no toggle). The engine is primed by the first deliberate gesture (clicking *Enter 3D Reception*, selecting a destination, or any first interaction).
- Subtitles follow the engine's word-boundary events (display only).
- Dialogue: `src/content/dialogue.js` (data) + `src/reception/conversation.js` (selection + session memory in `sessionStorage`: visited destinations, used line indexes, last page; nothing personal).

## Editing content
`src/content/*.js` (studio/contact/social, projects, services, process, team, journal, images, dialogue). Fields left `null`/empty are simply not shown. The projects are **conceptual design studies** with generated imagery — replace with real work by editing `projects.js` and adding photos to `public/img`.

## Before public launch
Verified email/phone/address/social URLs and QR images (`STUDIO.contact/social`), team profiles (`team.js`), founder (`STUDIO.founder`), real projects and photography, any awards, replace the illustrative journal articles.

See `RECEPTION_ASSET_AUDIT.md` and `WEBSITE_QA_REPORT.md`.


## Projects gallery update
The `/projects` archive retains its existing category filters, conceptual-study disclosure, project records and detail routes. Its project images now move in a curved, continuous strip; visitors can drag with a pointer, use the arrow keys or gallery buttons, and pause/resume autoplay. Autoplay starts paused for `prefers-reduced-motion`; hover and keyboard focus temporarily stop the movement so project links remain easy to activate. Project-detail hero and gallery images open a native modal viewer with previous/next image controls and Escape-to-close. All imagery comes from the existing local project image registry. The reference analysis and TOP-specific implementation decisions are documented in `docs/BESPOKE_DESIGN_REFERENCE.md`.

The carousel expands each existing project's distinct gallery images into separate cards, rather than copying one cover image across the strip. New visuals are photorealistic AI-generated concept renders—not photographs of completed TOP projects—and the site's conceptual-study disclosures remain in place.


## Visual and portfolio-copy refinement (31 October 2026)
The homepage now leads with a short TOP-specific design statement, a clearer studio description and direct **Explore selected work** / **Meet the studio** actions; its supplied hero image and 3D Reception entry remain unchanged. The Projects archive uses TOP-branded **design exploration** language, a visible illustrative-render disclosure and a tighter editorial intro. Carousel cards are wider, with higher-contrast project/category labels counter-positioned so the moving wave cannot hide titles behind the lower curve. Project detail, shared render badges, FAQ and receptionist copy use the same wording while retaining the explicit “not completed or commissioned” distinction. Services chapter photography now uses clean local 800/1400/2400 px WebP variants; the original opening collage and planning drawing are preserved.


**Asset-resolution note:** the image registry labels the full-source filename with a `2400` suffix, while the un-upscaled generated master is 2304 × 1536 px. The 800 px and 1400 px files are responsive downscaled derivatives.


## Homepage hero composition (31 October 2026)
The homepage hero uses the supplied TOP building image as one full-bleed background rather than a text/image split. The full TOP logo appears in the opening animation only; it is not repeated as a large lockup over the hero. A small brand mark remains in the navigation header. The hero carries the Navi Mumbai/established line, design statement, studio description and calls to action. A dark left-to-right and bottom wash supports legibility. The existing still uses a subtle CSS camera push-and-pull: 8 seconds forward and 8 seconds back, with a 1.06 maximum scale on desktop, 1.045 on tablet and 1.03 on mobile. It is not a video; no depth parallax is simulated from the flat image. Reduced-motion preferences disable movement. Responsive 900 px / 1400 px supplied WebP sources are used; the header and lower homepage sections are otherwise preserved.


## First-open logo intro
On the first page load in a browser tab session, a short full-screen introduction reveals the original theme-specific TOP logo with a restrained rise, scale and focus animation, then fades into the requested page. Visitors can skip it with the on-screen control or Escape; it is skipped entirely when reduced motion is requested. Internal SPA navigation does not replay the intro.
