# Tricker — UI Mocks

ASCII wireframes for v1 screens. Mobile-first design with bottom nav.

Layout decisions baked in:

- **Navigation**: Mobile-first bottom nav (4 tabs, center "Add" FAB)
- **Dashboard top**: Balances summary (USD + KHR)
- **Settlement**: Side-by-side panels (desktop), stacked (mobile)
- **Entry form**: Dedicated page route (`/bills/new`, `/payments/new`)
- **Invite**: Dedicated page (`/members/invite`) — both email-invite and copy-link
- **Onboarding**: Multi-step wizard (`/onboarding/room`)
- **Auth**: Sign-in / sign-up (no accept/decline page; invitees land in dashboard after sign-up)

---

## 0. Global Chrome (applies to every screen)

```
┌──────────────────────────────────┐
│  ☰  Tricker            ⋮        │  ← Minimal top bar; hamburger opens menu
├──────────────────────────────────┤
│                                  │
│        [ screen content ]        │
│                                  │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
│  Home     Add    People  Settle  │  ← Bottom nav, center "Add" emphasized
└──────────────────────────────────┘
```

Top-bar hamburger menu (when expanded):

```
┌──────────────────────┐
│  Room: My Place   ▾  │  ← Switch room (future)
├──────────────────────┤
│  🏠  Dashboard       │
│  📋  Entries         │
│  🔁  Recurring       │
│  🏷  Categories      │
│  🚪  Leave room      │
│  ↪  Sign out         │
└──────────────────────┘
```

---

## 1. Dashboard (current month)

```
┌──────────────────────────────────┐
│  ☰  Tricker                    │
│      August 2026  · Open    ⋮  │
├──────────────────────────────────┤
│  Balances this month            │
│  ┌─────────┐ ┌─────────┐        │
│  │  USD    │ │  KHR    │        │
│  ├─────────┤ ├─────────┤        │
│  │🟢Seth   │ │🟢Seth   │        │
│  │   +$45  │ │  +៛12K  │        │
│  │🟣Ly     │ │🟣Ly     │        │
│  │   -$30  │ │   -៛8K  │        │
│  │🔵Pich   │ │🔵Pich   │        │
│  │   -$15  │ │  -៛4K   │        │
│  │🟠Rith   │ │         │        │
│  │    $0   │ │         │        │
│  └─────────┘ └─────────┘        │
│                                  │
│  ⚠ 2 drafts to publish          │  ← Banner (admin only)
│  ┌──────────────────────────┐   │
│  │ Rent · $180 · Sep 1      │   │
│  │ Water · $8 · Sep 3       │   │
│  └──────────────────────────┘   │
│  [ Review drafts → ]             │
│                                  │
│  Recent                          │
│  ┌──────────────────────────┐   │
│  │ Aug 14 · Food            │   │
│  │ Morning groceries        │   │
│  │ $12.50  paid by Seth     │   │
│  │ split: Seth, Ly          │   │
│  ├──────────────────────────┤   │
│  │ Aug 12 · Utilities       │   │
│  │ Water bill               │   │
│  │ $8.00  paid by Pich      │   │
│  │ split: all (equal)       │   │
│  ├──────────────────────────┤   │
│  │ Aug  1 · Rent            │   │
│  │ Monthly rent             │   │
│  │ $180  paid by Seth       │   │
│  │ split: 22/22/28/28 %     │   │
│  └──────────────────────────┘   │
│  [ See all → ]                   │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

**States**:

- Closed month: status pill reads `Closed`, balances panel shows "Settlement locked" message
- No drafts: banner is hidden entirely
- No balances yet (fresh room): "No activity yet — log your first bill to see balances"

---

## 2. New Entry Form (dedicated page)

Route: `/bills/new` or `/payments/new`. Type toggle at top swaps behavior.

```
┌──────────────────────────────────┐
│  ←  New Bill                Save │  ← "Save" disabled until valid
├──────────────────────────────────┤
│                                  │
│  Type                            │
│  ┌─────────┐ ┌─────────────┐    │
│  │  Bill   │ │  Payment    │    │
│  └─────────┘ └─────────────┘    │
│                                  │
│  Amount *                        │
│  ┌──────────────────────┐        │
│  │ 12.50       [ USD ▾] │        │
│  └──────────────────────┘        │
│                                  │
│  Description *                   │
│  ┌──────────────────────┐        │
│  │ Morning groceries    │        │
│  └──────────────────────┘        │
│                                  │
│  Date *                          │
│  ┌──────────────────────┐        │
│  │ 2026-08-14           │        │
│  └──────────────────────┘        │
│                                  │
│  Category *                      │
│  ┌──────┐ ┌──────────┐           │
│  │ Rent │ │ Utilities│           │
│  ├──────┤ ├──────────┤           │
│  │ Food │ │ Supplies │           │
│  └──────┘ └──────────┘           │
│                                  │
│  Paid by *                       │
│  ┌──────────────────────┐        │
│  │ 🟢 Seth           ▾  │        │
│  └──────────────────────┘        │
│                                  │
│                                  │
│  Attendees *                     │
│  ┌──────┐ ┌──────┐ ┌──────┐      │
│  │✓ Seth│ │✓ Ly  │ │ Pich │      │
│  └──────┘ └──────┘ └──────┘      │
│  ┌──────┐                        │
│  │ Rith │                        │
│  └──────┘                        │
│                                  │
│  Shares percent                  │  ← One row per SELECTED attendee
│  ┌──────────────────────────┐    │
│  │ 🟢 Seth      [ 25.00 ] % │    │
│  │ 🟣 Ly        [ 25.00 ] % │    │
│  │ 🔵 Pich      [ 25.00 ] % │    │
│  │ 🟠 Rith      [ 25.00 ] % │    │
│  └──────────────────────────┘    │
│  Total: 100.00% ✓                │
│  [ Reset to equal ]              │
│                                  │
│  Notes (optional)                │
│  ┌──────────────────────┐        │
│  │ Bought at Phsar...   │        │
│  └──────────────────────┘        │
│                                  │
│  Recurring?                      │  ← Only when Type=Bill
│  ┌──────────────────────┐        │
│  │ ( ) One-time         │        │
│  │ (●) Recurring monthly│        │
│  └──────────────────────┘        │
│  Day of month: [ 1 ▾ ]           │
│                                  │
│  ┌────────────────────────┐      │
│  │       Save Bill        │      │  ← CTA, disabled until valid
│  └────────────────────────┘      │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

