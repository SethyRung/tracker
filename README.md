# Tricker

Shared household bill tracker. Multi-tenant SaaS — sign up, create a household, invite roommates, log bills, split by weighted shares per category. USD and KHR tracked separately, never converted.

Full spec: [SPEC.md](./SPEC.md).

## Stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com) + Tailwind CSS
- [Better-Auth](https://better-auth.com) (email + password)
- [Neon](https://neon.tech) serverless Postgres
- [NuxtHub](https://hub.nuxt.com) hosting

## Development

```bash
bun install
bun run dev          # http://localhost:3000
bun run test
bun run lint
bun run fmt
```

Requires [Bun](https://bun.sh) and a `DATABASE_URL` pointing at Neon.

## Notes

- Money is stored as `amount_minor` integers. No floats, no currency conversion.
- All times in UTC, displayed in `Asia/Phnom_Penh`.
- Entry dates: today or yesterday only.
- No month closure, no audit log, no export, no notifications — see SPEC §21 for deferred decisions.
