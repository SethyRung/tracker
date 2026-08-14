# AGENTS.md — Tricker

Multi-tenant household bill tracker. Nuxt 4 + @nuxt/ui SaaS, Postgres (Neon prod / local docker), Better-Auth, Drizzle via NuxtHub.

> **Source of truth order**: `SPEC.md` (what to build) > `DESIGN.md` (theme/colors/fonts) > `MOCKS.md` (UI wireframes) > `README.md` (intro).
> If this file disagrees with `SPEC.md`, the spec wins.

## Quick start

```bash
bun install
docker compose up -d postgres     # local Postgres on :5432
cp .env.example .env               # then edit DATABASE_URL / auth secret / Resend keys
bun run dev                        # http://localhost:3000
```

Requires Bun. `DATABASE_URL` + `DATABASE_DRIVER` env vars are read by NuxtHub's `hub.db` (see `nuxt.config.ts`). `DATABASE_DRIVER=postgres-js` for local/Postgres, `serverless` for Neon.

## Commands

```bash
bun run dev              # dev server
bun run build            # production build
bun run preview          # preview built app
bun run typecheck        # nuxt typecheck (vue-tsc)
bun run lint             # oxlint
bun run lint:fix         # oxlint --fix
bun run fmt              # oxfmt (write)
bun run fmt:check        # oxfmt --check
bun run test             # vitest (all projects)
bun run test:unit        # vitest --project unit
bun run test:nuxt        # vitest --project nuxt (Nuxt env, bun:test stubbed)
bun run db:generate      # nuxt-hub db generate  — make new migration from schema
bun run db:migrate       # nuxt-hub db migrate   — apply migrations
bun run db:drop          # nuxt-hub db drop      — drop tables
```

Suggested order before pushing: `lint -> typecheck -> test`.

## Repo layout

```
app/            Nuxt 4 client (pages, layouts, components, composables, middleware, assets)
  middleware/   auth.global.ts (no-op stub — real auth is via routeRules) + room.global.ts (redirect / and /dashboard to onboarding if no room)
  app.config.ts UI theme: primary="primary", neutral="zinc"
server/         Nitro server
  api/rooms/    All app routes scoped under /api/rooms/[id]/... (multi-tenant)
  db/           schema.ts (Drizzle pg tables) + migrations/postgresql/ (generated SQL + meta)
  tasks/recurring/materialize.ts   nitro scheduled task
  utils/        db-backed helpers (room, month, settle, recurring, email, response)
shared/         Code imported by BOTH client and server
  schemas/      Zod schemas (drizzle-zod) — single source of validation
  types/        money, weight, response, member-color
  utils/        pure helpers (date, settle, recurring, invite-token, admin-succession)
public/fonts/   Geist + custom Geist Pixel font faces (loaded in main.css)
SPEC.md         Authoritative product spec
DESIGN.md       Theme spec (olive-green primary, Geist type, pixel-letter details)
MOCKS.md        ASCII UI wireframes
```

Nuxt 4 with `future.compatibilityVersion: 4` and `compatibilityDate: "2026-08-01"` — keep using `app/` for client code, `server/` for Nitro.

## Database (Drizzle + NuxtHub)

- No `drizzle.config.ts`. Migrations are managed by the **NuxtHub CLI** (`nuxt-hub db generate/migrate/drop`), wired through `hub.db` in `nuxt.config.ts`. Output lands in `server/db/migrations/postgresql/`.
- Access the client in server code via the virtual import `import { db } from "hub:db"` and tables via `import { rooms, ... } from "hub:db:schema"`. Schema source is `server/db/schema.ts`.
- `hub.db.casing: "snake_case"` and `auth.schema.casing: "snake_case"` — DB columns are snake_case; Drizzle maps them. Keep new columns snake_case in SQL.
- Auth tables come from Better-Auth (`import { user } from "#auth/schema"` in schema.ts).

## Conventions