**Attendees section**:

- Multi-select chips, one per active member
- Default: all active members checked
- At least one attendee required

**Shares percent section**:

- One row per selected attendee, each with an **editable** weight input
- Default value for each input: `100 / N` (where N = currently selected attendees)
- User can edit any weight freely; sum must equal 100.00% (validated live)
- Editing one weight does NOT auto-redistribute the others — other weights stay as-is. User is responsible for making the total add up to 100.
- If total ≠ 100, the Total row turns red ⚠, shows the current sum, and the **Save** button is disabled until corrected
- If user unchecks an attendee in the top section, that row disappears from this section

**"Reset to equal"** button: re-checks all members and sets each weight back to `100 / N`.

**Conditional fields** (only outside the Split block):

- Type = Bill → show Recurring toggle + Day of month
- Type = Payment → hide Recurring section
- Currency dropdown → shows only enabled currencies for the room

**Recurring + per-month behavior**:

- Each month's draft for a recurring template **re-pre-fills with all currently active members checked and `100 / N` shares**.
- Member additions/removals auto-adjust future drafts (new drafts include/exclude them).
- Per-month overrides on attendees and weights are saved on the published entry only — they don't propagate back to the template or to other drafts.

**Validation messages** (inline):

- "Amount must be greater than 0"
- "Description is required"
- "Date cannot be in the future"
- "At least one attendee required"
- "Shares must total 100.00% (currently 95.00%)"
- "Share must be a number between 0 and 100"
- "Each attendee must have a non-empty share"

---

## 3. Members List

Route: `/members`. Slim list view; the invite flow lives on its own dedicated page (§7).

