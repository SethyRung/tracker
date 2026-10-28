# Placeholder room members

## Problem Statement

A room admin cannot record realistic shared bills until roommates create accounts and join. This delays tracking payers, splits, and balances, even when the admin already knows who the roommates are.

## Solution

Let an admin add placeholder members and use them immediately in room finances. Require a phone number when creating an account, without phone verification or phone-based authentication. When an account joins a room, link it to a placeholder only if its verified email and phone both match exactly one active, unlinked placeholder. Otherwise, create a separate membership and let an admin merge the duplicate later.

## User Stories

1. As a room admin, I want to add a roommate by name, so that I can start tracking expenses before they join.
2. As a room admin, I want to optionally provide the roommate's email, so that their account can later be matched.
3. As a room admin, I want to optionally provide the roommate's phone number, so that it can be used as an additional matching criterion.
4. As a room admin, I want an automatically assigned color, so that adding a roommate is quick.
5. As a room admin, I want to choose a color, so that I can distinguish roommates.
6. As a room member, I want placeholders labeled as not joined, so that I know who has access to the room.
7. As a room admin, I want to edit placeholder details, so that I can correct mistakes.
8. As a room admin, I want to remove a placeholder, so that the active member list stays accurate while its financial history remains available.
9. As a room member, I want to select a placeholder as a bill payer, so that I can record who paid.
10. As a room member, I want to include placeholders in a bill split, so that shares reflect the household.
11. As a room member, I want to use placeholders in recurring bills, so that future entries reflect the household.
12. As a room member, I want placeholders included in balances and settlement calculations, so that amounts owed are accurate.
13. As a new user, I want to provide a phone number during sign-up, so that the app can match me to a placeholder.
14. As a new user, I want my phone number validated, so that matching uses a consistent format.
15. As a new user, I want to sign up without a phone verification step, so that I can join without receiving an SMS.
16. As an existing user, I want to add or update my phone number in my profile, so that I can participate in matching.
17. As an existing user without a phone number, I want to keep using my account, so that the change does not lock me out.
18. As a room admin, I want to use the existing invite flow, so that I can invite someone after adding them as a placeholder.
19. As an invitee, I want my account linked to my matching placeholder when I join, so that my existing bills and balances stay connected to me.
20. As a room admin, I want automatic linking to require a verified matching email and matching phone number, so that a forwarded invite alone cannot claim a placeholder.
21. As an invitee without a match, I want to join as a new member, so that I can access the room without waiting for a merge.
22. As an invitee with an unverified email, I want to join without claiming a placeholder, so that unverified details do not trigger automatic linking.
23. As a room admin, I want ambiguous matches left unlinked, so that the wrong placeholder is not claimed.
24. As an existing room member, I want repeated joins to retain my membership, so that an invite does not create another membership or silently merge records.
25. As a room admin, I want to select a placeholder and a joined member to merge, so that I can resolve a failed match or duplicate.
26. As a room admin, I want to review both members and their balances before merging, so that I can verify the intended result.
27. As a room admin, I want to confirm a merge explicitly, so that a consequential change is not accidental.
28. As a room member, I want merged bills and balances to remain accurate, so that combining identities does not change the household's money.
29. As a room admin, I want the app to record who merged members, so that the change can be traced.
30. As a room member, I want only admins to create and merge placeholders, so that room membership is managed by authorized people.
31. As a room admin, I want a clear error when a merge cannot safely preserve history, so that I can avoid corrupting financial records.

## Implementation Decisions

- Model a placeholder as an active room membership with no linked user account. Keep a required room-local display name, optional contact email and phone, color, role, creation timestamp, and active lifecycle state. Default its role to member and its color using the existing assignment behavior. A missing account ID indicates not joined; it does not grant access.
- Allow admins to add, edit, and remove placeholders. Removal preserves records referenced by historical entries, consistent with the existing inactive-member lifecycle. Do not require a verified admin email merely to add a placeholder; existing invitation restrictions remain in force.
- Treat active placeholders as room members for payer selection, attendee splits, recurring templates, dashboards, and settlements. Preserve existing per-entry weights and separate USD and KHR ledgers.
- Add a required phone field to new email/password registrations, validate it on the server as well as the form, and store it as account profile data. Existing accounts may have no phone; allow them to add or update it without blocking existing access. Do not verify the phone or use it to authenticate.
- Normalize email and phone consistently on input and comparison. Use an unambiguous international phone representation; reject invalid or ambiguous input rather than guessing a country. A phone is an additional matching field, not evidence of ownership.
- Store placeholder contact details separately from account details. Limit their exposure to authorized room users, and avoid exposing them through public invite information.
- On accepting an existing room invite, check for an existing active membership first. If none exists, consider only active, unlinked placeholders in that room. Link the account to the existing membership only if its email is verified and both normalized email and phone match exactly one placeholder. Preserve its membership ID and existing financial references.
- If the account has no phone, email is unverified, either field is absent or mismatched, or more than one placeholder matches, create a normal separate membership. Do not auto-merge an existing membership or use name-only matching. Respect existing room-invite validation and access rules.
- Provide an admin-only merge flow between a placeholder and an account-linked membership in the same room. Show identities and balances before explicit confirmation. Keep the linked account's access and role; preserve both members' financial history and leave one active membership.
- Perform a merge atomically, including payer references, entry weights, recurring template payer and member snapshots, and all other membership references. Resolve duplicate split rows without losing weight or violating the 10,000-basis-point total. Preserve financial outcomes, including historical and closed-month balances and rounding; reject a merge if safe preservation cannot be guaranteed. Never merge USD and KHR amounts.
- Record the admin, source and destination memberships, and time of each merge. Prevent cross-room, already-merged, unauthorized, and concurrent conflicting merges.
- Keep account creation timestamps distinct from placeholder creation where needed; existing users must not be treated as newly created when linked. Preserve existing membership and invite behavior for users who do not use placeholders.

## Testing Decisions

- Test observable behavior and financial outcomes, not internal helper calls or database query construction. Prefer the highest existing seam: room API behavior for creation, invite acceptance, authorization, merging, and resulting bills and balances; authentication and profile interfaces for phone validation and persistence.
- Use existing unit API-handler tests and settlement tests as prior art; extend the established Vitest unit project. Use realistic persisted-data integration coverage where needed to verify atomicity, uniqueness, concurrency, and historical results rather than relying solely on mocks.
- Cover placeholders as payers and attendees, recurring entries, both currencies, removal with history, and access checks.
- Cover exact normalized matches, unverified email, missing phone or email, mismatches, multiple matches, inactive or already-linked placeholders, repeated joins, forwarded invites, and existing members.
- Cover merging members that appear together on an entry or recurring template, rounding-sensitive splits, closed months, payer references, existing balances, audit records, rejected invalid merges, and rollback on failure.
- Cover server-side required phone validation on sign-up, account profile updates, existing users without phones, and continued email/password authentication without phone verification.

## Out of Scope

- Phone verification, SMS delivery, phone-based login, and requiring existing users to add a phone before using the app.
- Automatically merging existing memberships, matching by name alone, or claiming a placeholder solely by possession of an invite link.
- Sending member-specific claim links, changing existing invitation permissions, currency conversion, and changing historical bill amounts.

## Further Notes

- A matching phone number is self-reported and does not prove ownership. Automatic linking depends on the account's verified email and the accuracy of the admin-entered placeholder email.
- Users with unverified email can still use the app and join rooms; their records can be merged manually by an admin. Verifying their email later does not silently merge an existing membership.