- **Money**: `amount_minor` as **integer** (BIGINT in Postgres). USD in cents, KHR no subunit. Never floats, never convert between currencies — two parallel ledgers. See `shared/types/money.ts`.
- **Weights**: stored as **basis points** (`weight_bps` / `share_percent_bps`, 10000 = 100.00%). See `shared/types/weight.ts` and `SPEC.md §2`.
- **Time**: UTC stored, displayed in `Asia/Phnom_Penh`. Entry dates may be any historical date.
- **Validation**: Zod everywhere — server (`server/api/**`) and client. Schemas live in `shared/schemas/` (drizzle-zod) and are the single source of truth. Don't hand-roll validation in routes.
- **Multi-tenant**: every API route is under `/api/rooms/[id]/...`. Always scope queries by room id + the caller's membership.
- **Formatting**: oxfmt — 2-space, LF, semicolons, double quotes, trailing comma all, printWidth 100. See `oxfmt.config.ts`.
- **Linting**: oxlint with `typescript` + `vue` plugins. `@typescript-eslint/no-explicit-any` is **off** by design.

## Auth & routing

- Better-Auth via `@onmax/nuxt-better-auth`. Email + password, **mandatory email verification**, password reset, 30-day sliding sessions.
- Route protection is **declarative** in `nuxt.config.ts` `routeRules`: `auth: "guest"` (sign-in/up/forgot/reset) vs `auth: "user"` (dashboard, month, bills, payments, members, categories, recurring, settle, onboarding). Don't add per-page middleware guards — use routeRules.
- Auth redirects configured in `nuxt.config.ts` `auth.redirects` (login→`/sign-in`, authenticated→`/dashboard`, etc.).
- `app/middleware/room.global.ts` redirects logged-in users with no room to `/onboarding/room`.

## Email (Resend)

- `server/utils/email.ts` reads `runtimeConfig.resend.apiKey` / `fromEmail` (`NUXT_RESEND_API_KEY`, `NUXT_RESEND_FROM_EMAIL`). If the API key is unset it **logs a warning and silently skips** sending — do not assume email throws. Verify delivery manually in dev.

## Recurring bills

- Templates auto-materialize as published entries on the 1st of each month via the nitro scheduled task `recurring:materialize`, configured in `nuxt.config.ts` `scheduledTasks` at `0 17 * * *` (daily 17:00 UTC). Templates also materialize immediately when created mid-month (`server/tasks/recurring/materialize.ts`, `server/utils/recurring.ts`).

## Testing

- Three vitest projects: `unit` (node env, `test/unit/*`), `e2e` (node env, `test/e2e/*` — **no tests or `test:e2e` script yet**), and `nuxt` (Nuxt env, `test/nuxt/**`, `@nuxt/test-utils`).
- The `nuxt` project aliases `bun:test` and `bun:test/mock` to `test/stubs/bun-test.ts` so tests written against bun's test API run under Vitest. Don't import `bun:test` in `unit`/`e2e` projects.
- Run a single test file: `bunx vitest run test/unit/money.test.ts` or `bunx vitest run --project unit money`.

## Known gaps

- **No CI** — no `.github/workflows/`.
- **No `test:e2e` script** and no e2e tests, despite the `e2e` vitest project being configured.
- **No `test/nuxt/**` tests exist yet** — `bun run test:nuxt` is wired but runs 0 tests. Only `test/unit/*` has tests.
- **`shared/schemas/` has no test coverage for some schemas** — most unit tests cover `shared/utils/` + `shared/types/`.

## Available skills

- `nuxt-ui` — building UIs with @nuxt/ui components
- `nuxt-better-auth` — Better-Auth integration in Nuxt (client composables, server helpers, route protection)
- `agent-browser` — browser automation / E2E flows

See `.agents/skills/` (project-local). Use the `pi-subagents` user skill to delegate work.

## Don't

- Don't introduce float money anywhere. Use `amount_minor` (integer).
- Don't convert between USD and KHR — they are parallel ledgers.
- Don't add a new dep without checking if it's needed for the SPEC.
- Don't scaffold pages, API routes, or DB tables not in `SPEC.md §13–14` without asking.
- Don't change the Nuxt 4 compat flags in `nuxt.config.ts`.
- Don't write tests under a path not covered by `vitest.config.ts` — they won't run.
- Don't add per-page auth middleware — use `routeRules` in `nuxt.config.ts`.