```
┌──────────────────────────────────┐
│  ←  Members       + Invite      │
├──────────────────────────────────┤
│                                  │
│  4 members · Shares: 100% ✓      │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 🟢 Seth                  │    │
│  │   "Seth"  ·  Admin       │    │
│  │   seth@…  ·  22%   ⋮     │    │
│  ├──────────────────────────┤    │
│  │ 🟣 Ly                    │    │
│  │   "Ly"                   │    │
│  │   ly@…    ·  22%   ⋮     │    │
│  ├──────────────────────────┤    │
│  │ 🔵 Pich                  │    │
│  │   "Pich"                 │    │
│  │   pich@…  ·  28%   ⋮     │    │
│  ├──────────────────────────┤    │
│  │ 🟠 Rith                  │    │
│  │   "Rith"                 │    │
│  │   rith@…  ·  28%   ⋮     │    │
│  └──────────────────────────┘    │
│                                  │
│  Active invites: 2               │
│  → Manage on Invite page         │
│                                  │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

**Notes**:

- Tapping a member row opens the member detail sheet (§4).
- The `+ Invite` button at top right (and the "Active invites: 2 →" link) both navigate to `/members/invite` (§7).
- "Shares: 100% ✓" pill turns red ⚠ if shares don't sum to 100%.

---

## 4. Member Detail (tap member row → sheet)

```
┌──────────────────────────────────┐
│  ←  Seth                       │
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐    │
│  │        🟢                │    │  ← Avatar (upload or auto)
│  │       Seth               │    │
│  │      "Seth"              │    │
│  │      Admin              │    │
│  └──────────────────────────┘    │
│                                  │
│  Display name                    │
│  [ Seth                       ]  │
│                                  │
│  Nickname                        │
│  [ Seth                       ]  │
│                                  │
│  Avatar                          │
│  [ Choose file ]  [ Reset ]      │
│                                  │
│  Color                           │
│  🟢🟣🔵🟠🟡🔴  ← palette chips   │
│                                  │
│  Share %                         │
│  [ 22 ]  (of 100% total)         │
│                                  │
│  Joined Aug 1, 2026              │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │  Cancel  │ │    Save     │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

### Remove member confirmation (admin action)

```
┌──────────────────────────────────┐
│  Remove Bouy?                ✕  │
├──────────────────────────────────┤
│                                  │
│  Bouy will be pro-rated out of   │
│  August 2026. They'll keep      │
│  access to past months but the   │
│  account will be deactivated in  │
│  this room.                      │
│                                  │
│  Pro-rated share: 14/31 days     │
│  = 45% of August activity.       │
│                                  │
│  ⚠ Past months are NOT changed. │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │  Cancel  │ │    Remove   │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

---

## 5. Settlement View

Route: `/settle/2026-08`. Side-by-side panels.

```
┌──────────────────────────────────┐
│  ←  August 2026 · Open     Close │  ← Admin "Close" if open; absent for member
├──────────────────────────────────┤
│  ┌─────────── USD ────────────┐  │
│  │ Balances                  │  │
│  │                           │  │
│  │ 🟢 Seth       +$45.00    │  │
│  │ 🟣 Ly         -$30.00    │  │
│  │ 🔵 Pich       -$10.00    │  │
│  │ 🟠 Rith        -$5.00    │  │
│  │                           │  │
│  │ ─────────────────         │  │
│  │ Suggested transfers       │  │
│  │ (minimum to settle)       │  │
│  │                           │  │
│  │ Ly   → Seth  $30.00       │  │
│  │ Pich → Seth  $10.00       │  │
│  │ Rith → Seth   $5.00       │  │
│  │                           │  │
│  │ 3 transfers               │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌─────────── KHR ────────────┐  │
│  │ Balances                  │  │
│  │                           │  │
│  │ 🟢 Seth      +៛12,500    │  │
│  │ 🟣 Ly        -៛8,000     │  │
│  │ 🔵 Pich      -៛4,500     │  │
│  │                           │  │
│  │ ─────────────────         │  │
│  │ Suggested transfers       │  │
│  │                           │  │
│  │ Ly   → Seth  ៛8,000       │  │
│  │ Pich → Seth  ៛4,500       │  │
│  │                           │  │
│  │ 2 transfers               │  │
│  └───────────────────────────┘  │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

**States**:

- Empty currency (no activity): panel shows "No USD activity this month"
- All settled (zero balances): panel shows "✓ Everyone is settled up"
- Closed month: balances shown with `(locked)` badge; transfers read-only

### "Close month" confirmation (admin)

```
┌──────────────────────────────────┐
│  Close August 2026?          ✕  │
├──────────────────────────────────┤
│                                  │
│  After closing:                  │
│  • No edits or deletions         │
│  • Settlement is locked          │
│  • You can re-open later if      │
│    needed                        │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │  Cancel  │ │ Close month │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

---

## 6. Recurring Templates

Route: `/recurring`. List of templates with status (drafted this month / not).

```
┌──────────────────────────────────┐
│  ←  Recurring                  │
├──────────────────────────────────┤
│                                  │
│  Active templates (3)            │
│                                  │
│  ┌──────────────────────────┐    │
│  │ Rent                     │    │
│  │ $180 USD · day 1 · ⋮    │    │
│  ├──────────────────────────┤    │
│  │ Water                    │    │
│  │ $8 USD · day 3 · ⋮      │    │
│  ├──────────────────────────┤    │
│  │ Internet                 │    │
│  │ $15 USD · day 10 · ⋮    │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌────────────────────────┐      │
│  │   + New template        │      │
│  └────────────────────────┘      │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

