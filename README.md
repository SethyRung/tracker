# Tricker

Multi-tenant household bill tracker. Each "room" is an independent household with its own members, categories, bills, payments, and ledger. Sign up, create or join a room, invite roommates, log bills and ad-hoc payments, split by per-entry attendees and shares, settle up at month-end with minimum-transfer suggestions.

USD and KHR tracked separately — two parallel ledgers, never converted.

Agent notes: [AGENTS.md](./AGENTS.md). Theme: [DESIGN.md](./DESIGN.md).

## Stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com) + Tailwind CSS v4
- [Better-Auth](https://better-auth.com) — email + password, sessions, email verification, password reset
- [Neon](https://neon.tech) serverless Postgres
- [NuxtHub](https://hub.nuxt.com) hosting
- [Zod](https://zod.dev) for validation
- [Vitest](https://vitest.dev) with [Nuxt test utils](https://nuxt.com/docs/getting-started/testing) (`unit` and `nuxt` projects)
- [oxlint](https://oxlint.rs) + [oxfmt](https://oxc.rs/docs/guide/format.html) for lint + format
- [Bun](https://bun.sh) package manager

## Quick Facts

- **Multi-tenant**: one user belongs to one room at a time. Each room is an independent household.
- **Money**: stored as `amount_minor` integer (BIGINT in Postgres). No floats. USD in cents, KHR no subunit.
- **Currencies**: USD `$1,234.56` · KHR `៛1,234,567`. Never converted; settled in two parallel ledgers.
- **Time**: stored UTC, displayed in `Asia/Phnom_Penh`.
- **Entry dates**: any historical date allowed.
- **Unified split model**: every entry uses the same split logic — pick attendees (default all) → set shares (default `100/N` equal). User-editable per entry.
- **Categories**: pure labels for filtering/reporting (Rent, Utilities, Food, Supplies pre-seeded). They do **not** carry split rules.
- **Month lifecycle**: open → admin-closes. Closed months lock edits and snapshot settlement.
- **Recurring bills**: templates auto-materialize as published entries on the 1st of each month (and immediately when a template is created mid-month).
- **Settlement**: minimum-transfer algorithm per (room, month, currency). Two side-by-side panels (USD + KHR).
- **Roles**: Admin + Member. Admin auto-succeeds to oldest active member on departure.
- **Splits**: an entry is split purely by the per-entry attendee weights. No tenure pro-rating.
- **Auth**: email + password with email verification (sent on sign-up but does not block login), password reset, 30-day sliding session cookies.
- **Out of scope (v1)**: audit log, notifications, data export, account deletion, receipts, multi-admin, currency conversion.

## Development

```bash
bun install
bun run dev          # http://localhost:3000
bun run test         # vitest (all projects)
bun run test:unit    # unit tests only
bun run test:nuxt    # nuxt-env tests
bun run typecheck    # nuxt typecheck
bun run lint         # oxlint
bun run fmt:check    # oxfmt --check
```

Requires Bun and a `DATABASE_URL` env var pointing at Neon.

## Repository Layout

```
app/         Nuxt 4 client (pages, layouts, components, composables)
server/      Nitro server (api routes, middleware, utils)
DESIGN.md    Theme spec (olive-green primary, Geist type, pixel-letter details)
AGENTS.md    Repo notes for AI agents
.agents/     Project-local Pi skills
```

See [AGENTS.md](./AGENTS.md) for gotchas and conventions (money as integer, Nuxt 4 compat flags, the build-time `hub:db` virtual-module gotcha, etc.).
