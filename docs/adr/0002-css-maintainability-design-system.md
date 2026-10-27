# ADR 0002: CSS in cascade layers with a shared design system

- **Date:** 2026-08-31
- **Status:** Accepted and implemented. The planned file `primitives/cards.css` was not made.

## Context

All the styles of the application were in one file, `src/styles/index.css`, with more than 4,840 lines. The file had the tokens, the resets, the layout, the styles of more than 15 components, the dialogs, the print styles and the media queries. It had no cascade layers.

This caused four problems:

1. **Hard to find a style.** A change to one component, for example `ChartRow`, needed a search through thousands of lines.
2. **Duplicate patterns.** Buttons, cards, badges, dialogs and form fields had different definitions in different parts of the file, with small differences.
3. **Specificity conflicts.** An override needed a more specific selector or a different position in the file. This caused regressions.
4. **Risk of side effects.** A new feature or theme can change unrelated pages.

## Options

### Option A: Modular CSS files in cascade layers (selected)

Put the styles in small files under `src/styles/`. Put each file in a native CSS `@layer`: `tokens`, `base`, `primitives`, `views` or `utilities`. Vite joins the files through `@import`.

```text
src/styles/
  ├── index.css      # Layer order and imports
  ├── tokens/        # Colors, spacing, shadows, themes, stamp colors
  ├── base/          # Reset and page layout
  ├── primitives/    # Shared classes: .btn, .badge, .modal, form fields
  ├── views/         # Styles of each page: today, chart, calendar, analytics, print
  └── utilities/     # Small helper classes: .flex-center, .sr-only
```

| Advantages                                                                   | Disadvantages                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| A later layer always wins over an earlier layer, whatever the selector.      | All classes are global. Names must follow one convention. |
| Standard CSS. No library, no build plugin and no runtime code.               |                                                           |
| The class names stay the same. The tests that use class names do not change. |                                                           |
| Shared patterns become shared classes, for example `.btn` and `.badge-pill`. |                                                           |

### Option B: CSS Modules next to each component

Move the styles of each component to a `[Component].module.css` file. Keep the tokens global.

| Advantages                                        | Disadvantages                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| Local class names cannot collide.                 | Each component import and each `className` must change.                     |
| A component and its styles are in the same place. | The tests that use class names must change.                                 |
|                                                   | Shared patterns need a library of React components, for example `<Button>`. |

### Option C: Tailwind CSS v4

Replace the classes with Tailwind utility classes in all components.

| Advantages                                   | Disadvantages                                                     |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Standard scales for spacing, text and color. | All the components need a full rewrite.                           |
| Fast composition of new screens.             | It adds build dependencies and long class lists in complex views. |
|                                              | The tests must change.                                            |

### Option D: Typed CSS in TypeScript (Vanilla Extract or StyleX)

Write the styles in `.css.ts` files that compile to static CSS.

| Advantages                         | Disadvantages                                                |
| ---------------------------------- | ------------------------------------------------------------ |
| Type checks for tokens and themes. | It needs a Vite plugin and a compiler step.                  |
|                                    | The migration is large and too complex for this application. |

## Comparison

| Criterion              | A: Layers (selected) | B: CSS Modules | C: Tailwind | D: Typed CSS |
| ---------------------- | -------------------- | -------------- | ----------- | ------------ |
| Organization           | Very good            | Very good      | Good        | Good         |
| No extra tools         | Very good            | Very good      | Medium      | Medium       |
| Tests stay the same    | Very good            | Poor           | Poor        | Poor         |
| Shared design system   | Very good            | Medium         | Very good   | Good         |
| Control of the cascade | Very good            | Good           | Good        | Good         |
| Migration risk         | Low                  | High           | Very high   | Very high    |

## Decision

The project uses option A.

1. The layer order is:

   ```css
   @layer tokens, base, primitives, views, utilities;
   ```

2. The folders have these files:
   - `tokens/`: `tokens.css` (colors, radii, shadows, stamp colors, light and dark themes), `spacing.css` (spacing and z-index scales) and `animations.css` (keyframes).
   - `base/`: `reset.css` (box sizing, resets, focus outline) and `layout.css` (application frame and page padding).
   - `primitives/`: `buttons.css`, `forms.css`, `badges.css` and `dialogs.css`.
   - `views/`: one file for each page or dialog, for example `today.css`, `chart.css`, `calendar.css`, `analytics.css`, `drawer.css`, `modals.css` and `print.css`.
   - `utilities/`: `utilities.css` (layout and text helpers).
3. `src/styles/index.css` declares the layer order and imports each file in sequence.

## Consequences

### Advantages

- Small files with one purpose each, of less than about 300 lines, replace one file of 4,800 lines.
- Buttons, badges, form fields and dialogs use the same classes on all pages.
- The cascade is predictable without very specific selectors.
- The class names and the DOM stay the same. All tests pass without changes.
- Vite reloads a changed file fast and minifies the result.

### Disadvantages

- Contributors must put new styles in the correct folder and layer.

## Related documents

- [Architecture](../explanation/architecture.md)
