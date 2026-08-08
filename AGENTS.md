# AGENTS.md — Tricker

Multi-tenant household bill tracker. Nuxt 4 + @nuxt/ui SaaS, Neon Postgres, Better-Auth.

> **Source of truth order**: `SPEC.md` (what to build) > `DECISIONS.md` (why) > `MOCKS.md` (how it looks) > `README.md` (intro).
> If this file disagrees with `SPEC.md`, the spec wins.

## Quick start

```bash
bun install
bun run dev              # http://localhost:3000
```

Requires Bun and a `DATABASE_URL` env var (Neon Postgres). No `.env.example` yet — create one with `DATABASE_URL=postgres://...`.

## Commands

```bash
bun run dev          # dev server
bun run build        # production build
bun run preview      # preview built app
bun run typecheck    # nuxt typecheck
bun run lint         # oxlint
bun run lint:fix     # oxlint --fix
bun run fmt          # oxfmt (write)
bun run fmt:check    # oxfmt --check (CI)
bun run test         # vitest run (all projects)
bun run test:unit    # unit project only
bun run test:nuxt    # nuxt project only (uses bun:test stub)
```

## Repo layout

```
app/            Nuxt 4 app dir (pages, layouts, components, composables, assets)
  pages/        Currently ONE placeholder: index.vue = <div></div>
  app.vue       Root with <UApp><NuxtLayout><NuxtPage/></NuxtLayout></UApp>
  error.vue     Uses @nuxt/ui UError
server/         Nitro server (api/, routes/, utils/, middleware/)
public/         Static assets
SPEC.md         Authoritative product spec
DECISIONS.md    Grilling session decisions + rationale
MOCKS.md        ASCII UI wireframes
```

Nuxt 4 with `future.compatibilityVersion: 4` and `compatibilityDate: "2026-08-01"` — keep using `app/` for client code, `server/` for Nitro.

## Conventions

- **Money**: `amount_minor` as **integer** (no floats). USD in cents, KHR no subunit. Weights stored as **basis points** (`weight_bps`, 10000 = 100.00%). See `SPEC.md §2`.
- **Time**: UTC stored, displayed in `Asia/Phnom_Penh`.
- **Validation**: Zod everywhere — server (`server/api/**`) and client.
- **Formatting**: oxfmt — 2-space, LF, semicolons, double quotes, trailing comma all, printWidth 100. See `oxfmt.config.ts` ignore list.
- **Linting**: oxlint with `typescript` and `vue` plugins. `@typescript-eslint/no-explicit-any` is **off** by design.

## Known gaps / gotchas

- **`test/` directory does not exist** yet. `vitest.config.ts` references `test/unit/`, `test/e2e/`, `test/nuxt/`, and `test/stubs/bun-test.ts`. Create these before adding tests.
- **Test project mismatch**: `vitest.config.ts` defines `unit`, `e2e`, AND `nuxt` projects; `package.json` only has scripts for `unit` and `nuxt`. There's no `test:e2e` script yet.
- **bun:test stub**: the `nuxt` vitest project aliases `bun:test` and `bun:test/mock` to `./test/stubs/bun-test.ts` so tests using bun's test API run under Vitest in the Nuxt environment.
- **Better-Auth not installed** — `SPEC.md §4b` calls for it but it is not in `package.json`. Install before implementing auth.
- **No DB schema/migrations** — Postgres tables from `SPEC.md §14` are not yet scaffolded. Plan a migrations story (Drizzle? Kysely? raw SQL?) before adding data models.
- **No CI** — no `.github/workflows/` directory.
- **No `.env.example`** despite `.gitignore` reserving one.
- **Only `app/pages/index.vue` exists** as a placeholder (`<div></div>`). All other routes from `SPEC.md §13` need to be created.

## Available skills

- `nuxt-ui` — use when building UIs with @nuxt/ui components
- `agent-browser` — for browser automation / E2E flows

See `.agents/skills/` (project-local) or `/home/sethyrung/.agents/skills/` (user-level).

## Subagents

This repo has `.agents/skills/` for project-local Pi skills. Use `pi-subagents` (user skill) to delegate work — see available agents with `subagent` tool's `list` action.

## Don't

- Don't introduce float money anywhere. Use `amount_minor` (integer).
- Don't add a new dep without checking if it's needed for the SPEC.
- Don't scaffold pages, API routes, or DB tables not in `SPEC.md §13–14` without asking.
- Don't change the Nuxt 4 compat flags in `nuxt.config.ts`.
- Don't write tests under a path not covered by `vitest.config.ts` — they won't run.
