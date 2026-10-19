---
version: alpha
name: Tricker
description: Nuxt UI v4 household bill tracker — neutral Zinc surfaces, white and Zinc text, lime interaction accents only, Plus Jakarta Sans typography, Geist Mono financial figures, and compact hairline containment. Dark-mode Stitch screens must never use green-tinted backgrounds, borders, or general text.
colorMode: dark
colors:
  primary: "#a3e635"
  primary-dark: "#a3e635"
  primary-light: "#84cc16"
  primary-hover: "#84cc16"
  primary-subtle: "rgba(163, 230, 53, 0.10)"
  secondary: "#a78bfa"
  secondary-dark: "#a78bfa"
  secondary-light: "#8b5cf6"
  secondary-hover: "#7c3aed"
  secondary-subtle: "rgba(167, 139, 250, 0.10)"
  background: "#18181b"
  on-background: "#e4e4e7"
  surface: "#18181b"
  surface-dim: "#18181b"
  surface-bright: "#3f3f46"
  surface-container-lowest: "#18181b"
  surface-container-low: "#27272a"
  surface-container: "#27272a"
  surface-container-high: "#27272a"
  surface-container-highest: "#3f3f46"
  surface-variant: "#27272a"
  on-surface: "#e4e4e7"
  on-surface-variant: "#a1a1aa"
  outline: "#3f3f46"
  outline-variant: "#27272a"
  neutral-dark: "#18181b"
  neutral-muted-dark: "#27272a"
  neutral-light: "#ffffff"
  neutral-muted-light: "#fafafa"
  border-dark: "#27272a"
  border-light: "#e4e4e7"
  text-dark: "#ffffff"
  text-dark-muted: "#a1a1aa"
  text-light: "#18181b"
  text-light-muted: "#71717a"
  success: "#4ade80"
  success-subtle: "rgba(74, 222, 128, 0.10)"
  error: "#f87171"
  error-subtle: "rgba(248, 113, 113, 0.10)"
  warning: "#facc15"
  warning-subtle: "rgba(250, 204, 21, 0.10)"
  info: "#60a5fa"
  info-subtle: "rgba(96, 165, 250, 0.10)"
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.025em
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  h4:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: 450
    lineHeight: 1.6
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 450
    lineHeight: 1.5
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 450
    lineHeight: 1.4
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.35
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0.01em
  label-2xs:
    fontFamily: Geist Mono, ui-monospace, monospace
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0.02em
  eyebrow:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.06em
  code-mono:
    fontFamily: Geist Mono, ui-monospace, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  container-max: 1280px
  header-height: 56px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label-md}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.md}"
  button-subtle-lime:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label-md}"
  badge-success:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-warning:
    backgroundColor: "{colors.warning-subtle}"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-error:
    backgroundColor: "{colors.error-subtle}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-info:
    backgroundColor: "{colors.info-subtle}"
    textColor: "{colors.info}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-secondary:
    backgroundColor: "{colors.secondary-subtle}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  table-header:
    backgroundColor: "{colors.neutral-dark}"
    textColor: "{colors.text-dark-muted}"
    typography: "{typography.label-2xs}"
    padding: "8px 12px"
  card-dark:
    backgroundColor: "{colors.neutral-muted-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    typography: "{typography.body-md}"
  card-light:
    backgroundColor: "{colors.neutral-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    typography: "{typography.body-md}"
  card-divider-dark:
    backgroundColor: "{colors.border-dark}"
    height: "1px"
    width: "100%"
  card-divider-light:
    backgroundColor: "{colors.border-light}"
    height: "1px"
    width: "100%"
  input-field-dark:
    backgroundColor: "{colors.neutral-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body-sm}"
  input-field-light:
    backgroundColor: "{colors.neutral-muted-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body-sm}"
  header-bar-dark:
    backgroundColor: "{colors.neutral-dark}"
    textColor: "{colors.text-dark-muted}"
    height: "{spacing.header-height}"
    typography: "{typography.label-md}"
  header-bar-light:
    backgroundColor: "{colors.neutral-light}"
    textColor: "{colors.text-light-muted}"
    height: "{spacing.header-height}"
    typography: "{typography.label-md}"
---

## Overview

