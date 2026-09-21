---
version: alpha
name: Tricker
description: Multi-tenant household bill tracker visual identity modeled after the Nuxt SaaS template (saas-template.nuxt.dev) built with Nuxt UI v4 and Tailwind CSS.
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-subtle: "#EFF6FF"
  accent: "#047857"
  accent-subtle: "#EFFDF5"
  neutral: "#0F172A"
  neutral-muted: "#475569"
  neutral-subtle: "#E2E8F0"
  surface: "#FFFFFF"
  surface-muted: "#F8FAFC"
  surface-elevated: "#F1F5F9"
  surface-dark: "#020617"
  surface-dark-elevated: "#0F172A"
  surface-dark-accented: "#1E293B"
  error: "#B91C1C"
  error-subtle: "#FEF2F2"
  warning: "#B45309"
  warning-subtle: "#FFFBEB"
typography:
  display-hero:
    fontFamily: Public Sans
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
  h1:
    fontFamily: Public Sans
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.025em
  h2:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  h3:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  h4:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  code-inline:
    fontFamily: ui-monospace, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.06em
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
  header-height: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  button-subtle:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    typography: "{typography.label-md}"
  badge-accent:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent}"
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
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    typography: "{typography.body-md}"
  card-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    typography: "{typography.body-md}"
  card-divider:
    backgroundColor: "{colors.neutral-subtle}"
    height: "1px"
    width: "100%"
  input-field:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body-sm}"
  header-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-muted}"
    height: "{spacing.header-height}"
    typography: "{typography.label-md}"
  dark-card:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  dark-surface-accent:
    backgroundColor: "{colors.surface-dark-accented}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  dark-canvas:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.surface}"
---

## Overview

Architectural clarity meets high-velocity developer ergonomics. The Tricker visual identity delivers a modern, high-conversion software interface characterized by crisp typography, subtle spatial lighting, and refined hairline containment.

The design embodies two complementary atmospheres:

1. **Light Mode (Clean Precision):** Pure white and light slate surfaces anchored by crisp dark slate typography, providing an airy, publication-grade reading experience.
2. **Dark Mode (Atmospheric Command):** Deep midnight slate (`#020617` / `#0F172A`) paired with glowing interactive elements, creating an immersive, distraction-free environment for modern software builders.

The system is engineered natively on top of `@nuxt/ui` v4 and Tailwind CSS v4. Rather than inventing disparate ad-hoc classes, components build upon Nuxt UI semantic tokens:

- **Surface ramps:** `bg-default` (canvas base) → `bg-muted` (structural groupings) → `bg-elevated` (interactive cards and popovers) → `bg-accented` (active hover states).
- **Text hierarchy:** `text-highlighted` (headlines and active titles) → `text-default` (body prose) → `text-muted` (descriptions and captions) → `text-dimmed` (placeholders and subtle metadata).
- **Border containment:** `border-default` and `ring-default` resolving to 1px hairline perimeters.
- **Lighting and Depth:** Ambient SVG linear top gradient backdrops (`HeroBackground`), dynamic mouse-tracking spotlight cards (`UPageCard spotlight`), and celestial particle canvas layers (`StarsBg`).

## Colors

The palette is rooted in high-contrast slate neutrals, an energetic electric blue interaction driver, and an emerald accent hue for feature validation and branding.

### Primary Interaction Palette

- **Primary (`#2563EB` / Blue 600):** The primary interaction driver. Used for solid call-to-action buttons, active navigation indicators, key links, and keyboard focus outlines (`outline-primary/25`). In dark mode, Nuxt UI automatically steps to Blue 400 (`#60A5FA`) or Blue 500 (`#3B82F6`) to maintain contrast on dark backgrounds.
- **Primary Hover (`#1D4ED8` / Blue 700):** The pressed and hover state for primary solid interactive controls.
- **Primary Subtle (`#EFF6FF` / Blue 50):** A delicate blue tint used for selected tabs, active list items, and subtle feature highlights.

### Brand & Feedback Accents

- **Accent (`#047857` / Emerald 700):** Iconic Nuxt-inspired emerald green. Used for success metrics, verification checkmarks (`i-lucide-circle-check`), and positive status badges. In dark mode, the accent shines at `#00DC82` / `#00C16A`.
- **Accent Subtle (`#EFFDF5` / Emerald 50):** Background wash for success notifications and feature announcement pills.
- **Error (`#B91C1C` / Red 700):** Critical alerts, validation errors, and destructive actions.
- **Error Subtle (`#FEF2F2` / Red 50):** Background for error alert boxes and danger chips.
- **Warning (`#B45309` / Amber 700):** Cautions, quota limits, and pending states.
- **Warning Subtle (`#FFFBEB` / Amber 50):** Soft amber surface for warning notices.