---

## 7. Invite Member (dedicated page)

Route: `/members/invite`. Two methods side by side — email-invite (formal) and copy-link (fast, for WhatsApp/Telegram).

```
┌──────────────────────────────────┐
│  ←  Invite member              │
├──────────────────────────────────┤
│                                  │
│  Send an invite email            │
│  The invitee gets a one-time     │
│  link valid for 7 days.          │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Email                      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Display name               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────┐      │
│  │     Send email         │      │
│  └────────────────────────┘      │
│                                  │
│  ────────────  or  ────────────  │
│                                  │
│  Copy a share link               │
│  Send this link via WhatsApp,    │
│  Telegram, or any chat. Anyone   │
│  with the link can join.         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ https://tricker.app/r/    │  │
│  │ k7Qp2m              📋   │  │
│  └────────────────────────────┘  │
│  Expires in 7d · 1 use · 0 joins │
│                                  │
│  ┌────────────────────────┐      │
│  │   Generate new link    │      │
│  └────────────────────────┘      │
│                                  │
│  Pending invites (2)             │
│  ┌──────────────────────────┐    │
│  │ ✉ bouy@…                │    │
│  │   Bouy  ·  expires 5d   │    │
│  │   [resend]    [revoke]  │    │
│  ├──────────────────────────┤    │
│  │ 🔗 Share link           │    │
│  │   0 joins ·  expires 7d  │    │
│  │   [revoke]              │    │
│  └──────────────────────────┘    │
│                                  │
├──────────────────────────────────┤
│   🏠       ➕        👥     💰   │
└──────────────────────────────────┘
```

**Behavior**:

