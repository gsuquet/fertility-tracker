# Design system

This page gives the CSS layers, the design tokens, the brand, the fonts and the contrast rules. For the reasons, read [ADR 0002](../records/adrs/0002-css-maintainability-design-system.md) and [ADR 0005](../records/adrs/0005-accessibility-level.md).

## CSS layers

**Source file:** [src/styles/index.css](../../src/styles/index.css)

The layer order is:

```css
@layer tokens, base, primitives, views, utilities;
```

| Folder        | Files                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens/`     | `tokens.css`: fonts, brand colors, light and dark themes, each with its `color-scheme`, radii, shadows, stamp, accent and feedback colors. `spacing.css`: spacing and z-index scales. `animations.css`: keyframes. |
| `base/`       | `reset.css`: box sizing, resets, font smoothing and touch behavior. `layout.css`: application frame, phone navigation space, safe areas and focus outlines.                                                        |
| `primitives/` | `buttons.css`, `forms.css`, `badges.css`, `dialogs.css` (dialogs, confirmation and drawer), `menu.css` (the ⋮ menu of `MenuButton`) and `toast.css` (undo message).                                                |
| `views/`      | `header.css`, `cycle-picker.css`, `mobile-nav.css`, `today.css`, `observation-form.css`, `chart.css`, `calendar.css`, `analytics.css`, `drawer.css`, `modals.css`, `settings.css`, `footer.css` and `print.css`.   |
| `utilities/`  | `utilities.css`: layout and text helpers, for example `.flex-center` and `.sr-only`.                                                                                                                               |

The `.modal-dialog` rule in `primitives/dialogs.css` removes the browser styles of the native `<dialog>`: margin, border, padding, size limits and `::backdrop`.

## Scales

| Scale   | Values                                                                                                                                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control | `--control-size-sm` 32px: the other controls, for example the footer links. `--control-size-md` 36px: the ⋮ button. `--control-size-lg` 44px: the minimum size of a control used each day. `--row-height` 48px: a form row and a chip               |
| Spacing | `--space-2xs` 2px, `--space-xs` 4px, `--space-sm` 8px, `--space-md` 16px, `--space-lg` 24px, `--space-xl` 32px, `--space-2xl` 48px, `--space-3xl` 64px                                                                                              |
| Z-index | `--z-base` 1, `--z-raised` 10, `--z-sticky` 100, `--z-header` 200, `--z-mobile-nav` 300, `--z-drawer` 500, `--z-modal-backdrop` 900, `--z-modal` 1000, `--z-popover` 1100, `--z-toast` 1200                                                         |
| Type    | `--font-size-4xs` 9px, `--font-size-3xs` 10px, `--font-size-2xs` 11px, `--font-size-xs` 12px, `--font-size-sm` 13px, `--font-size-md` 14px, `--font-size-base` 16px, `--font-size-lg` 18px, `--font-size-xl` 22px, `--font-size-2xl` 28px, in `rem` |
| Radius  | `--radius-2xs` 4px, `--radius-xs` 6px, `--radius-sm` 10px, `--radius-md` 14px, `--radius-lg` 18px, `--radius-xl` 24px, `--radius-full`                                                                                                              |

## Themes

**Source file:** [src/context/ThemeContext.tsx](../../src/context/ThemeContext.tsx)

- `ThemeContext` sets `data-theme` on the `html` element. The first theme comes from `localStorage`, else from `prefers-color-scheme`.

## Brand

The brand is **Paper and ink**: chart ink on warm paper, like a printed CrMS chart. The stamps are the only strong colors on the screen. The brand hue (navy, about 215°) is far from the red and green hues of the stamps.

| Token                                | Light                | Dark                        | Use                                                                         |
| ------------------------------------ | -------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `--brand-ink`                        | `#1f3a5f`            | `#1f3a5f`                   | Manifest theme color, the `I` mark and its legend key                       |
| `--brand-tile`                       | `#1f3a5f`            | `#2b5080`                   | Tile of the logo                                                            |
| `--brand-leaf`, `--brand-leaf-light` | `#86efac`, `#bbf7d0` | Same                        | Leaves of the logo                                                          |
| `--bg-primary`                       | `#f8f6f1` (paper)    | `#13171d`                   | Page                                                                        |
| `--accent-primary`                   | `#1f3a5f`            | `#a9c1e0`                   | Accent text, icons and borders                                              |
| `--accent-solid`                     | `#1f3a5f`            | `#34659e`                   | Fills behind white text                                                     |
| `--phase-before-peak`                | `#1f3a5f`            | `#8fb3dd`                   | Before Peak Day on the phase bars, with `--phase-before-peak-text`          |
| `--calendar-cycle-tint`              | `#e6ecf4`            | `rgba(169, 193, 224, 0.08)` | The days of the selected cycle in the calendar. The marks keep 4.5:1 on it. |

