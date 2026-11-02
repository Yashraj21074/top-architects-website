# TOP Architects + Partners — Implementation Report

**Package:** TOP-Architects-Partners-7-cinematic-upgraded
**Implementation date:** 31 October 2026

## Summary

The TOP Architects + Partners site has been upgraded using the Bespoke Architecture Studio reference as a motion and presentation guide, while retaining TOP's brand colors, project records, 3D reception and voice experience. The final package includes the implementation, its local image assets and the detailed technical reference report in `BESPOKE_DESIGN_REFERENCE.md`.

## Homepage motion audit and selected technique

The homepage source is the supplied static building image (`public/img/hero/original-supplied-hero.jpeg`, 1414 × 1600 px) with responsive WebP versions at 560, 900, 1100 and 1400 px. `STUDIO.heroVideo` is `null`; no video assets or building 3D model are present. The two GLB models in the project are the reception desk and receptionist character. Three.js is used by the separate reception scene, not the homepage, and GSAP is not installed. The existing `HeroMedia` component retains its optional video path, but the current homepage uses the static-image path.

The selected technique is a CSS transform on the existing full-bleed image layer. It gently moves from the original scale to a maximum 1.06 desktop scale, then reverses; the CSS alternate animation uses an 8-second leg in each direction, for a seamless 16-second complete cycle with ease-in/ease-out at both endpoints. Tablet and mobile reduce the maximum scale to 1.045 and 1.03, respectively, with smaller 2D camera drift. This is an image-based camera push-and-pull, not genuine video or a 3D camera dolly. A single flat image has no reliable depth information, so no artificial depth parallax is added; this avoids bending the building's structural curves or glazing. No new animation dependency or replacement image is introduced, and `prefers-reduced-motion` keeps the image static.

## What changed

- **Projects archive:** Replaced the static image grid with a continuously moving, curved architectural-image marquee. It supports pointer dragging with inertia, keyboard controls, hover/focus pause, and reduced-motion-aware autoplay. Project titles and categories remain legible along the curve.
- **Project imagery:** Added 15 category-matched architectural concept renders and retained the site's clear disclosure that they are illustrative design explorations, not photographs of completed or commissioned TOP projects.
- **Project details:** Added a native image lightbox with previous/next navigation and Escape-to-close.
- **Homepage hero:** Kept the supplied building image as one full-bleed background with a subtle forward-and-reverse camera move and the existing legibility treatment. The design statement remains the semantic H1 with the studio description and project/studio links. The large TOP logo is no longer repeated over the hero; a compact brand mark remains in the navigation header.
- **Opening logo intro:** Shows the original theme-specific TOP logo once on the first page of a browser session, with a restrained rise/scale/focus reveal, then fades into the requested page. The intro can be skipped, does not replay during internal navigation, and is omitted for reduced-motion preferences. The brand artwork and its navy/gold colors are unchanged.
- **Services and copy:** Replaced soft service crops with sharper local responsive renders. Updated visitor-facing terminology to TOP-branded “Design explorations” while retaining the disclosure that renders are illustrative.

## Preserved

The existing TOP project details, responsive site navigation, 3D reception scene, receptionist conversation and browser speech functionality remain in the project. The reception and speech implementation was not redesigned as part of the homepage logo refinement.

## Validation

- `npm test`: **49 tests passed**.
- `npm run build`: **passed**. Vite reports the existing large Three.js/reception chunk advisory.
- `npm run lint`: **0 errors**; 6 warnings remain in existing reception modules (`bodyMotion.js`, `character.js`, and `decor.js`).
- Chromium browser checks passed at desktop (1440×960), laptop (1024×768), tablet (768×1024) and mobile (390×844). The homepage and relevant 1400 px / 900 px WebP hero assets returned HTTP 200; no page errors were reported. Visual snapshots were reviewed for building detail, crop, headline, CTA and navigation preservation.
- Computed CSS animation samples at 0, 4, 8, 12, 16, 24 and 32 seconds confirmed forward movement, reverse movement and repeat: scale progresses 1.00 → 1.03 → 1.06 → 1.03 → 1.00. The 8-second forward/reverse boundary values match, and opacity/background image remain constant at sampled points.
- Reduced-motion emulation confirmed the animation is disabled, the static image remains, and the opening intro is skipped. The image-only transform has no video frame-capture path; no physical-device frame-rate benchmark or cross-browser matrix was performed.
- The README's test instructions now point to the current `npm test` suite. The older standalone `tools/qa/dialogue.test.mjs` references a removed content module and is not the supported test command.

## Files modified for this homepage-motion update

- `src/styles/pages.css` — responsive 16-second push–pull animation and reduced-motion fallback.
- `src/components/HeroMedia.jsx` — comment clarifying the still-image background and preserving optional video behavior; runtime behavior is unchanged.
- `README.md` — updated motion settings and technique.
- `docs/IMPLEMENTATION_REPORT.md` — audit findings and actual validation results.

## Key implementation files

- `src/components/ProjectMarquee.jsx` — curved project marquee and interaction behavior.
- `src/components/IntroSplash.jsx` and `src/styles/intro-splash.css` — opening logo reveal and transition.
- `src/pages/Home.jsx` and `src/styles/pages.css` — full-bleed homepage hero, motion and text hierarchy.
- `src/styles/studio.css` — TOP branding and component styles.
- `docs/BESPOKE_DESIGN_REFERENCE.md` — detailed analysis of the reference site and TOP implementation choices.
