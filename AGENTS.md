# AGENTS.md — Tricker

Multi-tenant household bill tracker. Nuxt 4 (`app/` client, `server/` Nitro) + @nuxt/ui, Postgres (local Docker / Neon prod), Better-Auth, Drizzle via NuxtHub.

Theme: `DESIGN.md`. Do not change `future.compatibilityVersion: 4` or `compatibilityDate` in `nuxt.config.ts`.

## Setup

```bash
bun install
docker compose up -d postgres     # :5432
cp .env.example .env              # DATABASE_URL, NUXT_BETTER_AUTH_SECRET, Resend
bun run dev                       # http://localhost:3000
```

Bun required. `DATABASE_URL` + `DATABASE_DRIVER` feed `hub.db` in `nuxt.config.ts`. Local: `DATABASE_DRIVER=postgres-js`. Neon: `serverless`.

## Commands

```bash
bun run lint && bun run typecheck && bunx vitest run   # before push
bunx vitest run --project unit money                   # one file
bun run db:generate | db:migrate | db:drop             # NuxtHub CLI, not drizzle-kit directly
```

`bun run test` / `test:unit` / `test:nuxt` are **watch**. No `test:e2e` script. No CI.

Lint is oxlint (`typescript` + `vue`; `@typescript-eslint/no-explicit-any` is **off**). Format is oxfmt (2-space, semicolons, double quotes, trailing commas, printWidth 100).

## Layout agents get wrong

- Pages: `/rooms/[roomId]/...` (param **`roomId`**). API: `/api/rooms/[id]/...` (param **`id`**, use `getRoomId(event)`).
- Users can belong to **many** rooms. Logged-in `/` → `resolveRoomLanding` (exactly one room → that dashboard, else `/rooms`). `app/middleware/room.global.ts` only intercepts `/`. Create/join rooms from `/rooms` overlays — no onboarding flow.
- `shared/` = isomorphic pure helpers. `server/utils/` = db-backed. **No `shared/schemas/`** — Zod is inline in each API route and form.
- Room-scoped APIs: `requireRoomContext` / `requireRoomAdmin`. Return `createResponse` + `ApiResponseCode`, not raw bodies.

## Database

- No `drizzle.config.ts`. Schema: `server/db/schema.ts`. Migrations: `server/db/migrations/postgresql/` via `nuxt-hub db generate/migrate`.
- Prefer `import { db, schema } from "@nuxthub/db"`. Aliases `hub:db` / `hub:db:schema` exist; some older utils still use them.
- `hub.db.casing` and `auth.schema.casing` are `snake_case`. JS fields camelCase (`amountMinor`); SQL columns snake_case (`amount_minor`).
- Auth tables: `import { user } from "#auth/schema"`.
- **Build gotcha**: `@onmax/nuxt-better-auth` jiti-loads `server/auth.config.ts` during Nuxt module setup, before Nitro aliases exist. A static import of `hub:db` / `hub:db:schema` (or anything that pulls them in) fails `bun run build`. Dynamic-import inside request-time fns only.

## Domain

- **Money**: integer minor units. Never floats. Never convert USD↔KHR — two parallel ledgers. Drizzle/API: `amountMinor`. `shared/types/money.ts` uses `amount_minor`.
- **Weights**: integer bps, 10000 = 100%, must sum to 10000. Splits are per-entry `entry_weights` only — not membership `sharePercentBps`.
- **Time**: month keys and display in `Asia/Phnom_Penh`. Month key `YYYY-MM`.
- **Entries** are the unified bill/payment model (no payments table). Schema default is `draft`; create + materialize force `published`. Closed months reject writes (`assertMonthOpenForDate`).
- **Categories** `recurringType`: `unlimited` | `once` (one entry/month) | `recurring` (templates only on these; one template per category).
- **Recurring**: cron `0 17 * * *` = 00:00 ICT. Task no-ops unless ICT day-of-month is 1. Inserts **published** entries — helpers are named `*Draft*` but `status` is `"published"`. Creating an active template also materializes the current month.

## Auth & email

- Better-Auth via `@onmax/nuxt-better-auth`. Email+password; verification is sent on sign-up but `requireEmailVerification: false`. Config: `server/auth.config.ts` + `app/auth.config.ts`.
- Protect with `routeRules` (`auth: "guest"` vs `"user"`). `app/middleware/auth.global.ts` is a no-op — don't add new auth middleware files.
- Redirects: login/logout → `/sign-in`; authenticated/guest → `/`.
- Resend: if `NUXT_RESEND_API_KEY` is unset, `server/utils/email.ts` **warns and skips**. Do not assume send throws.

## Testing

- `unit`: `test/unit/*.{test,spec}.ts` (**not recursive**). `e2e`: `test/e2e/*` (no dir). `nuxt`: `test/nuxt/**` (no dir, 0 tests).
- The `nuxt` project aliases `bun:test` → `test/stubs/bun-test.ts`. Don't import `bun:test` in `unit`/`e2e`.

## Don't

- Float money or convert USD↔KHR.
- Add a dependency, or scaffold pages/API/tables outside existing scope, without asking.
- Write tests outside the vitest globs above.

Project skills: `.agents/skills/` (`nuxt-ui`, `nuxt-better-auth`, `agent-browser`).