### Slate Neutral Palette

- **Neutral (`#0F172A` / Slate 900):** High-contrast dark ink used for display headlines, titles, and primary copy in light mode.
- **Neutral Muted (`#475569` / Slate 600):** Secondary text, explanatory subtitles, table column headers, and neutral icons.
- **Neutral Subtle (`#E2E8F0` / Slate 200):** Hairline borders, card rings, and subtle dividers.
- **Surface (`#FFFFFF`):** Pure white canvas for light mode page backgrounds and elevated cards.
- **Surface Muted (`#F8FAFC` / Slate 50):** Soft neutral tint for hero panels, section alternates, and subtle card surfaces.
- **Surface Elevated (`#F1F5F9` / Slate 100):** Input background fills, hover highlights, and chips.
- **Surface Dark (`#020617` / Slate 950):** Deep foundation canvas for dark mode.
- **Surface Dark Elevated (`#0F172A` / Slate 900):** Dark mode cards, modals, and navigation dropdowns.
- **Surface Dark Accented (`#1E293B` / Slate 800):** Dark mode card borders and active hover rings.

## Typography

Typography is set in **Public Sans** (`--font-sans`), a modernist grotesque typeface with clean geometric proportions, tall x-height, and neutral editorial rhythm. For tabular data, keyboard shortcuts, version tags, and code blocks, the system pairs Public Sans with a clean **Monospace** stack (`--font-mono`).

### Type Scale

| Level          | Size             | Weight | Line Height | Tracking | Semantic Role                               |
| :------------- | :--------------- | :----- | :---------- | :------- | :------------------------------------------ |
| `display-hero` | 56px (3.5rem)    | 700    | 1.1         | -0.03em  | SaaS landing page main hero headline        |
| `h1`           | 44px (2.75rem)   | 700    | 1.15        | -0.025em | Major page headings and section anchors     |
| `h2`           | 32px (2.0rem)    | 600    | 1.25        | -0.02em  | Feature titles, pricing section titles      |
| `h3`           | 24px (1.5rem)    | 600    | 1.3         | -0.015em | Card headers, plan tier titles              |
| `h4`           | 18px (1.125rem)  | 600    | 1.4         | -0.01em  | Modal headers, feature item titles          |
| `body-lg`      | 18px (1.125rem)  | 400    | 1.6         | 0        | Hero lede paragraphs, featured quotes       |
| `body-md`      | 16px (1.0rem)    | 400    | 1.5         | 0        | Standard body copy, articles, descriptions  |
| `body-sm`      | 14px (0.875rem)  | 400    | 1.5         | 0        | Secondary descriptions, helper text, inputs |
| `label-md`     | 14px (0.875rem)  | 500    | 1.4         | 0        | Button labels, navigation menu links        |
| `label-sm`     | 12px (0.75rem)   | 500    | 1.4         | +0.01em  | Badges, pills, metadata tags                |
| `eyebrow`      | 12px (0.75rem)   | 600    | 1.0         | +0.06em  | Category labels above titles                |
| `code-inline`  | 13px (0.8125rem) | 400    | 1.4         | 0        | Inline code, shortcuts, technical keys      |

Headings leverage negative letter spacing (`-0.02em` to `-0.03em`) and tight line heights to read as cohesive visual units. Paragraphs and descriptions use standard tracking and comfortable line heights (`1.5` to `1.6`) for optimal legibility.

## Layout

The layout system follows a responsive grid model centered around a standard max-width container and balanced vertical spacing intervals.

### Containment & Geometry

- **Container (`UContainer`):** Bound to `--ui-container: 80rem` (1280px) with responsive horizontal padding (`px-4 sm:px-6 lg:px-8`).
- **Header Bar (`UHeader`):** Fixed height `h-16` (64px / `--ui-header-height`), sticky positioned with a glassmorphic blur (`backdrop-blur-md bg-default/75`).
- **Section Spacing:** Major page blocks are separated by `py-16 sm:py-24 lg:py-32` (`gap-16 lg:gap-24`) to give content breathing room.
- **Standard Spacing Scale:** Built on 4px and 8px modules (`xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`, `2xl: 48px`, `3xl: 64px`, `4xl: 96px`).

### Compositional Archetypes

1. **Centered Editorial Hero (`UPageHero`):**
   - Centered single-column composition.
   - Atmospheric top gradient line (`HeroBackground`).
   - Pill badge lead (`eyebrow-badge`).
   - Bold display headline with gradient or colored accent span (`[SaaS]{class="text-primary"}`).
   - Action button pair: Primary solid button + Neutral outline button.
   - Promotional media preview (`PromotionalVideo` / `ImagePlaceholder`) framed by a hairline ring.
