# Tricker — Specification

Multi-tenant household bill tracker. Each "room" is an independent household with its own members, categories, bills, payments, and ledger. Users sign up, create or join a room, log shared expenses, and settle up at month-end.

This spec supersedes any partial decisions in `README.md` (notably: dates, month lifecycle, settlement model).

---

## 1. Stack

- **App**: Nuxt 4 + `@nuxt/ui` + Tailwind v4 (Vite plugin)
- **Auth**: Better-Auth (email + password, session cookies)
- **DB**: Neon serverless Postgres
- **Hosting**: NuxtHub
- **Validation**: Zod everywhere (server + client)
- **Package manager**: Bun
- **Tests**: Vitest (unit + nuxt projects)
- **Lint/Format**: oxlint + oxfmt

## 2. Money & Currency

- All amounts stored as **integers in minor units** (`amount_minor`). No floats. No JS `Number` for money.
- Two currencies supported per room: **USD** (cents) and **KHR** (riel, no subunit).
- Display:
  - USD: `$1,234.56`
  - KHR: `៛1,234,567`
- **No conversion** between USD and KHR. They live in two parallel ledgers.
- Settlement produces two independent settlement plans per month — one for USD, one for KHR — each with its own minimum-transfer graph.

## 3. Time & Dates

- All timestamps stored as **UTC**.
- All user-facing times rendered in **Asia/Phnom_Penh** (UTC+7, no DST).
- **Entry dates**: any historical date is allowed. No "today/yesterday only" restriction. The constraint in README is superseded.
- Months are calendar months in Phnom Penh time. "August 2026" = 2026-08-01T00:00:00+07:00 → 2026-09-01T00:00:00+07:00.

## 4. Tenancy & Identity

- **One user belongs to at most one room at a time.** A user can leave a room and join another (their old memberships remain visible in history but the account is deactivated in that room).
- A user is identified by email (Better-Auth account).
- Within a room, a user has a **Member** record (their membership in this room).
- A user can hold only one membership at a time globally.

## 4b. Authentication

**Better-Auth** is the authentication framework. It manages user accounts, sessions, password hashing, and email verification.

### Methods (v1)

- **Email + password** — primary method
- **No social login** in v1 (Google/Apple deferred)

### Email verification

- Required on sign-up
- Better-Auth sends a verification email with a one-time link
- Unverified users can sign in but see a banner: "Verify your email to invite members"
- Verification token expires in 24h

### Password reset

- Forgot-password flow: user enters email → Better-Auth sends reset link → user sets new password
- Reset token expires in 1h, single-use
- Reset emails sent via the same transport as verification emails

### Sessions

- HTTP-only, Secure, SameSite=Lax cookies
- Session lifetime: 30 days, sliding (extends on activity)
- Logout clears the session cookie and invalidates the server-side session

### Server integration

- Better-Auth mounted at `/api/auth/*` via a Nuxt server handler
- Uses the same Neon Postgres DB as the rest of the app
- Better-Auth manages these tables: `user`, `session`, `account`, `verification`

### Client integration

- `@better-auth/vue` (or equivalent) on the Nuxt client
- Auth state exposed via `useAuth()` composable
- Server middleware redirects unauthenticated users to `/sign-in?redirect=...`
- Server middleware redirects users with no room to `/onboarding/room`

### Routes requiring auth

All routes except `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` require a valid session.

## 5. Roles & Permissions

