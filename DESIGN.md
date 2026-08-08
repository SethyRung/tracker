---
version: alpha
name: Tricker
description: A multi-tenant household bill tracker — olive-green primary, Geist type, mono details, and pixel-letter emphasis composed on top of Nuxt UI's zinc neutral surface.
colors:
  primary: "#699949"
  primarySoft: "#87b467"
  primaryDeep: "#3f5d2e"
  success: "#10B981"
  info: "#0EA5E9"
  warning: "#F59E0B"
  error: "#EF4444"
  ink: "#1A1C1E"
  inkMuted: "#52525B"
  inkDim: "#9CA3AF"
  surface: "#FFFFFF"
  surfaceMuted: "#F4F4F5"
  surfaceRing: "#E4E4E7"
typography:
  body-md:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.7
  h1:
    fontFamily: Geist
    fontSize: 4rem
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Geist
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  eyebrow:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.08em"
    textTransform: uppercase
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6
  pixel-accent:
    fontFamily: Geist Pixel
    fontSize: 1em
    fontWeight: 500
rounded:
  pill: 9999px
  card: 12px
  input: 8px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  "2xl": 16px
  "3xl": 24px
spacing:
  section-y: 80px
  container-gap: 56px
  card-pad: 24px
  eyebrow-pad-x: 12px
  eyebrow-pad-y: 4px
elevation:
  card: "0 1px 0 0 rgba(24,24,27,0.04)"
  card-ring: "1px solid #E4E4E7"
shapes:
  pill: rounded.pill
  card: rounded.card
  input: rounded.input
components:
  eyebrow-pill:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "{spacing.eyebrow-pad-y} {spacing.eyebrow-pad-x}"
  eyebrow-pill-on-elevated:
    backgroundColor: "#FAFAFA"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "{spacing.eyebrow-pad-y} {spacing.eyebrow-pad-x}"
  card-surface:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  card-ring:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  game-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0"
  game-card-image:
    rounded: "{rounded.card}"
    aspectRatio: "16 / 9"
  terminal-frame:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.card}"
  terminal-traffic-light:
    backgroundColor: "{colors.primarySoft}"
    size: 10px
    rounded: "{rounded.pill}"
  price-tag:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.h2}"
  discount-badge:
    backgroundColor: "{colors.primaryDeep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  metacritic-pill:
    backgroundColor: "{colors.success}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  source-chip:
    backgroundColor: "#FAFAFA"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  answer-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  card-divider:
    backgroundColor: "{colors.surfaceRing}"
    height: "1px"
    width: "100%"
  muted-hint:
    backgroundColor: "transparent"
    textColor: "{colors.inkDim}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primaryDeep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-primary-focus:
    backgroundColor: "{colors.primaryDeep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  pixel-accent-word:
    textColor: "{colors.primary}"
    typography: "{typography.pixel-accent}"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
---

## Overview

Glitch is the public surface for the WebBridge demo game store — a Nuxt 4
catalog of Steam games with a cart, a checkout that hands off to the
WebViewJavascriptBridge in the demo's Android banking app, and a Better
Auth–backed account model. The visual language borrows from modern game
launchers — mono eyebrows, pixel-letter accent words, "live" status dots —
but stays readable as a marketing and shopping surface. A single green
accent drives every interactive cue; everything else is Nuxt UI's default
zinc neutral surface, so light and dark mode flip automatically.

The tone is "playful tools, deliberately." Type stays in Geist (sans + mono)
with `Geist Pixel` reserved for one or two accent words per heading — never
whole sentences, never body copy.

### How this spec maps to Nuxt UI

Glitch composes on top of `@nuxt/ui`, so most styling happens through Nuxt
UI's semantic utility classes rather than the tokens in this file directly.
An agent generating markup should reach for these classes first and only fall
back to raw tokens when the spec is explicit.

- **Text ramp** — `text-dimmed` → `text-muted` → `text-toned` →
  `text-default` → `text-highlighted` (+ `text-inverted`). Catalog roles:
  meta info (`dimmed`), paragraph copy (`muted`), eyebrows + chips +
  category labels (`toned`), game descriptions and prose (`default`),
  headlines and game titles (`highlighted`).
- **Background ramp** — `bg-default` → `bg-muted` → `bg-elevated` →
  `bg-accented` (+ `bg-inverted`). Page uses `bg-default` for game cards
  and the checkout summary, `bg-muted` for hero panels and terminal-style
  blocks, `bg-elevated` for chips and pills that float over cards.