High-density financial ergonomics meets developer infrastructure precision. Inspired by the visual identity of OpenRouter (openrouter.ai), Tricker treats household bill tracking not as a casual spreadsheet, but as a dual-ledger financial clearinghouse. The design language is engineered directly on top of `@nuxt/ui` v4's CSS variables theming architecture and Tailwind CSS v4, combining deep neutral canvas foundations, hairline perimeter containment, crisp geometric sans typography, and the canonical Tailwind CSS Lime (`#84cc16` / `#a3e635`) accent as the energetic interactive driver.

The design system operates across two tuned visual atmospheres:

1. **Dark Mode (Signature Developer Console):** Built on dark neutral surfaces (`--ui-bg: var(--ui-color-neutral-900)`, `#18181b`), elevated card surfaces (`--ui-bg-muted: var(--ui-color-neutral-800)`, `#27272a`), hairline border containment (`--ui-border: var(--ui-color-neutral-800)`), and electric Lime 400 (`--ui-primary: var(--ui-color-primary-400)`, `#a3e635`) interactive highlights.
2. **Light Mode (Documentary Precision):** Grounded in clean white surfaces (`--ui-bg: white`, `#ffffff`), subtle neutral card groupings (`--ui-bg-muted: var(--ui-color-neutral-50)`, `#fafafa`), crisp dark text (`--ui-text-highlighted: var(--ui-color-neutral-900)`, `#18181b`), and Lime 500 (`--ui-primary: var(--ui-color-primary-500)`, `#84cc16`) callouts.

Rather than authoring arbitrary hardcoded colors, components strictly consume Nuxt UI semantic utility classes:

- **Surface ramps:** `bg-default` (canvas base) -> `bg-muted` (structural groupings) -> `bg-elevated` (interactive cards and popovers) -> `bg-accented` (active hover states).
- **Text ramps:** `text-highlighted` (headlines and active titles) -> `text-default` (body copy) -> `text-muted` (secondary descriptions) -> `text-dimmed` (timestamps and placeholders).
- **Border ramps:** `border-default` and `ring-default` resolving to 1px hairline boundaries.

## Non-negotiable neutral surfaces

**Nuxt UI is the component library and token authority, not Material Design.** Use `UApp`, `UHeader`, `UContainer`, `UCard`, `UButton`, `UInput`, `USelectMenu`, `UTabs`, `UBadge`, `UTable`, `UModal`, and `UDrawer` patterns. Stitch HTML is a visual reference, not production Vue code.

- Page canvas, header, bottom navigation, cards, drawers, inputs, tables, and inactive controls are **Zinc only**. Their colors must come from `--ui-bg-*` and `--ui-border-*`, independently of the primary color.
- The dark canvas is `#18181b`, grouped/elevated surfaces are `#27272a`, and neutral hover fills or stronger borders are `#3f3f46`. Muted and elevated surfaces intentionally share the same shade in Nuxt UI dark mode; hierarchy also comes from spacing and borders.
- Main text is white or `#e4e4e7`; secondary text is `#a1a1aa`; dimmed metadata is `#71717a`. No pale-green body text or olive-gray labels.
- Lime is limited to primary actions, selected navigation, focus indicators, and small interactive highlights. Tinted fills are allowed only inside compact selected controls or semantic badges, never entire cards, sections, or the page.
- Do not derive a tonal surface palette from lime. In Stitch, use `colorVariant: "NEUTRAL"`, a neutral seed (`customColor: "#71717a"`), `overrideNeutralColor: "#18181b"`, and `overridePrimaryColor: "#a3e635"`. The seed is a Stitch adapter setting, not the product's primary color. If generated Material-style `surface*`, `background`, `outline*`, or `on-surface*` tokens appear, map them to the Zinc/white values in the frontmatter rather than accepting seed-generated green values.
- After `stitch upload design`, inspect the resulting design system: upload may infer `FIDELITY` and a lime seed again. Reapply the neutral settings with `stitch edit design-system`, wait for the asynchronous edit to finish, and verify with `stitch get design-system --no-cache` before generating screens. An accepted edit is not proof that the palette changed. Inspect exported HTML and screenshots too; Nuxt UI tokens remain the authority even when Stitch generates approximate Material-style tokens.
- Reject olive/green structural colors such as `#10150a`, `#0b1006`, `#181d12`, `#1c2116`, `#272c20`, `#32362a`, `#424936`, `#c1cab0`, and `#e0e5d2`.
- This Stitch project covers **light and dark modes**, on desktop and mobile. `colorMode: dark` in the frontmatter is the default reference palette, not a restriction on screen generation. Specify the target mode for each screen and use the corresponding semantic mappings below.