- **Admin**: creator of the room. Can invite/remove members, edit room settings, manage categories, edit/delete any bill or payment, and **close months**.
- **Member**: can log bills and payments (own or others'), edit their own entries, and view the full room ledger.
- **Admin succession**: if the only admin leaves/is removed, the **oldest active member** (by `joined_at`) is auto-promoted to admin. Multiple admins not allowed.

## 6. Member Profile

- `display_name` (required, e.g., "Sethyrung")
- `nickname` (optional, e.g., "Seth")
- `avatar` (optional — uploaded image or auto-generated initial-avatar fallback)
- `share_percent` (decimal 0–100, e.g., 22.0 for 22%; **informational only**, not used to compute entry splits)
- `color` (auto-assigned hex from a fixed palette; editable)
- `joined_at` (timestamp; set on join, used for pro-rating and admin succession)
- `left_at` (nullable; set on removal/departure for pro-rating cutoff)

## 7. Categories

**Categories are pure labels** for grouping and filtering. They do NOT carry split rules — all categories share the same split logic. Each category carries a **recurring type** that says how (or whether) entries in that category repeat and interact with the per-month limit:

- `unlimited` — standalone; entries are logged one-off as needed, any number per month.
- `once` — **at most one entry per month** in this category (server-enforced on POST; the existing entry is editable). The amount is provided by the user on each entry.
- `recurring` — a `RecurringTemplate` exists for this category (Phase 7): the system auto-creates a **draft** entry each month with a stored default amount; your admin reviews and tweaks the amount before publishing.

Pre-seeded on room creation (admin can rename/add/remove; recurring type is editable):

- **Rent** — `recurring`
- **Utilities** — `once`
- **Food** — `unlimited`
- **Supplies** — `unlimited`

Categories can be freely renamed, added, or deleted. The split logic (§7b) is uniform across all categories.

## 7b. Split Logic (uniform across all entries)

Every entry follows the same split model.

### Step 1 — Attendees

- User selects which members attended / participated in this entry
- Default: all active members checked
- At least one attendee required

### Step 2 — Shares

- Each selected attendee gets a weight in basis points (`weight_bps`, 10000 = 100.00%)
- Default: `10000 / N` for each selected attendee (equal split among attendees)
- **Weights are user-editable per entry** — user can override any weight
- Editing one weight does NOT auto-redistribute the others; user is responsible for the total reaching 10000
- Sum must equal 10000 across attendees (validated client + server); save is disabled otherwise

### Pro-rating

- Applies to all entries uniformly
- `effective_weight = entry_weight * (effective_days / days_in_month)` where `effective_days` is days the member was active during the entry's month
- Rounding remainder is assigned to the longest-tenured member at the time of the entry

## 8. Entries

Household expenses live in a single `entries` table. There is no bill/payment `type` — every entry is just an entry, with `amount_minor`, `currency`, `date` (datetime), `category_id`, `paid_by_membership_id`, `notes`, `attendees` + `weights`, `created_by`, `created_at`, `updated_at`, plus `status` and `template_id`. (An earlier revision split bills and payments into a `type` field; the distinction duplicated ~90% of the columns/routes/forms for no modeling gain, so it was dropped — see DECISIONS.md.)

### User entries

- A member logs a shared expense (rent, utilities, groceries, household items, …) and it is **created `published`** — instant, no draft step.
- `attendees` + `weights` per attendee; defaults to all active members with profile `share_percent`; the creator (or an admin) can override.
- One entry form covers everything. An entry carries **no recurring flag** — recurrence is a property of the chosen **category** (§7), not the entry.

### Recurring drafts (Phase 7)

- Recurring is a property of the **category** (`recurring_type`), not the entry. The category recurring type is `unlimited | once | recurring` (§7):
  - `unlimited` — no auto-draft; entries are logged manually, any number per month.
  - `once` — no auto-draft; a once-per-month limit is enforced at entry POST (you log the single monthly entry manually; the server blocks a second). Edits to the existing entry are allowed.
  - `recurring` — a `RecurringTemplate` exists for this category, holding `currency`, `day_of_month` (when drafts materialize), the **member snapshot** (which members are included), and the default `amount_minor` (editable before publishing).
- On the 1st of each month (Phnom Penh time), a scheduled task creates **draft** entries from every active `recurring` template. Admin reviews and **publishes** each (or edits amount/weights/attendees before publishing). Drafts are not counted in settlement until published.
- `template_id` links a materialized draft back to its template. Per-month overrides (amount / attendees / weights) are saved on the entry only — they do not propagate back to the template or to other drafts.

### Lifecycle & permissions

- `entries.status`: `draft` | `published`. User entries are created `published`; drafts come only from recurring-template materialization.
- **Edit / delete rules**:
  - `published`: creator or admin.
  - `draft`: admin only (drafts are template materializations up for review).
- **Publish** (`POST /entries/:id/publish`): admin only, drafts only. A published entry is immutable for amount/attendees/weights unless an admin edits (audit-free change; see §15 Out of Scope).

### Weights

`entry_weights (entry_id, membership_id, weight_bps)` — integer basis points (2500 = 25.00%); sum per entry must equal 10000; absent rows mean the member was not an attendee.

## 9. Month Lifecycle

- Each month is either **open** or **closed**.
- **Open**: any active member can add/edit/delete their own entries. Admin can edit/delete any entry.
- **Closed** (admin action): no further edits or deletes. Settlement is locked.
- **Auto-creation**: drafts materialize on the 1st at 00:00 Phnom Penh time.
- **Settlement view** is always available (live balance recalc) regardless of open/closed.
- **Re-opening**: admin can re-open a closed month (rare; e.g., dispute resolution). Re-closing re-takes the snapshot.

## 10. Settlement

Computed per (room, month, currency). Produces two independent settlement plans per month — one for USD, one for KHR.

### Inputs per entry

- `amount_minor`, `currency`
- `paid_by_member_id` (who actually paid)
- `category` (label only, no split rule)
- `date` (for pro-rating)
- `attendees[]` and `weights[]` (per-entry, may override profile share_percent)

### Per-member owed amount

For each entry, compute each attendee's owed using their entry weight (after pro-rating). Then:

```
balance[m] = sum(paid_by[m]) − sum(owed[m])
```

`balance[m] > 0` means m is owed money; `< 0` means m owes money.

### Minimum-transfer algorithm

Compute the minimum number of transfers to settle all non-zero balances:

1. Split members into creditors (`balance > 0`) and debtors (`balance < 0`).
2. Greedy match largest creditor with largest debtor, transfer `min(creditor, |debtor|)`, repeat.
3. Result: a list of `{from, to, amount_minor}` transfers per currency, per month.

This produces ≤ N−1 transfers where N is the count of non-zero balances (typical case).

Settlement is shown side-by-side for both currencies in the UI.

## 11. Pro-rating

When a member joins or leaves mid-month, their weight on every entry in that month is pro-rated by day.

- Effective days = days the member was active during the entry's month, inclusive of both endpoints.
- `effective_weight = entry_weight * (effective_days / days_in_month)`
- Sum of `effective_weight` across members may not equal `entry_weight` exactly due to rounding. Any rounding remainder is assigned to the longest-tenured member of the room at the time of the entry.
- If a member is NOT in the entry's attendee list, they get nothing (pro-rating is moot).

## 12. First-Run UX

1. User signs up (email + password) → lands on empty dashboard with "Create a room" CTA.
2. Creates a room with name + currency (USD, KHR, or both — default both).
3. Room is auto-seeded with the 4 default categories (Rent, Utilities, Food, Supplies).
4. Admin invites members by link (each link is single-use, expires in 7 days).
5. Invitee opens link → if signed in, joins immediately; if not, prompted to sign up then joins.
6. Admin (or members) edits members to set `share_percent` (required for Rent; defaults to equal for others).
7. Admin (optionally) creates recurring bill templates (Rent already has a suggested starter).
8. Members start logging bills and payments. The next month's draft auto-materializes on the 1st.

No historical backfill. The room starts on its creation date; past months are not represented.

## 13. Routes (high-level)

- `/` — landing / auth state
- `/sign-in`, `/sign-up`
- `/dashboard` — current month view (entries, balances, drafts-to-publish)
- `/month/[yyyy-mm]` — historical month view (read-only when closed)
- `/entries/new` — log a bill or payment (`?type=bill|payment` preselects and locks the type)
- `/entries/[id]/edit`
- `/members` — list, invite, remove
- `/categories` — list, edit, add, remove
- `/recurring` — recurring templates list
- `/settle/[yyyy-mm]` — settlement plan (USD + KHR side-by-side)

## 14. Data Model (sketch)

```
users               (id, email, password_hash, created_at)
                    — Better-Auth managed

rooms               (id, name, created_by_user_id, created_at,
                     usd_enabled, khr_enabled)

room_memberships    (id, room_id, user_id, role, display_name,
                     nickname, avatar_url, color, share_percent,
                     joined_at, left_at NULL, is_active)

categories          (id, room_id, name, sort_order,
                     recurring_type 'unlimited'|'once'|'recurring',
                     created_at)
                     -- pure labels; no split rule columns.
                     -- recurring_type:
                     --   'unlimited' = multiple entries/month (manual)
                     --   'once'      = one entry/month max (server-enforced)
                     --   'recurring' = auto-draft monthly with default amount
                     -- default 'unlimited'

recurring_templates (id, room_id, category_id, currency,
                     amount_minor, day_of_month, is_active)
                     -- one per category with recurring_type = 'recurring';
                     -- amount_minor is the stored default (editable before
                     -- publishing). Categories with 'once' are guarded at
                     -- entry POST and don't need a template; 'unlimited' is
                     -- manual.

entries              (id, room_id, category_id, currency, amount_minor,
                     date, paid_by_membership_id, notes,
                     status 'draft'|'published', template_id NULL,
                     created_by, created_at, updated_at)
                     -- no bill/payment `type`; user entries are created
                     -- `published`, drafts come only from recurring templates

entry_weights       (entry_id, membership_id, weight_bps)
                     -- weight_bps is integer basis points (2500 = 25.00%);
                     -- sum per entry must equal 10000;
                     -- absent rows mean the member was not an attendee
                     -- (replaces the former bills/bill_weights and
                     --  payments/payment_weights tables)

month_snapshots     (id, room_id, yyyymm, status 'open'|'closed',
                     closed_at NULL, closed_by NULL)
```

Money columns use `BIGINT` (Postgres) since `amount_minor` can exceed `INT4` for KHR.

## 14b. API Response Format

Every server endpoint returns a single envelope so the client can branch on `status.code` without parsing `e.message`. The wire format is shared between server and client (defined in `shared/types/response.ts` and emitted by `server/utils/response.ts`).

```ts
{
  status: {
    code: ApiResponseCode;          // "SUCCESS" | "NOT_FOUND" | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_REQUEST" | "INTERNAL_ERROR"
    message: string;                 // human-readable, may be empty on success
    requestId: string;                // crypto.randomUUID() per request, for log correlation
    requestTime: number;              // Date.now() per request
  };
  data: T | null;                     // null on error; T extends any for endpoint-specific shapes
  meta?: {                            // present on paginated list endpoints
    total: number;
    limit: number;
    offset: number;
  };
}
```

### Codes

Every endpoint declares one of these status codes. The client uses `isSuccessResponse(res)` to narrow. Each code has a documented client-side intent:

| Code               | Meaning                                                                                           | HTTP status field |
| ------------------ | ------------------------------------------------------------------------------------------------- | ----------------- |
| `SUCCESS`          | The request succeeded; `data` is the resource shape (or array for list endpoints).                | 200               |
| `NOT_FOUND`        | The requested resource doesn't exist (or the user can't see it).                                  | 404               |
| `VALIDATION_ERROR` | The request body failed Zod validation. The client should show the message as a form-level error. | 422               |
| `UNAUTHORIZED`     | No valid session. Client should redirect to sign-in.                                              | 401               |
| `FORBIDDEN`        | The user is signed in but lacks the role/permission for this room.                                | 403               |
| `INVALID_REQUEST`  | Missing required params, bad query string, etc.                                                   | 400               |
| `INTERNAL_ERROR`   | Server-side bug. Client should show a generic error and offer retry.                              | 500               |