2. **Alternating Split Features (`UPageSection`):**
   - 2-column grid (`lg:grid-cols-2`) with `orientation="horizontal"` and alternating `reverse: true`.
   - Left column: Section title, description, and bulleted feature list with Lucide icons.
   - Right column: UI mockup card or illustrative graphic.
3. **Responsive Card Grid (`UPageGrid`):**
   - 1-column on mobile, 2-column on tablet, 3-column on desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`).
   - Houses `UPageCard` elements featuring mouse-following spotlight glow.
4. **Three-Tier Pricing Grid (`UPricingPlans`):**
   - 3-tier card layout with standard versus highlighted tier.
   - Featured plan uses scale emphasis (`scale: true`) and accent badge.
   - Pill-shaped frequency toggle (`UTabs rounded-full`) for Monthly vs Yearly billing.
5. **Masonry Testimonials (`UPageColumns`):**
   - Responsive multi-column layout (`xl:columns-4 gap-6`).
   - Cards use `variant="subtle"` with user avatar, name, and handle (`UUser`).
6. **Ambient CTA Block (`UPageCTA`):**
   - Full-width call-to-action block layered with an animated cosmic starfield (`StarsBg`).

## Elevation & Depth

Visual hierarchy is conveyed through **tonal layering and hairline containment rings** rather than heavy drop shadows. This produces clean contrast in both light and dark modes without muddy shadows or ambient halos.

### The Tonal Layering Model

1. **Layer 0 (Canvas):** Base page background (`bg-default`: `#FFFFFF` light / `#020617` dark).
2. **Layer 1 (Subtle Wells & Sections):** Large layout enclosures and alternate sections (`bg-muted`: `#F8FAFC` light / `#0F172A` dark).
3. **Layer 2 (Cards & Surfaces):** Content cards, dialogs, and popovers (`bg-elevated` or card surface: `#FFFFFF` light / `#0F172A` dark).
4. **Layer 3 (Accented Controls):** Input fields, hover highlights, and active pills (`bg-accented`: `#F1F5F9` light / `#1E293B` dark).

### Hairline Perimeter Rings

Cards and structural containers do not rely on blurred shadows. Instead, they use a hairline 1px ring (`ring-1 ring-default` or `border border-default`), which maps to `slate-200` in light mode and `slate-800` in dark mode.

### Atmospheric Spatial Lighting

- **Hero Horizon Glow (`HeroBackground`):** An SVG mask containing dual linear gradient stops along the top edge of the hero section, casting a soft tint from the primary brand hue downward.
- **Cursor Spotlight (`UPageCard spotlight`):** A subtle dynamic radial gradient that tracks the user's cursor across cards, revealing hairline borders on hover.
- **Interactive Focus Elevation:** Interactive elements avoid heavy elevation on focus, instead displaying an accessible 2px focus ring tinted with the component's accent hue (`focus-visible:outline-3 outline-primary/25`).
- **Celestial Particle Canvas (`StarsBg`):** Multi-speed star particle layers placed in the CTA section to create subtle optical depth.

## Shapes

The shape system is defined by **calibrated modern geometry** governed by the `--ui-radius` variable (base `0.25rem` / 4px). This creates consistent curvature across interactive and structural elements.

### Radius Scale

| Token  | Dimension | Role & Component Application                                          |
| :----- | :-------- | :-------------------------------------------------------------------- |
| `none` | 0px       | Flat edges, full-bleed images                                         |
| `xs`   | 2px       | Micro-indicators, notification badges                                 |
| `sm`   | 4px       | Small tags, tooltips, inline code blocks                              |
| `md`   | 6px       | Standard form inputs (`UInput`), textareas, search bars               |
| `lg`   | 8px       | Action buttons (`UButton`), tab triggers, toast banners               |
| `xl`   | 12px      | Standard cards (`UPageCard`), pricing plan boxes, modals              |
| `2xl`  | 16px      | Hero media wrappers, promotional video containers                     |
| `full` | 9999px    | Badges (`UBadge`), avatar rings, billing switch pills, toggle buttons |

### Shape Principles

- **Inputs vs Buttons:** Form inputs utilize `rounded-md` (6px) while action buttons utilize `rounded-lg` (8px). This slight differentiation helps buttons feel distinct and tactile.
- **Card Containers:** Cards consistently use `rounded-xl` (12px). Outer wrapper boxes never exceed `rounded-2xl` (16px) to avoid bubbly, imprecise styling.
- **Pill Badges:** Badges, category indicators, and status chips strictly use `rounded-full` (9999px), creating clear contrast against rectangular card surfaces.

## Components