## Colors

The color system strictly follows the [Nuxt UI CSS Variables Specification](https://ui.nuxt.com/docs/getting-started/theme/css-variables). With `primary: "lime"`, `secondary: "violet"`, and `neutral: "zinc"` declared in `app/app.config.ts`, the runtime theming engine resolves each CSS variable to specific shades of Tailwind CSS Lime, Violet, and Zinc.

### Semantic Colors

Each semantic utility class maps to a CSS variable that flips automatically between light and dark modes:

| Utility Class                    | CSS Variable     | Light Mode Shade                | Dark Mode Shade                 | Hex (Light / Dark)    | Role                                       |
| :------------------------------- | :--------------- | :------------------------------ | :------------------------------ | :-------------------- | :----------------------------------------- |
| `bg-primary`, `text-primary`     | `--ui-primary`   | `var(--ui-color-primary-500)`   | `var(--ui-color-primary-400)`   | `#84cc16` / `#a3e635` | Primary buttons, active tabs, key links    |
| `bg-secondary`, `text-secondary` | `--ui-secondary` | `var(--ui-color-secondary-500)` | `var(--ui-color-secondary-400)` | `#8b5cf6` / `#a78bfa` | Secondary accents, auxiliary badges, tags  |
| `bg-success`, `text-success`     | `--ui-success`   | `var(--ui-color-success-500)`   | `var(--ui-color-success-400)`   | `#22c55e` / `#4ade80` | Positive balances ("gets"), settled months |
| `bg-error`, `text-error`         | `--ui-error`     | `var(--ui-color-error-500)`     | `var(--ui-color-error-400)`     | `#ef4444` / `#f87171` | Unbalanced shares, debt amounts ("owes")   |
| `bg-warning`, `text-warning`     | `--ui-warning`   | `var(--ui-color-warning-500)`   | `var(--ui-color-warning-400)`   | `#eab308` / `#facc15` | Validation warnings, email verification    |
| `bg-info`, `text-info`           | `--ui-info`      | `var(--ui-color-info-500)`      | `var(--ui-color-info-400)`      | `#3b82f6` / `#60a5fa` | Currency labels, informational feedback    |

### Background Ramp

Background utilities map to `--ui-bg-*` CSS variables based on the zinc neutral scale:

| Utility Class | CSS Variable       | Light Mode                    | Dark Mode                     | Hex (Light / Dark)    | Role                                    |
| :------------ | :----------------- | :---------------------------- | :---------------------------- | :-------------------- | :-------------------------------------- |
| `bg-default`  | `--ui-bg`          | `white`                       | `var(--ui-color-neutral-900)` | `#ffffff` / `#18181b` | Canvas page foundation                  |
| `bg-muted`    | `--ui-bg-muted`    | `var(--ui-color-neutral-50)`  | `var(--ui-color-neutral-800)` | `#fafafa` / `#27272a` | Card containers, section alternates     |
| `bg-elevated` | `--ui-bg-elevated` | `var(--ui-color-neutral-100)` | `var(--ui-color-neutral-800)` | `#f4f4f5` / `#27272a` | Popovers, modal dialogues, input fills  |
| `bg-accented` | `--ui-bg-accented` | `var(--ui-color-neutral-200)` | `var(--ui-color-neutral-700)` | `#e4e4e7` / `#3f3f46` | Active hover states, selected list rows |
| `bg-inverted` | `--ui-bg-inverted` | `var(--ui-color-neutral-900)` | `white`                       | `#18181b` / `#ffffff` | Contrasting tooltips, inverse badges    |

### Text Ramp

Text utilities map to `--ui-text-*` CSS variables:

| Utility Class      | CSS Variable            | Light Mode                    | Dark Mode                     | Hex (Light / Dark)    | Role                                  |
| :----------------- | :---------------------- | :---------------------------- | :---------------------------- | :-------------------- | :------------------------------------ |
| `text-dimmed`      | `--ui-text-dimmed`      | `var(--ui-color-neutral-400)` | `var(--ui-color-neutral-500)` | `#a1a1aa` / `#71717a` | Minor timestamps, placeholder hints   |
| `text-muted`       | `--ui-text-muted`       | `var(--ui-color-neutral-500)` | `var(--ui-color-neutral-400)` | `#71717a` / `#a1a1aa` | Captions, secondary descriptions      |
| `text-toned`       | `--ui-text-toned`       | `var(--ui-color-neutral-600)` | `var(--ui-color-neutral-300)` | `#52525b` / `#d4d4d8` | Eyebrow labels, category headers      |
| `text-default`     | `--ui-text`             | `var(--ui-color-neutral-700)` | `var(--ui-color-neutral-200)` | `#3f3f46` / `#e4e4e7` | Standard body copy, list text         |
| `text-highlighted` | `--ui-text-highlighted` | `var(--ui-color-neutral-900)` | `white`                       | `#18181b` / `#ffffff` | Headlines, monetary sums, card titles |
| `text-inverted`    | `--ui-text-inverted`    | `white`                       | `var(--ui-color-neutral-900)` | `#ffffff` / `#18181b` | Text on inverted backgrounds          |

### Border Ramp

Border utilities map to `--ui-border-*` CSS variables:

| Utility Class     | CSS Variable           | Light Mode                    | Dark Mode                     | Hex (Light / Dark)    | Role                                    |
| :---------------- | :--------------------- | :---------------------------- | :---------------------------- | :-------------------- | :-------------------------------------- |
| `border-default`  | `--ui-border`          | `var(--ui-color-neutral-200)` | `var(--ui-color-neutral-800)` | `#e4e4e7` / `#27272a` | Hairline perimeter rings, table rows    |
| `border-muted`    | `--ui-border-muted`    | `var(--ui-color-neutral-200)` | `var(--ui-color-neutral-700)` | `#e4e4e7` / `#3f3f46` | Subtle dividers, card inner splits      |
| `border-accented` | `--ui-border-accented` | `var(--ui-color-neutral-300)` | `var(--ui-color-neutral-700)` | `#d4d4d8` / `#3f3f46` | Active input borders, highlighted rings |

### Focus Outlines

Nuxt UI applies `focus-visible` outlines tinted with the component's `color` prop:

- Primary elements (`color="primary"`): `outline-primary/25` with focus ring `var(--ui-primary)`.
- Neutral elements (`color="neutral"`): `outline-inverted/25` with focus ring `var(--ui-border-inverted)`.

### Accessibility & Contrast Rules

- **Primary Lime Contrast:** Text on solid `bg-primary` must use dark neutral ink (`text-inverted` in dark mode). Prefer Nuxt UI's built-in `UButton color="primary" variant="solid"` treatment. Never place white text on lime.
- **Subtle Badges:** Use `UBadge` with semantic `color` and `variant="soft"` or `"subtle"`; keep tinted backgrounds local to the badge. Check actual rendered contrast instead of assuming all alpha fills meet a fixed ratio.
- **Readability:** Body copy and actionable labels must meet WCAG AA contrast. Reserve dimmed text for nonessential metadata; do not shrink labels below readable sizes to force a fit.

## Typography

Typography pairs **Plus Jakarta Sans** for modern geometric authority and **Geist Mono** for financial precision and code tokens.

- **Headlines:** Set in Plus Jakarta Sans Bold (700) with tight negative tracking (-0.025em to -0.02em) and tight leading (1.15 to 1.25) to deliver dense, confident typographic impact.
- **Body Text:** Plus Jakarta Sans Regular (weight 450) and Medium (500) provide optimal legibility across information-dense ledgers.
- **Financial Figures & Code:** Geist Mono with universal tabular numerals (`tabular-nums`). Currency figures ($420.00 and ៛120,000), split percentages, and numerical summaries use tabular monospace. Basis points are an internal representation, not user-facing form labels.
- **Eyebrows & Metadata:** Plus Jakarta Sans or Geist Mono at 12px with generous tracking (+0.06em), uppercase, evoking developer-tool precision.

### Type Scale

| Level          | Size             | Weight | Line Height | Tracking | Semantic Role                         |
| :------------- | :--------------- | :----- | :---------- | :------- | :------------------------------------ |
| `display-hero` | 56px (3.5rem)    | 700    | 1.15        | -0.025em | Main landing page headline            |
| `h1`           | 40px (2.5rem)    | 700    | 1.2         | -0.02em  | Page title, dashboard month header    |
| `h2`           | 30px (1.875rem)  | 700    | 1.25        | -0.02em  | Section titles, feature anchors       |
| `h3`           | 20px (1.25rem)   | 600    | 1.3         | -0.015em | Card headers, settlement summaries    |
| `h4`           | 16px (1.0rem)    | 600    | 1.35        | -0.01em  | Modal headers, group titles           |
| `body-lg`      | 18px (1.125rem)  | 450    | 1.6         | 0        | Hero lede descriptions                |
| `body-md`      | 14px (0.875rem)  | 450    | 1.5         | 0        | Standard ledger body, entries list    |
| `body-sm`      | 13px (0.8125rem) | 450    | 1.4         | 0        | Helper text, form descriptions        |
| `label-md`     | 14px (0.875rem)  | 500    | 1.35        | 0        | Button labels, navigation items       |
| `label-sm`     | 12px (0.75rem)   | 500    | 1.35        | +0.01em  | Badges, status pills, tags            |
| `label-2xs`    | 11px (0.6875rem) | 500    | 1.45        | +0.02em  | Table headers, dense micro-metadata   |
| `eyebrow`      | 12px (0.75rem)   | 600    | 1.0         | +0.06em  | Category overlines, mono labels       |
| `code-mono`    | 13px (0.8125rem) | 400    | 1.4         | 0        | Tabular minor amounts, currency, keys |

## Layout

The layout follows an engineered grid architecture centered on a standard 1280px max-width container with responsive horizontal padding.

- **Container (`UContainer`):** Bound to `--ui-container: 80rem` (1280px / `max-w-7xl`) with horizontal padding `px-6 md:px-8`.
- **Header Shell (`UHeader`):** Controlled by `--ui-header-height: 3.5rem` (56px / `h-14`) with a 1px hairline bottom divider (`border-b border-default`) and glassmorphic backdrop blur (`backdrop-blur-md bg-default/75`). Houses the brand mark, room switcher, observed navigation destinations, and account/auth controls. Do not invent a command palette.
- **Vertical Rhythm:** Section blocks separated by `py-12 sm:py-20 lg:py-24` with modular internal gaps of 16px, 24px, and 32px.
- **Bento Grid Architecture:** Multi-column feature grids (1 col mobile, 2 col tablet, 3-4 col desktop) combining high-density metric counters, split ledger cards, and interactive process steps.

### Responsive Strategy

Layouts are authored **mobile-first** with Tailwind CSS. Base classes target the 320px viewport and progressive enhancements are layered at `sm` (640px), `lg` (1024px), and larger breakpoints.

- **Never overflow the viewport:** No element may exceed the viewport width at any breakpoint from 320px up. Verify with `document.documentElement.scrollWidth === clientWidth`.
- **Stack before splitting:** Composite app chrome (room switcher, month state, tab nav, action button) stacks into stacked rows on small screens and only becomes a single row at `lg`, where there is enough horizontal room.
- **Dense data tables** keep a `min-w-120` (480px) floor and scroll inside their own `overflow-x-auto` wrapper rather than widening the page.
- **Wide side-by-side panels** (live ledger feed and settlement graph) collapse to a single column below `lg`.
- **Mobile labels** remain at least 12px; hide nonessential metadata instead of shrinking text. Keep interactive targets comfortably tappable and reserve space below content for fixed navigation.

## Elevation & Depth

Visual hierarchy is communicated through **surface tone progression and hairline borders**, strictly avoiding heavy, diffused drop shadows.

- **Surface Tonal Ramping:** Depth moves cleanly from canvas (`bg-default`) to container (`bg-muted`) to elevated controls (`bg-elevated`).
- **Hairline Containment:** Structural boundaries rely entirely on 1px hairline rings (`ring-1 ring-default` or `border border-default`), resolving to `zinc-200` in light mode and `zinc-800` in dark mode.
- **Interactive States:** Hover effects employ subtle background transitions (`hover:bg-accented` or `hover:bg-muted`) and gentle micro-lifts rather than blurred drop shadows. Focus triggers a crisp 2px ring (`focus-visible:ring-2 focus-visible:ring-primary/50`).

## Shapes

Use Nuxt UI's installed component defaults and its unified `--ui-radius: 0.25rem` (4px base) scale. Keep the same geometry in light and dark modes. The dimensions below are resolved defaults, not independent hardcoded overrides:

| Class          | Multiplier Formula             | Resolved Dimension | Role & Application                                   |
| :------------- | :----------------------------- | :----------------- | :--------------------------------------------------- |
| `rounded-xs`   | `calc(var(--ui-radius) * 0.5)` | 2px                | Micro-indicators, notification dots                  |
| `rounded-sm`   | `var(--ui-radius)`             | 4px                | Inline code tags, tooltips                           |
| `rounded-md`   | `calc(var(--ui-radius) * 1.5)` | 6px                | Buttons, inputs, and `UBadge` sizes sm–lg             |
| `rounded-lg`   | `calc(var(--ui-radius) * 2)`   | 8px                | Cards, modals, and drawer exposed corners            |
| `rounded-xl`   | `calc(var(--ui-radius) * 3)`   | 12px               | Custom layout wrappers, not a modal override         |
| `rounded-2xl`  | `calc(var(--ui-radius) * 4)`   | 16px               | Outer hero media wrappers                            |
| `rounded-full` | `9999px`                       | 9999px             | Avatars and explicitly pill-shaped custom controls   |

- Preserve component-provided rounding: `UButton` and `UInput` use `rounded-md`; `UCard` and non-fullscreen `UModal` use `rounded-lg`. `UDrawer` rounds only its exposed corners according to placement, or all corners when inset.
- `UBadge` uses `rounded-sm` for sizes xs/2xs and `rounded-md` for sizes sm/md/lg. The frontmatter badge recipes describe size sm; badges are not universally pills.
- For production components, use the defaults without redundant `rounded-*` classes or radius overrides in `class`, `ui`, or global app config. Verify defaults in `.nuxt/ui/<component>.ts` when a component or size changes.
- Stitch exports must preserve this scale: `rounded-lg` remains 8px and `rounded-full` remains fully rounded. Replace generated radius remappings with the Nuxt UI values when adapting HTML to Vue.

## Components

The system establishes standardized component primitives built on Nuxt UI v4:

- **Primary Button (`button-primary`):** Nuxt UI `UButton color="primary" variant="solid"` with a lime fill and dark neutral ink, `rounded-md`, medium weight (`label-md`), and active scale micro-interaction (`active:scale-95`). In dark mode, automatically renders Lime 400 (`#a3e635`).
- **Secondary / Outline Button:** Card surface background (`bg-default`) with 1px hairline perimeter (`border border-default`), crisp text (`text-highlighted`), and hover tone shift (`hover:bg-muted`).
- **Ledger Cards:** Divided cards with header summary (currency icon, total spent), balance rows with avatar, participant name, and tabular balance (+/-), followed by minimal settlement transfer lists.
- **Status Badges:** Subtle tinted backgrounds (`bg-success/10`, `bg-warning/10`, `bg-error/10`) paired with high-contrast text.
- **Form Controls:** Compact inputs with `rounded-md`, hairline rings (`ring-1 ring-default`), and crisp primary focus outlines (`focus:ring-2 focus:ring-primary/50`), without glow.

## Do's and Don'ts

### Do

- **Do** consume Nuxt UI semantic utility classes (`bg-default`, `bg-muted`, `text-highlighted`, `text-muted`, `border-default`) rather than writing hardcoded color values.
- **Do** use Nuxt UI's solid primary button treatment with dark neutral ink on lime; verify contrast in the rendered design.
- **Do** keep all structural surfaces, borders, and general text neutral Zinc/white. Primary lime must not tint the whole interface.
- **Do** keep USD and KHR in separate parallel ledger containers; never combine, convert, or cross-calculate currencies.
- **Do** format all financial sums, minor unit calculations, percentages, and keys using `tabular-nums` and monospace font (`font-mono`).
- **Do** rely on 1px hairline perimeter borders and subtle surface tone shifts for visual depth rather than heavy drop shadows.
- **Do** maintain a compact, high-density rhythm with `rounded-md` (6px) controls and `rounded-lg` (8px) cards.

### Don'ts

- **Don't** use white text on `bg-primary` (Lime); white on lime fails accessibility contrast criteria.
- **Don't** use olive, green-black, green-gray, or primary-derived Material surfaces for backgrounds, inactive controls, borders, or body text.
- **Don't** add speculative features or misleading security claims. Keep splits per entry at 10000 bps; do not represent membership weights as automatic bill allocations. Display dates in Asia/Phnom_Penh and keep currencies separate.
- **Don't** introduce blurred, muddy drop shadows (`shadow-2xl`); depth must come from hairline rings and surface tonal hierarchy.
- **Don't** allow shares in an entry to total anything other than 100% (10000 bps).
- **Don't** use oversized corner radii (`rounded-3xl`) on cards; preserve tight, engineered geometry.
- **Don't** bypass `--ui-radius` or `--ui-container` with custom width or radius overrides when composing layouts.

## Audited product-flow contract

The browser audit and coverage index live in `.stitch/full-web/`. Designs document intended interaction states; they do not certify untested email delivery, password reset, second-person acceptance, or authorization behavior. Use synthetic accounts and invitation links in cloud references.

### Shell and destinations

- Room navigation has five destinations: **Home, People, Settle, Categories, Entries**. Desktop uses the compact header; mobile uses bottom navigation with safe-area padding.
- **Add bill is an action**, not a navigation destination replacing Settle. Room settings, Create new room, and Join with invite code live in the room menu; Account remains accessible in the header.
- Public/auth pages, room directory, join-link page, and Account use simplified chrome. Do not show a room-specific bottom bar where no room context exists.
- Logged-in landing supports multiple rooms. `/rooms` includes room cards, last-used context, Create and Join, plus a no-rooms state; do not replace it with compulsory onboarding.
- Public landing includes independent currency and balances/shared-bills demo controls, feature/workflow sections, FAQ, and auth entry points.

### Forms and overlays

- **Entry:** amount, USD/KHR, optional description, date, paid by, category, attendee checkboxes, individual percentage inputs, and **Reset to equal**. Shares must total 100%. Do not require an invented Equal/Custom mode switch.
- USD input/display must preserve cents (`12.50` must remain `12.50` after blur). KHR uses integer amounts. Edit locks currency. Recurring categories and already-used once-per-month categories are excluded from new one-off bill choices.
- **Category:** name and Unlimited / Once a month / Monthly recurring types. Only recurring exposes amount/currency/payer/day/Active/participant shares; edit also exposes **Update this month's entry too**. Active creation publishes the current month's bill, never a draft. Manage templates through the category editor, not a speculative schedule-management page.
- **Create room:** four alternate wizard states, numbered **1–4**: Name, Currencies, Review, Invite. Review shows seeded categories. Successful Go to room must dismiss the wizard.
- **Invite:** repeatable validated email rows, Add/Remove email, shared invite link with Copy and expiry, Send invites. Do not add an unobserved Regenerate link action, role chooser, QR/SMS flow, or invitation-history table.
- **Join:** code/link overlay and authenticated `/join/[token]` page, invalid/expired state, and guest sign-in redirect preserving the destination.
- **Account:** identity/photo/read-only email/display name; room selector, nickname, color-picker popover; current/new/confirm password. No API keys, session-IP table, account-deletion feature, or global split allocation.
- Auth/recovery includes Sign In, signup with optional names and agreement checkbox, recovery request/sent state, new/confirm password, and Link Expired. Do not invent social login or a second-factor/code-entry flow.
- Mobile drawers need a visible dismiss action, contained scrolling, keyboard-safe sticky footer and sufficient bottom padding. Background navigation is inert while an overlay is open.

### Settlement and feedback

- Settlement shows **suggested minimum transfer paths**, separate USD/KHR totals, and member net balances. It does not move money or track payment acknowledgements. No Mark as paid, Pending payment, Confirm received, receipt, bank, or cryptographic-signature UI.
- Month summary is a separate route from Settlement. Closed months show a persistent read-only notice and disabled mutations; admin Reopen is distinct from a non-admin Ask an admin message. Closing uses a confirmation; reopening restores editability.
- Confirm entry/category/member/room removal and month close with clear consequences, explicit Cancel, a named action, loading/disabled behavior, and an actionable error. Preserve a readable historical category label or fallback after category removal.
- Cover loading, empty, load failure/retry, form validation, submit pending/success/error, disabled permissions, copied-link feedback, and email-verification warning/resend/sent variants. Use human-readable errors, not raw schema messages.
- Component state boards illustrate **alternative states**, not extra application routes or multiple simultaneous dialogs.