### Conventions

- **Errors never use HTTP 200**. The wire code is the source of truth (`status.code`), not the HTTP status. (Some endpoints may still set HTTP 200 for symmetry; status.code is what the client reads.)
- **Validation errors surface at the form level** (`useToast` or top-of-form alert) — not as per-field errors. Per-field validation is handled by Nuxt UI's built-in Zod schema on the client.
- **`requestId`** is included on every response for log correlation. The server logs include the same `requestId` so a support request can be traced end-to-end.
- **Timestamps in `data` are ISO 8601 strings** (e.g. `createdAt: "2026-08-08T13:45:58.774Z"`). The client parses with `new Date(...)`.
- **Currency-typed money fields** are integers in `amount_minor` (USD cents or KHR riel). The wire format never includes floats.

### Examples

```ts
// Success — single resource
return {
  status: { code: "SUCCESS", message: "", requestId: "...", requestTime: 1723123456789 },
  data: { id: "abc", name: "Seth's Place", ... },
};

// Success — list with pagination
return {
  status: { code: "SUCCESS", message: "", requestId: "...", requestTime: ... },
  data: [{ id: "bill-1", ... }, { id: "bill-2", ... }],
  meta: { total: 42, limit: 20, offset: 0 },
};

// Validation error
return {
  status: { code: "VALIDATION_ERROR", message: "Amount must be greater than 0", requestId: "...", requestTime: ... },
  data: null,
};

// Not found
return {
  status: { code: "NOT_FOUND", message: "Room not found", requestId: "...", requestTime: ... },
  data: null,
};
```