- **Border / ring** — `border-default` / `ring-default` resolves to
  `--ui-border` (~zinc-200 light / zinc-800 dark). Use `ring-1
ring-default` on cards; reserve `border-default` for table-like rows
  or dividers (e.g. the cart line items' `divide-y divide-default`).
- **Brand color** — `text-primary`, `bg-primary`, `ring-primary`,
  `border-primary` all derive from `--ui-primary`, which is
  `--ui-color-primary-500` in light mode and `--ui-color-primary-400` in
  dark mode. With the project's primary scale this resolves to `#699949`
  light / `#87b467` dark. Use opacity utilities (`bg-primary/30`,
  `bg-primary/50`, `bg-primary/80`) for the cart's hover glow and the
  live-status indicators — never hand-write rgba.
- **Container** — `UContainer` is bound to `--ui-container` (default `80rem`,
  equal to `max-w-7xl`). Don't introduce a wider custom container; the
  catalog grid already centers around `UContainer` for the outer wrapper
  and `max-w-2xl` for prose blocks.
- **Focus** — Every interactive Nuxt UI component carries a `focus-visible`
  outline tinted with its `color` prop. Primary buttons
  (`UButton color="primary"`) get `outline-primary/25`; neutral outline
  buttons get `outline-inverted/25`. Custom focusable surfaces should
  mirror that pattern, not paint a raw green ring.

Radius utilities and the typography utilities are documented under their
own sections below.

## Colors

The catalog's neutrals come from Nuxt UI's zinc scale; the values below are
the **light-mode approximations** of those semantic tokens. The source of
truth is `--ui-text-*`, `--ui-bg-*`, and `--ui-border`.

**Primary scale** (defined in `app/assets/css/main.css` as
`--color-primary-*`, mapped via `app.config.ts`):

| Step | Hex       | Role                              |
| ---- | --------- | --------------------------------- |
| 50   | `#f7fce9` | Tinted backgrounds, subtle washes |
| 100  | `#edf8cf` | Hover states on tinted surfaces   |
| 200  | `#dbf1a5` | Light accents, soft borders       |
| 300  | `#c1e670` | Decorative highlights             |
| 400  | `#87b467` | `primarySoft` — dark-mode primary |
| 500  | `#699949` | `primary` — brand accent          |
| 600  | `#517937` | Active/pressed on tinted surfaces |
| 700  | `#3f5d2e` | `primaryDeep` — hover/CTA bg      |
| 800  | `#425b19` | Deep decorative                   |
| 900  | `#384d1a` | Near-text dark accents            |
| 950  | `#1c2a09` | Deepest tone                      |

- **Primary `#699949` (Primary 500):** the only saturated hue on the
  surface. Used for the brand mark, the pulsing "live" dot on featured
  games, chevron icons in mock frames, price tags, and pixel-letter accent
  words. Tinted lighter in dark mode (`primary-400: #87b467`).
- **Primary Deep `#3f5d2e` (Primary 700):** hover and pressed states for
  primary buttons, the discount badge background, and the deep end of
  the `bg-primary/30 → /50 → /80` accent decorations.
- **Success `#10B981` (Emerald 500):** the Metacritic pill on game cards
  and any positive confirmation (purchase completed, item added to cart).
- **Info `#0EA5E9` (Sky 500):** informational banners (e.g. "Demo build"
  badge, pending-payment notices).
- **Warning `#F59E0B` (Amber 500):** stock-low warnings and pre-order
  prompts.
- **Error `#EF4444` (Red 500):** payment failures, validation errors,
  destructive actions.
- **Ink `#1A1C1E` ≈ `text-highlighted`:** game titles, hero headlines,
  and the user-facing body of a game description.
- **Ink Muted `#52525B` ≈ `text-toned`:** eyebrow labels, developer +
  publisher names, footer, and the cart's running totals. Uses zinc-600
  for AA contrast (7.0:1) on `bg-muted`.
- **Ink Dim `#9CA3AF` ≈ `text-dimmed` / `text-muted`:** long-form
  description copy and lower-priority hints (release-date relative
  strings, "Out of stock").
- **Surface `#FFFFFF` ≈ `bg-default` / Surface Muted `#F4F4F5` ≈
  `bg-muted`:** game cards and the checkout summary render on default for
  contrast; hero panels and terminal-style blocks sit on muted.
- **Surface Ring `#E4E4E7` ≈ `ring-default`:** A 1px ring + tiny inset
  shadow gives cards a hairline definition without resorting to heavier
  borders.

In dark mode every neutral flips via the `--ui-text-*` / `--ui-bg-*`
variables; the green stays the green (just one shade lighter).

**Accessibility note.** `#699949` itself does not meet WCAG AA (4.5:1)
against white at body sizes — its contrast ratio is ~2.0:1. The catalog
respects this by using primary only as: a 6px dot, a Lucide icon glyph,
a pixel-letter accent word, or a price tag (which is large display type
and clears AA at 18px+). When you need a solid green CTA, step down to
`primaryDeep` (`#3f5d2e`, ~5.6:1) for the background and keep the label
white.

## Typography

Three faces, three jobs. All three are wired in `nuxt.config.ts` under
`fonts.families` and exposed as Tailwind utilities `font-sans`, `font-mono`,
and `font-pixel`.

- **Geist Sans (`font-sans`)** — body, headings, buttons, game titles.
  Body sits at `1rem` / `1.6` for paragraphs and `1.125rem` / `1.7` for the
  hero lede.
- **Geist Mono (`font-mono`)** — eyebrows, terminal mock lines, source
  chips, the logo mark, the cart's quantity steppers, and the footer
  caption. Always uppercase with `0.08em` tracking for labels; sentence
  case for terminal output and game metadata.
- **Geist Pixel (`font-pixel`)** — exactly one or two words per H1/H2
  ("Glitch", "play instantly", "bridge to your bank"). Inline only, never
  standalone, never in body copy. Apply with `font-pixel` on a `<span>`,
  not by setting the whole heading to pixel — that breaks the H1's
  readability.

Headlines use `tracking-[-0.02em]` and a tight `1.05` line-height so the
big H1s (up to `4.5rem`) read as a single block. Paragraphs default to a
relaxed `1.6–1.7` for legibility. `UButton` and `UBadge` labels inherit
sans at body weight; don't override the font family on button children.

## Layout & Spacing

A single max-width container (`UContainer`, ~`max-w-7xl`) wraps the
catalog, cart, and checkout shells, separated by `py-20` of vertical
rhythm. The catalog grid is a responsive 1–4 column layout (`grid
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`); the
hero is a two-column split (`lg:grid-cols-2 gap-14 lg:gap-20`); the
rest are single-column with a `max-w-2xl` intro block followed by a
content row.

- **Section gap:** 80px (`space-y-20`) between major blocks.
- **Container gap:** 56–80px (`gap-14 lg:gap-20`) inside the hero.
- **Card padding:** 24px (`p-6`) on info cards; game cards are
  zero-padded so the cover image fills the frame.
- **Eyebrow pill:** `px-3 py-1` (12px × 4px) — small enough to read as a
  label, large enough to feel deliberate.
- **Game grid gap:** 24px (`gap-6`) so cards breathe without crowding on
  `xl`.

Game cards never exceed four per row at the widest breakpoint. Cart chips
wrap with `flex-wrap gap-2` and a single `+` glyph separates the "Built
with" stack list.

## Elevation & Depth

Depth is implied, not painted. Cards combine a 1px `ring-1 ring-default`
border with a sub-pixel shadow (`0 1px 0 0 rgba(24,24,27,0.04)`) — enough
to lift them off the background without dark-mode artifacts. There are no
drop shadows, no gradients, no glows. The "WebBridge demo" panel uses two
stacked backgrounds (`bg-muted` for the chrome, `bg-default` for the body)
to create depth instead of a shadow.

Focus rings substitute for elevation on interactive surfaces: a primary
button gets `outline outline-primary/25` on `focus-visible`, an outline
button gets `outline outline-inverted/25`. Never paint focus with raw
green — it conflicts with the brand swatch.

## Shapes

The radius scale is governed by `--ui-radius` (Nuxt UI overrides Tailwind's
`rounded-*` with this single base). Always reach for `rounded-*` utilities
so the system can be retuned globally by editing one variable. At the
project default of `0.25rem` (4px):

| Utility        | Multiplier | px   |
| -------------- | ---------- | ---- |
| `rounded-xs`   | ×0.5       | 2    |
| `rounded-sm`   | ×1         | 4    |
| `rounded-md`   | ×1.5       | 6    |
| `rounded-lg`   | ×2         | 8    |
| `rounded-xl`   | ×3         | 12   |
| `rounded-2xl`  | ×4         | 16   |
| `rounded-3xl`  | ×6         | 24   |
| `rounded-full` | —          | 9999 |

- **`rounded-xl` (12px)** — every card: game cards, info cards, terminal
  mock, checkout summary.
- **`rounded-lg` (8px)** — every button (UButton's default at this base),
  and the cart's quantity stepper buttons.
- **`rounded-md` (6px)** — every input (search bar, checkout fields).
- **`rounded-full`** — every label: eyebrows, category chips, Metacritic
  pill, discount badge, pulsing status dots. Always true-circle, never
  derived from `--ui-radius`.

Avoid `rounded-2xl` and `rounded-3xl` on cards — they break the rhythm
against 8px buttons. Icons inside circular slots (the pulsing dot,
traffic-light row) use `size-1.5` / `size-2.5` — fractional sizes, never
exact integers, to keep the rhythm.

## Components

- **Eyebrow pill:** `bg-elevated` + `text-toned`, mono uppercase, optional
  leading icon in `text-primary`. Used on every section header, on the
  hero, and on the "WebBridge demo" banner. The hero variant
  (`eyebrow-pill`) sits on the default surface; the on-card variant
  (`eyebrow-pill-on-elevated`) sits one shade lighter than its container.
- **Card surface:** `bg-muted` + `ring-1 ring-default`, used for info
  cards and the terminal frame header. Padding `p-6`, radius `rounded-xl`.
- **Card ring:** `bg-default` + `ring ring-default`, used for the
  checkout summary so the totals read against pure white while still
  feeling framed. Internal rows split with `divide-y divide-default`.
- **Game card:** zero-padded `bg-default` + `ring ring-default`, with a
  `rounded-xl` 16:9 cover image (`aspect-video`), the title and
  developer in `text-highlighted` / `text-toned`, the price in
  `text-primary text-2xl font-semibold`, and a row of mono metadata
  (release date, platform tags) below. Hovering the card swaps
  `ring-default` for `ring-primary` and lifts the cover by 1px via a
  transform — never a box-shadow.
- **Price tag:** the headline price on every game card and inside the
  checkout summary, rendered in `text-primary text-2xl font-semibold`.
  When a discount applies, the original price appears next to it in
  `text-dimmed line-through` at body size.
- **Discount badge:** `bg-primary-deep` + white label, mono uppercase,
  `rounded-full px-2 py-0.5`, sits over the top-left corner of the cover
  image with a 12px offset.
- **Metacritic pill:** `bg-success` (or amber/red for lower scores) +
  white label, mono, sits over the top-right corner of the cover.
- **Terminal frame:** a three-row composite — `bg-muted` chrome with three
  traffic-light dots (`bg-primary/30 → /50 → /80`), `bg-default` body for
  the WebBridge mock transcript, `bg-muted` footer with a status line.
  Always mono, always sentence case.
- **Source chip:** `bg-elevated` + `ring-1 ring-default` + `text-toned`
  mono, prefixed by an `arrow-up-right` icon in `text-primary`. Lists
  platforms and tags inside a game detail page, never standalone.
- **Answer block:** `bg-default` + `ring ring-default` + `divide-y
divide-default`. Question row on the muted surface, answer row on
  default, source-chip row at the bottom.
- **Button primary:** `UButton` with default `color="primary"` (solid
  green, white label). Hover deepens to `bg-primary-deep` (Primary 700).
  Focus uses `outline-primary/25`. Lead with a Lucide icon at the
  `leading` slot. Used for "Add to cart", "Checkout", "Sign in".
- **Button outline:** `UButton color="neutral" variant="outline"` for
  secondary actions ("Browse catalog", "View cart"). Same
  `outline-inverted/25` focus rule.
- **Pixel accent word:** inline `<span>` swapping `font-pixel` + primary green
  for one word inside an otherwise sans-serif headline. Always inside the
  H1 or H2 — never inside a paragraph, badge, or button label.
- **Nav link:** `UNavigationMenu` with default `color="primary"` for the
  active item, neutral for the rest. The right-hand account button uses
  `variant="ghost"` and shows a `UBadge color="primary"` with the cart
  count when non-zero.

## Do's and Don'ts

**Do**

- Reach for Nuxt UI semantic utilities (`text-toned`, `bg-elevated`,
  `ring-default`) before writing raw colors. The token layer is the
  fallback, not the default.
- Keep one green accent per viewport. If a heading already uses a pixel
  accent word, the buttons next to it should be neutral.
- Use `font-mono` for any label the user reads as a _category_ (eyebrow,
  platform, status line, footer, quantity). Reserve sans for prose and
  titles.
- Pair every section header with an eyebrow pill — even short ones.
- Let the WebBridge terminal mock carry all of the "developer" flavor.
  Real catalog copy stays in clean sans.
- Wrap platform chips with `flex-wrap gap-2` so the list collapses on
  mobile instead of overflowing.
- Hover game cards with a `ring-primary` swap, never a `shadow-*`.

**Don't**

- Don't introduce a second saturated hue. If something feels like it
  wants red/blue/amber for non-status reasons, use `text-toned` instead —
  reserve amber/red for genuine success/warning/error.
- Don't override `--ui-radius` to retune a single card — pick a different
  `rounded-*` utility. The base variable is a global commitment.
- Don't use Geist Pixel outside of heading accents — it's a display face
  and loses readability past two words.
- Don't paint cards with shadows. The hairline ring + 1px inset shadow
  is the entire depth language.
- Don't use `rounded-2xl` or larger on cards. The page lives at
  `rounded-xl`; growing it breaks the rhythm against `rounded-lg`
  buttons and `rounded-md` inputs.
- Don't put accent text on a colored button — the contrast budget is
  already spent on the white label.
- Don't write a custom focus ring. Nuxt UI components already emit
  `outline-<color>/25` on `focus-visible`; custom surfaces should mirror
  the same pattern.