The design system standardizes reusable component atoms aligned with Nuxt UI v4 specifications.

### Buttons (`UButton`)

- **Primary Button (`button-primary`):** Solid electric blue (`bg-primary`), white text (`text-surface`), `rounded-lg`, medium weight (`label-md`), padded `10px 20px`. Hover deepens to `primary-hover`. Focus emits `outline-primary/25`.
- **Secondary / Outline Button:** `bg-surface`, hairline ring `ring-1 ring-default`, `text-neutral`. Hover shifts background to `surface-muted`.
- **Subtle Button (`button-subtle`):** Tinted primary subtle background (`primary-subtle`) with `primary-hover` text.
- **Ghost Button:** Zero-background button, `text-neutral-muted` with hover background on `surface-elevated`.

### Navigation & Header (`UHeader`, `UNavigationMenu`)

- **Header Shell:** Sticky top container with `h-16`, flex row with left logo slot, centered horizontal navigation links, and right utility controls.
- **Nav Links:** Public Sans `label-md`, `text-neutral-muted` transitioning to `text-neutral` on hover. Active links show bold weight and a subtle indicator underline.
- **Utility Suite:** Color mode switch (`UColorModeButton`), documentation search launcher (`UContentSearchButton`), and login/signup action pair.

### Cards (`UPageCard`, `UPricingPlan`)

- **Standard Card (`card-surface`):** White or dark-slate elevated surface with `rounded-xl` and 1px hairline ring. Padded `p-6` or `p-8`.
- **Spotlight Card:** Standard card equipped with mouse-following radial gradient overlay.
- **Pricing Plan Card:** Features price headline (`h2`), billing cycle label (`text-neutral-muted`), tier description, primary or subtle CTA button, and feature checkmark list. Featured plan adds scale transform and pill badge.

### Badges & Eyebrows (`UBadge`)

- **Eyebrow Badge:** Pill-shaped (`rounded-full`) chip above section headings. Composed of `accent-subtle` background and `accent` text, or neutral subtle background with leading icon.
- **Status Pills:** Compact indicators for "New", "Beta", or status counts.

### Form Controls (`UInput`, `UAuthForm`)

- **Input Fields (`input-field`):** `rounded-md`, `bg-surface-elevated`, hairline ring `ring-accented`, inset padding `px-3 py-2`. Focus activates `ring-primary` and `outline-primary/25`.
- **Auth Card:** Centered card (`max-w-sm w-full`) with lock icon header, social OAuth buttons (Google, GitHub), horizontal separator, email/password form fields, and Terms of Service footnote.

### Segmented Controls & Tabs (`UTabs`)

- **Billing Switch:** Pill-shaped container (`rounded-full ring ring-accented`) with sliding active pill indicator, switching between Monthly and Yearly pricing.

### Accordion & FAQ (`UAccordion`)

- **Accordion Row:** Borderless expandable trigger with `text-highlighted` label and chevron trailing icon. Expanded body text renders in `text-neutral-muted` with comfortable spacing.

### Separators (`USeparator`)

- **Hairline Divider (`card-divider`):** 1px horizontal rule (`bg-neutral-subtle`) with optional centered icon or label badge.

## Do's and Don'ts

### Do

- **Do** rely on Nuxt UI semantic color variables (`bg-default`, `bg-muted`, `bg-elevated`, `text-highlighted`, `text-muted`, `ring-default`) to enable seamless light and dark mode transitions.
- **Do** preserve the canonical 1280px container width (`UContainer`) for top-level page views.
- **Do** maintain a strict 4.5:1 WCAG AA contrast ratio for body copy against its underlying surface.
- **Do** reserve the electric blue primary color for the most important user actions on each screen.
- **Do** use `rounded-full` for all status badges, tags, and segmented billing toggles, and `rounded-xl` for cards.
- **Do** use hairline rings (`ring-1 ring-default`) and background tone shifts for visual depth rather than heavy drop shadows.
- **Do** pair Lucide icons (`i-lucide-*`) with buttons and feature cards to improve visual scanning.

### Don't

- **Don't** apply heavy, dark box shadows (`shadow-2xl`); depth must come from hairline rings and surface tonal hierarchy.
- **Don't** mix inconsistent corner radii in the same component group (e.g. sharp inputs inside a rounded card).
- **Don't** use low-contrast text (such as light gray on white) that fails WCAG AA readability criteria.
- **Don't** introduce random accent colors; interactive actions stay in electric blue, while emerald green is reserved for positive validation and branding.
- **Don't** override typography fonts arbitrarily; maintain Public Sans as the primary voice and monospace for technical data.
- **Don't** hardcode raw RGB or hex values inside component templates; bind to theme tokens and CSS variables.
