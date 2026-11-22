# Reception Asset Audit

Source: `latest_model.zip` (a standalone vanilla-JS three.js reception demo, three r170 vendored). It contained **no website pages**; only the reception was reused.

## Assets found and reused
| Asset | Size | Use |
|---|---|---|
| `drex__human_3d_character.glb` — rigged receptionist | 1.77 MB | Used unchanged (scaled/seated in code). `public/models/` |
| `reception_desk.glb` — desk/alcove | 1.65 MB | Used unchanged; one emissive-only material (`Material.003`) is given a bronze base colour in code (original behaviour kept). |
| `top-logo.png` (1667×944) + `pieces.json` + 13 piece PNGs | 0.4 MB + pieces | Logo assembled on the reception wall; `top-logo.png` also used for the loader. A trimmed copy is used in the website header/footer. |

No separate animation clips were relied on: the character's motion is **procedural** (see below). Textures are embedded in the GLBs.

## Code reused (in `src/reception/`)
`config.js` (scene/camera/tracking constants), `environment.js` (room, lights, chair, logo plaque), `character.js` (rig discovery, seated pose, materials), `headTracker.js` (head/neck/eye gaze), `bodyMotion.js` (breathing, typing, gesture and arm motion), `input.js` (pointer/touch/gamepad look input), `decor.js` (desk props, monitor), `story.js` (dialogue state machine: working → noticing → greeting → choices → acknowledging → navigating).

## What changed in this revision
- **Raised-hand gesture removed.** Source: `POSES.gesture` in `bodyMotion.js` (right wrist at y = 1.1 m, `air: true`), requested by `story.js` during GREETING and EXPLAINING. The pose is deleted and never requested; hands only use desk poses (`rest`, `spread`, `rightOnly`, `leftOnly`, and `typing`/`mouse` while "working"). Measured while greeting and explaining: wrist height stays 0.969–0.970 m (desk level), poses seen: `rest`, `typing`.
- **Speaking** now adds only small, slow head movement (`talk`/`speakKick` in `bodyMotion.js`); breathing, posture sway, head tilts/nods, gaze and eye movement continue.
- **Speech/navigation rewritten** (`src/lib/speech.js`, `story.js`): real completion events, tokens for stale callbacks, single navigation, Skip Introduction, Repeat Greeting (replays the same line, no overlap), Back only while a selection is pending. The Sound toggle was removed; sound is on by default.
- **Seven destinations** in a compact numbered list beside the subtitles (never forced behind the greeting); mobile: two-column grid at the bottom.
- **Day/night**: scene lights, exposure, environment and background follow the site theme and fade smoothly.
- **Dialogue**: structured pools (9 first-visit, 35 introductions, 35 return lines across the seven pages, plus generic/all-visited/again/back pools), rotation without consecutive repeats, context from the page just left.

## Limitations (model-defined)
- The character GLB has **no morph targets, no jaw/eyelid bones and no animation clips**: real lip-sync and blinking are not possible without replacing or re-rigging the model. Speech is paired with subtle head motion instead; this is a documented limitation, not a bug.
- Voice is the browser's speech synthesis (quality varies by browser/OS); there are no recorded audio files.
- Motion is procedural; the receptionist is male (model-defined).
- Original `start.js`/HUD bootstrap replaced by `startReception()` returning `dispose()`; asset URLs made absolute; three.js and reception code load only on `/reception` (~783 kB chunk).
- No 3D city or other 3D environment exists in this project.

## Responsive framing revision
- Old behaviour: fixed pixel "reserves" for the UI and a fixed minimum visible width, which cropped or shrank the logo on phones.
- New: `framing.js` (see README) fits logo + receptionist to the real free area; the UI is restructured so it can never overlap the scene; the logo is slightly larger and higher. Logo artwork, colours and proportions are untouched (same pieces, same animation; `userData.finish()` was added only so tests/previews can show the completed logo).
- `window.__reception` (debug handle: camera, state, `layout()`) is exposed for the QA scripts.