- Email-invite creates a row in `pending_invites` with the email and a one-time token; sending the email is best-effort (still creates the invite row even if email fails).
- Share-link is regenerated on demand; old link is invalidated when a new one is generated.
- "Resend" resends the email with the same token (token doesn't rotate).
- "Revoke" invalidates the invite (email or link).
- When the invitee opens either link, they land on the room dashboard after signing in. If they don't have an account, they're routed through `/sign-up?redirect=/r/<token>` (§9).

---

## 8. Onboarding Wizard (room creation)

Route: `/onboarding/room`. Triggered immediately after sign-up (when the new user has no room yet). Four steps with a progress indicator.

### Step 1 — Room name

```
┌──────────────────────────────────┐
│  ●─○─○─○  Step 1 of 4          │
├──────────────────────────────────┤
│                                  │
│  Welcome, Seth                   │
│                                  │
│  Let's set up your room.         │
│                                  │
│  What do you call your home?     │
│                                  │
│  ┌────────────────────────────┐  │
│  │ e.g., Seth's place        │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │   Back   │ │  Continue → │    │  ← Back disabled on step 1
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

### Step 2 — Currencies

```
┌──────────────────────────────────┐
│  ●─●─○─○  Step 2 of 4          │
├──────────────────────────────────┤
│                                  │
│  Which currencies do you use?    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ ☑ USD                    │    │
│  │   American Dollar        │    │
│  ├──────────────────────────┤    │
│  │ ☑ KHR                    │    │
│  │   Cambodian Riel         │    │
│  └──────────────────────────┘    │
│                                  │
│  At least one required.          │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │   Back   │ │  Continue → │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

### Step 3 — Invite first members (optional)

```
┌──────────────────────────────────┐
│  ●─●─●─○  Step 3 of 4          │
├──────────────────────────────────┤
│                                  │
│  Invite your housemates          │
│  (you can do this later)         │
│                                  │
│  Send via email                  │
│  ┌────────────────────────────┐  │
│  │ Email                     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Display name              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────┐      │
│  │   + Add another         │      │
│  └────────────────────────┘      │
│                                  │
│  Pending invites:                │
│  • Ly <ly@…>           [remove]  │
│  • Pich <pich@…>        [remove]  │
│                                  │
│  ────────  or  ────────          │
│                                  │
│  Copy a single share link:       │
│  ┌────────────────────────────┐  │
│  │ https://tricker.app/r/    │  │
│  │ k7Qp2m            📋     │  │
│  └────────────────────────────┘  │
│  Expires in 7d · 1 use           │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │   Skip   │ │  Continue → │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

### Step 4 — Review

```
┌──────────────────────────────────┐
│  ●─●─●─●  Step 4 of 4          │
├──────────────────────────────────┤
│                                  │
│  Review your room                │
│                                  │
│  Name          Seth's Place      │
│  Currencies    USD, KHR          │
│  Categories    Rent · Utilities  │
│                Food · Supplies   │
│  Invited       2 (Ly, Pich)      │
│  Share link    Active            │
│                                  │
│  ┌──────────┐ ┌─────────────┐    │
│  │   Back   │ │ Create room │    │
│  └──────────┘ └─────────────┘    │
└──────────────────────────────────┘
```

After clicking **Create room** → land in dashboard with a toast: `Welcome to Seth's Place!`

---

## 9. Auth (Sign-in / Sign-up)

Route: `/sign-up`, `/sign-in`. Invitees land here when opening an invite link without a session; they're redirected back via `?redirect=...`.

### Sign-up

```
┌──────────────────────────────────┐
│         Tricker                  │
├──────────────────────────────────┤
│                                  │
│  Create your account             │
│                                  │
│  Email *                         │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  Password *                      │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│  ≥ 8 characters                  │
│                                  │
│  ┌────────────────────────┐      │
│  │      Sign up           │      │
│  └────────────────────────┘      │
│                                  │
│  Already have an account?        │
│  → Sign in                       │
│                                  │
└──────────────────────────────────┘
```

### Sign-in

```
┌──────────────────────────────────┐
│         Tricker                  │
├──────────────────────────────────┤
│                                  │
│  Welcome back                    │
│                                  │
│  Email *                         │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  Password *                      │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────┐      │
│  │      Sign in           │      │
│  └────────────────────────┘      │
│                                  │
│  No account? → Sign up           │
│                                  │
└──────────────────────────────────┘
```

**Invitee redirect flow**:

1. User clicks `https://tricker.app/r/k7Qp2m`
2. Not signed in → server redirects to `/sign-up?redirect=/r/k7Qp2m` (or `/sign-in` if they have an account)
3. After successful auth, server validates the invite token, creates the membership, and redirects to `/dashboard`
4. A toast appears: `Welcome to Seth's Place!`

**States**:

- Wrong password / unknown email: inline error "Invalid email or password"
- Email already registered (sign-up): "An account with this email already exists. Sign in instead."
- Invite token expired: `?redirect` is dropped; user lands on `/` and sees "This invite link is no longer valid."

### Forgot password

```
┌──────────────────────────────────┐
│  ←  Reset password              │
├──────────────────────────────────┤
│                                  │
│  Forgot your password?           │
│  Enter your email and we'll      │
│  send a reset link.              │
│                                  │
│  Email *                         │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────┐      │
│  │   Send reset link      │      │
│  └────────────────────────┘      │
│                                  │
│  ← Back to sign in               │
│                                  │
└──────────────────────────────────┘
```

### Reset password (from email link)

```
┌──────────────────────────────────┐
│         Tricker                  │
├──────────────────────────────────┤
│                                  │
│  Choose a new password           │
│                                  │
│  New password *                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│  ≥ 8 characters                  │
│                                  │
│  Confirm password *              │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────┐      │
│  │   Set new password     │      │
│  └────────────────────────┘      │
│                                  │
└──────────────────────────────────┘
```

### Email verification (post sign-up banner)

Top-of-dashboard banner for unverified users:

```
┌──────────────────────────────────┐
│  ⚠  Verify your email to invite  │
│     members. [Resend link]  ✕    │
└──────────────────────────────────┘
```

After clicking the email link, Better-Auth redirects to `/api/auth/verify-email?token=...` which marks the user verified and redirects back to `/dashboard` with a toast: `Email verified ✓`.

---

## Notes for implementation

- **Bottom nav active state**: filled icon + accent color
- **Center "+ Add"**: visually heavier (FAB-style with shadow), opens a tiny chooser:
  ```
  ┌──────────────┐
  │  + Bill      │
  │  + Payment   │
  │  ✕ Cancel    │
  └──────────────┘
  ```
  Selecting a route goes to `/bills/new` or `/payments/new`
- **Color palette for member chips**: `#10b981` `#a855f7` `#3b82f6` `#f97316` `#eab308` `#ef4444` `#ec4899` `#14b8a6` (Tailwind-ish)
- **Currency formatting**: USD `$1,234.56`, KHR `៛1,234,567` (no decimals)
- **Status pill colors**: Open = blue, Closed = gray
- **Avatar fallback**: first letter of `display_name` on member color background
- **Progress indicator** (on wizard): 4 dots, filled = done, hollow = pending, ring around current
- **Copy-link button**: tap → copies to clipboard → briefly shows "Copied!" inline
- **Invite token format**: 8-char base62 (`k7Qp2m`) — easy to type, hard to guess