## 15. Out of Scope (deferred)

These were discussed and explicitly deferred. Do not implement in v1.

- Audit log (no edit history, no "who changed what")
- Notifications (no email digest, no push, no in-app feed)
- Data export (CSV/PDF)
- Account deletion / GDPR
- Receipt photo attachments
- Multi-admin rooms
- Search/filter across months
- Mobile app (web is responsive; no native)
- Per-member audit of closed-month reopens
- Currency conversion display

## 16. Validation Rules (Zod, server-enforced)

- `amount_minor > 0` (no zero/negative)
- `currency ∈ {'USD', 'KHR'}`
- `date` ∈ valid range (no future dates allowed, but any past date)
- `share_percent` per member: 0–100, sum across active members in the room must equal 100 (validated on member create/update)
- For each entry: at least one attendee required; attendees must be active members
- For each entry: weights (sum of `weight_bps`) must equal 10000 across attendees
- An entry's `category_id` must belong to the same room as the entry
- For an entry in a `recurring_type = 'once'` category: at most one entry per (ICT) month in that category — a second `POST` is rejected with `INVALID_REQUEST` ("only one entry per month — edit the existing entry instead")

---

**Document version**: 1.0 — produced from /grilling session
**Supersedes**: README.md sections on month closure, date entry restriction