- The logo is a sprout on an ink tile. [BrandMark.tsx](../../src/components/icons/BrandMark.tsx) draws it in the header. The `fill` attributes have the light colors. The classes in `header.css` give the colors of each theme. [public/icons/logo.svg](../../public/icons/logo.svg) is the same drawing for the favicon. The task `mise run icons` draws the PNG icons from this file.
- [BabyIcon.tsx](../../src/components/icons/BabyIcon.tsx) is the only drawing of the baby of the white and light green stamps: a round head with a curl and a swaddled body. The stamps, the chart legend and the print legend use it. The CSS sets its size: 18 pixels in a stamp, 12 pixels in the chart legend and 10 pixels in the print legend.

## Fonts

- All the text uses the font of the operating system: SF Pro on Apple devices, Roboto on Android and Segoe UI on Windows. Thus, the application looks like the other applications of the device.
- `--font-family` has this stack: `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `'Helvetica Neue'`, `Arial`, `sans-serif`.
- The wordmark and the `h1`, `h2` and `h3` headings use `--font-display`, which is `var(--font-family)`. The size and the weight of the type scale make the difference between headings and text. Print keeps its own font, also for headings.
- The application has no font file and no `@font-face` rule. No font or stylesheet comes from another host, such as Google Fonts.

## Token rules

- Each custom property that a style or a component uses has a definition in `src/styles/tokens/`.
- Only `src/styles/tokens/` and `views/print.css` contain color values, such as `#1f3a5f`, `rgba()` or `white`. The other style files use tokens. Print has its own colors for paper.
- Outside `views/print.css`, each `font-size` is a type scale token (`--font-size-*`), or `100%` in `reset.css`. Each `border-radius` is a radius token, `0` or `50%`. Print uses `pt` sizes.
- A token has the values of both themes. Thus, a view has no `[data-theme='dark']` rule.
- The test `src/styles/__tests__/tokenUsage.test.ts` checks these rules.

## Text contrast

Each text token has a contrast of 4.5:1 or more on its surfaces, in both themes (WCAG 2 AA). The test `src/styles/__tests__/tokenContrast.test.ts` calculates these ratios from `tokens.css`.

| Text color                                                               | Surface or use                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-primary` | `--bg-primary`, `--bg-surface`, `--bg-surface-elevated` and `--bg-hero` (the status card of the phone)                                                                                                                        |
| `--color-intercourse-text`, `--color-peak-text`, `--color-danger-text`   | The same surfaces: the intercourse text of the chart, the Peak Day of the cycle line and the purple icon of the welcome guide. `--color-danger-text` is the red text of a destructive action, for example **Delete all data** |
| `--accent-primary`                                                       | Also `--accent-light`                                                                                                                                                                                                         |
| White                                                                    | `--accent-solid` and `--accent-solid-hover`, for example `.btn-primary`                                                                                                                                                       |
| White                                                                    | `--color-danger` and `--color-danger-hover` (`.btn-danger`)                                                                                                                                                                   |
| White                                                                    | `--color-intercourse` and `--color-peak`, `--color-success-solid` (`.today-toast`)                                                                                                                                            |
| `--color-info-text`                                                      | `--color-info-surface`: the badge of the welcome guide                                                                                                                                                                        |
| `--color-cycle-start-text`                                               | `--color-cycle-start-surface`: the active cycle start button                                                                                                                                                                  |
| `--color-warning-text`                                                   | `--color-warning-surface`: the symptom tag of the chart                                                                                                                                                                       |
| `--stamp-yellow-text`                                                    | `--color-warning`: the `P` key of the chart legend                                                                                                                                                                            |
| `--stamp-light-green-text`, white                                        | `--stamp-light-green`; `--stamp-red` and `--stamp-dark-green`                                                                                                                                                                 |

The edge of a stamp has a contrast of 3:1 or more (WCAG 2 SC 1.4.11), in both themes. `--stamp-white-border` reaches 3:1 on `--stamp-white`, `--bg-surface` and `--bg-primary`. `--stamp-light-green-border` reaches 3:1 on `--bg-surface` and `--bg-primary`. `--stamp-empty`, the dashed edge of the empty stamp of a day with no code, reaches 3:1 on `--bg-surface` and `--bg-primary`. The three edges also reach 3:1 on `--bg-hero`.

- A rule with white text on an accent color uses `--accent-solid`, not `--accent-primary`.
- The footer and the empty days of the chart have no opacity. Thus, their text keeps the contrast of its token. Empty days have a dashed border.

## Related documents

- [ADR 0002: CSS in cascade layers with a shared design system](../records/adrs/0002-css-maintainability-design-system.md)
- [Project structure](project-structure.md)
