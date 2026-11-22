# FINAL COLOUR REFERENCE — TOP Architects + Partners
Single source: `src/styles/tokens.css`. Day = `:root`, Night = `:root[data-theme='night']`. Do not add hard-coded brand colours in components; use tokens.

## 1. Official palettes
**Day:** Warm Ivory `#F3F0E8` · Royal Architectural Blue `#304D78` · Original Logo Gold `#BA8E34` · Charcoal `#292723` · Soft Warm Grey `#D9D5CC` · Secondary text `#5F5E58` · Accessible muted text `#66655E`
**Night:** Midnight Navy `#101722` · Deep Navy `#19283D` · Warm Ivory `#EAE6DC` · Original Logo Gold `#BA8E34` · Soft Warm Grey `#D9D5CC` · Secondary text `#C4C1B8` · Muted text `#B4B1A8`
Gold is never altered or substituted. The earlier brief's `#77766F` remains as `--color-muted-grey` but is **not** used for small text (4.0:1 on ivory).

## 2. Semantic token mapping
| Token | Day | Night |
|---|---|---|
| `--color-background` | #F3F0E8 | #101722 |
| `--color-background-secondary` | #ECE8DE | #19283D |
| `--color-surface` / `-elevated` | #F3F0E8 / #F7F5EF | #19283D / #1F3250 |
| `--color-heading` | #304D78 | #EAE6DC |
| `--color-text-primary` | #292723 | #D9D5CC |
| `--color-text-secondary` | #5F5E58 | #C4C1B8 |
| `--color-text-muted` | #66655E | #B4B1A8 |
| `--color-accent-text` (eyebrows, links, labels) | #304D78 | #BA8E34 |
| `--color-border` / `--color-divider` | #D9D5CC | rgba(217,213,204,.20/.16) |
| `--color-input-bg` / `-border` | #F7F5EF / #BFBAB0 | #19283D / rgba(217,213,204,.34) |
| `--color-error` | #9B2C2C | #F0A8A0 |
| `--color-footer` / `--color-header` | #ECE8DE / ivory 94% | #0C121B / navy 92% |

## 3. Buttons
| State | Day | Night |
|---|---|---|
| Primary | bg #304D78, text #F3F0E8 | bg #BA8E34, text #101722 |
| Hover | #243B5C | #A67E2B |
| Active | #1B2E49 | #8F6B22 |
| Disabled | bg #D9D5CC, muted text | bg #2B3B55, muted text |
| Secondary | transparent, Royal Blue text/border; fills with the primary on hover | transparent, #EAE6DC text; fills gold on hover |

## 4. Active navigation and focus
- **Active-navigation indicator** `--color-nav-indicator`: Day `#304D78` (7.50:1 on ivory), Night `#BA8E34` (6.00:1 on navy). Plus `aria-current="page"`, weight 600, heading-ink text, 2px rule (hover = 1px).
- **Focus ring** `--color-focus`: Day `#304D78` (7.50:1), Night `#D2A548` (6.53:1 on Deep Navy), 2px, offset 3–4px.
- Gold `#BA8E34` remains the decorative architectural line colour (section rules, return-link line, group dividers) in both themes.

## 5. Contrast ratios (computed, WCAG 2.x)
| Pair | Ratio |
|---|---|
| Royal Blue on Warm Ivory | 7.50 |
| Charcoal on Warm Ivory | 13.09 |
| #5F5E58 on Warm Ivory | 5.71 |
| #66655E on Ivory / on #ECE8DE | 5.14 / 4.78 |
| Ivory on Royal Blue (button) | 7.50 · hover #243B5C 9.94 |
| #EAE6DC / #D9D5CC on Midnight Navy | 14.43 / 12.28 |
| #D9D5CC on Deep Navy | 10.15 |
| #B4B1A8 on Midnight / Deep Navy | 8.39 / 6.94 |
| Gold on Midnight / Deep Navy | 6.00 / 4.96 |
| Midnight Navy on Gold (button) | 6.00 · hover #A67E2B 4.83 |
| Error #9B2C2C on ivory · #F0A8A0 on Midnight / Deep Navy | 6.61 · 9.26 / 7.66 |
| **Gold on Warm Ivory** | **2.63 — never used for text or as the sole indicator on ivory** |
An automated axe-core WCAG 2.0–2.2 A/AA scan measured the rendered pages (see FINAL_TEST_REPORT.md); it found and drove the fix of one night-time contrast failure (chip counts on gold).

## 6. Special dark / image surfaces
Hero, hero2, banners, `.section--dark`, process finale, project lightbox, marquee cards, dark studio heads re-scope `--accent-text` (gold), `--heading` (#EAE6DC) and the button tokens (gold / navy) to the Night values in both themes. Text over photographs uses white/ivory on navy-tinted scrims (colours of the photographs themselves are untouched). Error colour in the Reception composer (salmon) and all 3D scene materials/lighting are intentionally unchanged.
