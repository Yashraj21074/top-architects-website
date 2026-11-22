> **Superseded** by the FINAL_* reports in this archive (kept for history; some statements there were corrected, see FINAL_IMPLEMENTATION_REPORT.md §1).

# THEME COLOUR REFERENCE — TOP Architects + Partners

All values live in **`src/styles/tokens.css`** (single source of truth). Day is the `:root` default; Night overrides under `:root[data-theme='night']`.

## 1. Official brand colours (unchanged)
| Name | HEX | Token |
|---|---|---|
| Royal Architectural Blue | #304D78 | `--color-brand-blue` |
| Original Logo Gold | #BA8E34 | `--color-brand-gold` |
| Warm Ivory | #F3F0E8 | `--color-warm-ivory` |
| Midnight Navy | #101722 | `--color-midnight-navy` |
| Deep Navy | #19283D | `--color-deep-navy` |
| Charcoal | #292723 | `--color-charcoal` |
| Soft Warm Grey | #D9D5CC | `--color-warm-grey` |
| Muted Secondary Text | #77766F | `--color-muted-grey` (see note on Day muted text) |
| Night Heading Ivory | #EAE6DC | `--color-night-ivory` |

## 2. Semantic tokens
| Token | Day | Night |
|---|---|---|
| `--color-background` | #F3F0E8 | #101722 |
| `--color-background-secondary` | #ECE8DE | #19283D |
| `--color-background-tertiary` | #D9D5CC | #223552 |
| `--color-surface` / `-elevated` | #F3F0E8 / #F7F5EF | #19283D / #1F3250 |
| `--color-heading` | #304D78 | #EAE6DC |
| `--color-text-primary` | #292723 | #D9D5CC |
| `--color-text-secondary` | #5F5E58 | #C4C1B8 |
| `--color-text-muted` | #66655E | #B4B1A8 |
| `--color-accent-text` | #304D78 | #BA8E34 |
| `--color-border` / `--color-divider` | #D9D5CC | rgba(217,213,204,.20 / .16) |
| `--color-input-bg` / `-border` | #F7F5EF / #BFBAB0 | #19283D / rgba(217,213,204,.34) |
| `--color-button-primary` (+ `-text`) | #304D78 (#F3F0E8) | #BA8E34 (#101722) |
| `--color-button-hover` / `-active` | #243B5C / #1B2E49 | #A67E2B / #8F6B22 |
| `--color-button-disabled` | #D9D5CC | #2B3B55 |
| `--color-active` (current page / selected) | #BA8E34 | #BA8E34 |
| `--color-focus` | #304D78 | #D2A548 |
| `--color-header` / `--color-footer` | rgba(243,240,232,.94) / #ECE8DE | rgba(16,23,34,.92) / #0C121B |

Motion tokens: `--t-color` (.7s), `--t-hover` (.35s), `--t-ui` (.2s); all collapse under the existing `prefers-reduced-motion` rule in `base.css`.

**Legacy aliases kept** so no existing component breaks: `--ivory --limestone --stone --ink --bg --fg --muted --line --elev --bronze --bronze-l --charcoal`. `--bronze` now equals Original Gold in both themes (it was a darker bronze in Day).

## 3. Always-dark surfaces
Hero, hero2, banners, `.section--dark`, process finale (`.pfin`), project lightbox, marquee cards, dark studio heads and the Reception overlay re-scope `--accent-text`, `--heading` and the button tokens to the Night values (gold buttons / ivory headings), so they read correctly in both themes.

## 4. Component application
- **Headings H1–H4:** `--color-heading`. **Body:** `--color-text-primary`.
- **Primary button / `.btn--solid` / active chips / Back bar:** `--btn-*` tokens. **Secondary `.btn`:** transparent, `--btn-sec-fg` text, fills on hover.
- **Nav:** active/hover underline in Original Gold; hover text in `--accent-text`.
- **Eyebrows, footer headings, link labels:** `--accent-text`. Gold *lines, fills and outlines* use `--color-brand-gold` directly.
- **Cards / panels:** `--color-surface`, `--color-border`.

## 5. Accessibility notes (computed WCAG 2.x ratios)
| Pair | Ratio | |
|---|---|---|
| Royal Blue on Warm Ivory (headings, eyebrows) | 7.50 | AAA |
| Charcoal on Warm Ivory (body) | 13.09 | AAA |
| #5F5E58 on Warm Ivory (secondary) | 5.71 | AA |
| #66655E on Ivory / on #ECE8DE (muted) | 5.14 / 4.78 | AA |
| Ivory on Royal Blue (primary button) | 7.50 | AAA |
| #EAE6DC / #D9D5CC on Midnight Navy | 14.43 / 12.28 | AAA |
| #D9D5CC on Deep Navy | 10.15 | AAA |
| #B4B1A8 on Midnight / Deep Navy (muted) | 8.39 / 6.94 | AAA / AA |
| Gold on Midnight Navy / Deep Navy (links, eyebrows) | 6.00 / 4.96 | AA |
| Midnight Navy on Gold (Night primary button) | 6.00 | AA |
| Night focus #D2A548 on Deep Navy | 6.53 | AA |
| **Gold #BA8E34 on Warm Ivory** | **2.63** | **fails text AA and the 3:1 non-text threshold** |

Decisions that follow from this:
1. **Day muted text:** the specified #77766F is only 4.00:1 on Warm Ivory, so small muted text uses #66655E (same hue, darker). #77766F remains defined as `--color-muted-grey`.
2. **Gold text in Day:** gold is too light for text on ivory, so Day text accents use Royal Blue; gold is kept for lines, fills and buttons, as the brief allows.
3. **Gold current-page underline in Day** is 2.63:1 against ivory. It is the specified brand treatment so it is kept, but it is a decorative reinforcement, not the only cue: the active link also carries `aria-current="page"`.
4. Night hover gold (#A67E2B) with navy text is 4.83:1 — AA for normal text.

## 6. Colours intentionally left unchanged
- White/ivory text and black gradient **scrims over photographs** (readability on image content; scrim tints moved from warm-black to navy).
- Error text colours in the Reception composer (#EFC3A8 / #E8B9A0): functional error state on a dark panel. Not a brand accent; flagged for a decision.
- 3D scene materials and lighting in `src/reception/decor.js` / `character.js`.
- Photography and the logo assets.
