---
version: alpha
name: Tricker
description: Multi-tenant household bill tracker visual identity inspired by OpenRouter (openrouter.ai) — high-density engineering aesthetics, deep obsidian ink foundations, canonical Tailwind CSS lime primary interaction driver, crisp Plus Jakarta Sans typography, and hairline containment built natively on Nuxt UI v4 CSS variables and Tailwind CSS.
colors:
  primary: "#84cc16"
  primary-dark: "#a3e635"
  primary-hover: "#65a30d"
  primary-subtle: "#1a2e05"
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
  success: "#065f46"
  success-subtle: "#ecfdf5"
  error: "#b91c1c"
  error-subtle: "#fef2f2"
  warning: "#92400e"
  warning-subtle: "#fffbeb"
  info: "#075985"
  info-subtle: "#f0f9ff"
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
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-warning:
    backgroundColor: "{colors.warning-subtle}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-error:
    backgroundColor: "{colors.error-subtle}"
    textColor: "{colors.error}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  badge-info:
    backgroundColor: "{colors.info-subtle}"
    textColor: "{colors.info}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label-sm}"
  table-header:
    backgroundColor: "{colors.neutral-muted-light}"
    textColor: "{colors.text-light-muted}"
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

## Colors

The color system strictly follows the [Nuxt UI CSS Variables Specification](https://ui.nuxt.com/docs/getting-started/theme/css-variables). With `primary: "lime"` and `neutral: "zinc"` declared in `app/app.config.ts`, the runtime theming engine resolves each CSS variable to specific shades of Tailwind CSS Lime and Zinc.

### Semantic Colors

Each semantic utility class maps to a CSS variable that flips automatically between light and dark modes:

| Utility Class                | CSS Variable   | Light Mode Shade              | Dark Mode Shade               | Hex (Light / Dark)    | Role                                       |
| :--------------------------- | :------------- | :---------------------------- | :---------------------------- | :-------------------- | :----------------------------------------- |
| `bg-primary`, `text-primary` | `--ui-primary` | `var(--ui-color-primary-500)` | `var(--ui-color-primary-400)` | `#84cc16` / `#a3e635` | Primary buttons, active tabs, key links    |
| `bg-success`, `text-success` | `--ui-success` | `var(--ui-color-success-500)` | `var(--ui-color-success-400)` | `#10b981` / `#34d399` | Positive balances ("gets"), settled months |
| `bg-error`, `text-error`     | `--ui-error`   | `var(--ui-color-error-500)`   | `var(--ui-color-error-400)`   | `#ef4444` / `#f87171` | Unbalanced shares, debt amounts ("owes")   |
| `bg-warning`, `text-warning` | `--ui-warning` | `var(--ui-color-warning-500)` | `var(--ui-color-warning-400)` | `#f59e0b` / `#fbbf24` | Unreconciled entries, pending approvals    |
| `bg-info`, `text-info`       | `--ui-info`    | `var(--ui-color-info-500)`    | `var(--ui-color-info-400)`    | `#0ea5e9` / `#38bdf8` | Dual-currency routing badges, API tips     |

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

- **Primary Lime Contrast:** Because Lime 400 (`#a3e635`) and Lime 500 (`#84cc16`) have very high luminance, text placed on top of `bg-primary` must use dark neutral ink (`#18181b` / `text-neutral-900`), delivering an accessible 8.9:1 to 11.7:1 WCAG AAA contrast ratio. Never place white text on a Lime background.
- **Subtle Badges:** Pill badges use light tint surfaces with deeper shade text (e.g. `bg-success/15` with `text-emerald-800` or `text-emerald-400` in dark mode) ensuring >= 5.9:1 WCAG AA contrast.

## Typography

Typography pairs **Plus Jakarta Sans** for modern geometric authority and **Geist Mono** for financial precision and code tokens.

- **Headlines:** Set in Plus Jakarta Sans Bold (700) with tight negative tracking (-0.025em to -0.02em) and tight leading (1.15 to 1.25) to deliver dense, confident typographic impact.
- **Body Text:** Plus Jakarta Sans Regular (weight 450) and Medium (500) provide optimal legibility across information-dense ledgers.
- **Financial Figures & Code:** Geist Mono with universal tabular numerals (`tabular-nums`). Currency figures ($420.00 and ៛120,000), minor unit calculations, split percentages (10000 bps), and API keys are strictly set in tabular monospace.
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
- **Header Shell (`UHeader`):** Controlled by `--ui-header-height: 3.5rem` (56px / `h-14`) with a 1px hairline bottom divider (`border-b border-default`) and glassmorphic backdrop blur (`backdrop-blur-md bg-default/75`). Houses the brand mark, navigation items, global `⌘K` command trigger, and auth controls.
- **Vertical Rhythm:** Section blocks separated by `py-12 sm:py-20 lg:py-24` with modular internal gaps of 16px, 24px, and 32px.
- **Bento Grid Architecture:** Multi-column feature grids (1 col mobile, 2 col tablet, 3-4 col desktop) combining high-density metric counters, split ledger cards, and interactive process steps.

### Responsive Strategy

Layouts are authored **mobile-first** with Tailwind CSS. Base classes target the 320px viewport and progressive enhancements are layered at `sm` (640px), `lg` (1024px), and larger breakpoints.

- **Never overflow the viewport:** No element may exceed the viewport width at any breakpoint from 320px up. Verify with `document.documentElement.scrollWidth === clientWidth`.
- **Stack before splitting:** Composite app chrome (room switcher, month state, tab nav, action button) stacks into stacked rows on small screens and only becomes a single row at `lg`, where there is enough horizontal room.
- **Dense data tables** keep a `min-w-120` (480px) floor and scroll inside their own `overflow-x-auto` wrapper rather than widening the page.
- **Wide side-by-side panels** (live ledger feed and settlement graph) collapse to a single column below `lg`.
- **Micro-labels** drop one step (`text-2xs` → `text-xs`) and icons/avatars shrink on small viewports instead of wrapping.

## Elevation & Depth

Visual hierarchy is communicated through **surface tone progression and hairline borders**, strictly avoiding heavy, diffused drop shadows.

- **Surface Tonal Ramping:** Depth moves cleanly from canvas (`bg-default`) to container (`bg-muted`) to elevated controls (`bg-elevated`).
- **Hairline Containment:** Structural boundaries rely entirely on 1px hairline rings (`ring-1 ring-default` or `border border-default`), resolving to `zinc-200` in light mode and `zinc-800` in dark mode.
- **Interactive States:** Hover effects employ subtle background transitions (`hover:bg-accented` or `hover:bg-muted`) and gentle micro-lifts rather than blurred drop shadows. Focus triggers a crisp 2px ring (`focus-visible:ring-2 focus-visible:ring-primary/50`).

## Shapes

Geometry is governed by Nuxt UI's unified `--ui-radius: 0.25rem` (4px base) system, which scales across standard border-radius utility classes:

| Class          | Multiplier Formula             | Resolved Dimension | Role & Application                                   |
| :------------- | :----------------------------- | :----------------- | :--------------------------------------------------- |
| `rounded-xs`   | `calc(var(--ui-radius) * 0.5)` | 2px                | Micro-indicators, notification dots                  |
| `rounded-sm`   | `var(--ui-radius)`             | 4px                | Inline code tags, tooltips                           |
| `rounded-md`   | `calc(var(--ui-radius) * 1.5)` | 6px                | Action buttons (`UButton`), form inputs (`UInput`)   |
| `rounded-lg`   | `calc(var(--ui-radius) * 2)`   | 8px                | Standard cards (`UCard`), dropdown popovers          |
| `rounded-xl`   | `calc(var(--ui-radius) * 3)`   | 12px               | Modal dialogs, major bento panels                    |
| `rounded-2xl`  | `calc(var(--ui-radius) * 4)`   | 16px               | Outer hero media wrappers                            |
| `rounded-full` | `9999px`                       | 9999px             | Status badges (`UBadge`), avatar rings, pill toggles |

## Components

The system establishes standardized component primitives built on Nuxt UI v4:

- **Primary Button (`button-primary`):** Solid Tailwind Lime fill (`bg-primary text-neutral-900`), `rounded-md`, medium weight (`label-md`), and active scale micro-interaction (`active:scale-95`). In dark mode, automatically renders Lime 400 (`#a3e635`).
- **Secondary / Outline Button:** Card surface background (`bg-default`) with 1px hairline perimeter (`border border-default`), crisp text (`text-highlighted`), and hover tone shift (`hover:bg-muted`).
- **Command Trigger Pill:** Input-like button with `⌘K` keyboard shortcut badge in monospace (`font-mono text-xs`).
- **Ledger Cards:** Divided cards with header summary (currency icon, total spent), balance rows with avatar, participant name, and tabular balance (+/-), followed by minimal settlement transfer lists.
- **Status Badges:** Subtle tinted backgrounds (`bg-success/10`, `bg-warning/10`, `bg-error/10`) paired with high-contrast text.
- **Form Controls:** Compact inputs with `rounded-md`, hairline rings (`ring-1 ring-default`), and glowing primary focus outlines (`focus:ring-2 focus:ring-primary/50`).

## Do's and Don'ts

### Do

- **Do** consume Nuxt UI semantic utility classes (`bg-default`, `bg-muted`, `text-highlighted`, `text-muted`, `border-default`) rather than writing hardcoded color values.
- **Do** use dark neutral text (`text-neutral-900`) on `bg-primary` (Lime) to guarantee an accessible 8.9+:1 WCAG AAA contrast ratio.
- **Do** keep USD and KHR in separate parallel ledger containers; never combine, convert, or cross-calculate currencies.
- **Do** format all financial sums, minor unit calculations, percentages, and keys using `tabular-nums` and monospace font (`font-mono`).
- **Do** rely on 1px hairline perimeter borders and subtle surface tone shifts for visual depth rather than heavy drop shadows.
- **Do** maintain a compact, high-density rhythm with `rounded-md` (6px) controls and `rounded-lg` (8px) cards.

### Don'ts

- **Don't** use white text on `bg-primary` (Lime); white on lime fails accessibility contrast criteria.
- **Don't** introduce blurred, muddy drop shadows (`shadow-2xl`); depth must come from hairline rings and surface tonal hierarchy.
- **Don't** allow shares in an entry to total anything other than 100% (10000 bps).
- **Don't** use oversized corner radii (`rounded-3xl`) on cards; preserve tight, engineered geometry.
- **Don't** bypass `--ui-radius` or `--ui-container` with custom width or radius overrides when composing layouts.
