# CodeForge — Decision Log

Why things are built the way they are. Milestones 1–10 (the backend, judge, and
deployment groundwork) are recorded in [`../CLAUDE.md`](../CLAUDE.md); this file covers
the **UI rebuild** driven by `CodeForge_UIUX_Implementation_Guide.md`, following that
document's build order (§14) rather than working through it top to bottom.

Each entry states the decision, the alternative rejected, and the reason. Anything
deliberately *not* built is listed under "Deferred" at the end, rather than quietly
omitted.

---

## Ground rules held throughout

- **No fake data.** Every number rendered comes from an API call. Where a metric cannot
  be computed honestly, the endpoint returns `null` and the UI shows a dash with an
  explanation — it never approximates and presents the result as fact.
- **New dependencies stay minimal.** The only runtime packages added during the rebuild
  are `monaco-editor` and `@monaco-editor/react`. Icons are hand-rolled SVGs; fonts load
  via a `<link>`.
- **Security properties from the judge carry into the UI.** Hidden test data is never
  fetched by public endpoints, admin routes are guarded server-side, and per-user data is
  authorised per request.

---

## Step 1 — Design system

**Colour tokens are CSS custom properties holding RGB triplets** (`--c-accent: 99 102 241`),
consumed by Tailwind as `rgb(var(--c-accent) / <alpha-value>)`.
*Rejected:* hex values in the Tailwind config. That works until you need a light theme or
an opacity modifier — triplets give both from a single definition.

**The surface token is named `canvas`, not `base`.**
A Tailwind colour key called `base` emits a `.text-base` rule that collides with
Tailwind's built-in font-size utility of the same name. Both rules apply, so a button
using `text-base` for sizing silently also picked up a near-black text colour. Renaming
the token removed the whole class of bug.

**The difficulty palette was computed, not chosen by eye.**
Easy/Medium/Hard are green/amber/red per the guide (§0.2). Run through a contrast/CVD
validator against the dark surface, the obvious values failed: too light for the dark
background, and green↔amber only ΔE 5.7 apart under protanopia. The shipped triad
(`#12a877` / `#cf8a09` / `#e5484d`) scores contrast ≥ 3:1, normal-vision separation
ΔE 16.2, worst CVD pair ΔE 7.6.

That last figure sits in a band that is only acceptable **with secondary encoding**, which
is why every difficulty indicator in the product also carries its text label. Difficulty is
never conveyed by colour alone.

**Activity intensity uses an indigo ramp, not green.**
A green heatmap would collide with "green = Easy" and could be misread as difficulty.

---

## Step 4 — Problems page

**Added `Problem.createdAt`.** The guide's *default* sort is "Recent" and the column
simply did not exist, so the default view was impossible to implement.

**Bookmarks are a join table with a composite primary key** `(userId, problemId)`.
The database makes a duplicate bookmark unrepresentable; no application-level guard needed.

**`OptionalJwtAuthGuard` — public, but personalised.**
`GET /problems` must work signed-out yet return per-user solved/bookmarked flags when a
token is present. The guard admits requests with *no* credentials, but a request that
*does* present an `Authorization` header must present a valid one.
*Rejected:* silently treating a bad token as anonymous. A user with an expired session
would then see a logged-out page with no explanation of why their data vanished.

**Selecting two topics means AND, not OR.** Filtering to "dynamic-programming" +
"binary-search" returns problems carrying both. Narrowing filters that widen results is
the more surprising behaviour.

**Sorting is split between database and memory, deliberately.** `recent` / `title` /
`difficulty` sort and paginate in Postgres. `acceptance` and `solves` rank on aggregates
living in the `Submission` table that Prisma cannot `ORDER BY` directly, so those two sort
in memory over the filtered set. The split is commented at the call site so the asymmetry
isn't mistaken for an oversight.

**Facet counts respect the active search** but not the active facet filters — otherwise
ticking "Arrays" would drive every other topic's count to zero and make the filter panel
unusable.

**The URL is the single source of truth for list state.** Filters, sort, search, and page
live in the query string, so a view is shareable and survives refresh and the back button.

---

## Step 5 — Solve page

**Monaco is bundled locally, not loaded from its default CDN.**
`@monaco-editor/react` fetches Monaco from jsDelivr unless told otherwise. That would
break under the strict CSP planned for deployment, and offline development with it.

*Gotcha worth recording:* `monaco-editor` 0.56 ships an `exports` map that rewrites
`monaco-editor/*` → `esm/vs/*`, so the widely-documented worker path
(`monaco-editor/esm/vs/editor/editor.worker?worker`) fails to resolve. The correct
specifier omits the prefix and keeps the extension:
`monaco-editor/editor/editor.worker.js?worker`.

**Code drafts are keyed `(userId, problemId, language)` in `localStorage`.**
Two accounts sharing a browser never see each other's work in progress.
*Rejected for now:* server-side drafts — more moving parts for a feature that only needs to
survive a refresh. Noted as a possible upgrade.

**Editorials are gated, and reading one is recorded.**
`GET /problem/:id` returns a `hasEditorial` boolean but never the text. Reading requires an
explicit call to `GET /problem/:id/editorial`, which writes an `EditorialView` row **before**
returning the content. This is what makes the "solved without help" XP bonus measurable
rather than assumed.

Admins receive the editorial text inline on the detail route for the edit form, bypassing
the gate — otherwise authoring a walkthrough would log the author as having read it.

---

## Step 6 — Gamification

**XP is an append-only ledger, never a counter on the user row.**
A user's XP is always `SUM(amount)` over their `XpEntry` rows, keeping every award
auditable, replayable, and debuggable.

**Idempotency is enforced by the database, not by application logic.**
Each award carries a `dedupeKey` (`solve:<problemId>`, `login:2026-08-09`) under a
`@@unique([userId, dedupeKey])` index. A unique violation is caught and treated as
"already awarded".
*Rejected:* read-then-write ("has this been granted yet?"). Two judge workers finishing
the same submission concurrently could both read "no" and both insert. The constraint makes
the double-award physically impossible rather than merely unlikely.

**An XP failure never fails the judge job.** The verdict is already written when XP is
awarded; letting an XP error bubble would retry the whole judging run — recompiling and
re-executing untrusted code — over a bookkeeping problem. Failures are logged instead.

**Skill XP per topic is derived, not stored.** Computed from solved problems and their
tags on read, so it cannot drift out of sync with the ledger.

**Streaks are derived from submission dates**, and a streak whose last activity was
*yesterday* still counts. Otherwise every user's streak would read as broken until the
moment they submitted something on a given day.

**Tuning values live in a `GamificationConfig` key/value table** with code-level defaults,
so an admin can change XP amounts and level thresholds without a migration or a deploy
(guide §6.7).

---

## Step 7 — Progress page

**One migration was hand-written.** Prisma refuses to run `migrate dev` non-interactively
when adding a unique constraint. The SQL was written manually and applied with
`migrate deploy`. Safe because `username` is nullable and Postgres treats NULLs as
distinct, so no existing row could conflict; `migrate status` confirms zero drift.

**Usernames are auto-assigned and backfilled on first read**, slugified from the display
name with a numeric suffix on collision — accounts created before handles existed get one
transparently.

**Metrics that cannot be measured honestly return `null`.**
- *Avg. time to solve* is explicitly labelled **first attempt → accepted**. We do not track
  reading or thinking time, and a label implying otherwise would be a lie.
- *Runtime percentile* returns `null` when no other user has an accepted solution to
  compare against, rather than reporting a meaningless "100th percentile".

**Viewing your own profile does not increment your view counter.**

---

## Step 8 — Leaderboard

**Ranking switched from solve count to total XP** (guide §6.6). The difference is real, not
cosmetic: in verification, a user with **one Hard solve (220 XP) correctly outranked** a
user with **three Easy solves (130 XP)**. The previous implementation ranked those
backwards, treating a trivial solve as equal to a hard one.

Ties break on problems solved → hard problems solved → name, so ordering is deterministic
rather than dependent on database row order.

**Users with zero XP are omitted** rather than listed with a zero — including users who
have submitted but never had anything accepted.

**Streaks are computed only for rows actually being displayed** (plus the viewer's own
pinned row). Streak calculation needs a per-user query, and running it for every ranked
user to render 25 rows would be wasteful.

**The viewer's row is pinned below the table when they fall outside the current page**, so
a user on page 40 can still see where they stand.

**`/u/:username` was built in this step, not deferred.** The leaderboard links to public
profiles, and shipping a page full of links to a route that does not exist is worse than
building the route.

---

## Step 9 — Supporting pages

**Notifications are generated by real events, not seeded.** The judge raises one on every
verdict; the gamification service raises them on badge awards and level crossings. Level-up
detection compares total XP before and after an award rather than storing a "current level"
field that could drift.

**Notification writes never throw.** They are a side effect of judging and XP awards; a
notification failure must not roll back the verdict that actually mattered. The service
catches and logs instead.

**Per-type preferences are honoured at write time**, not at read time — if a user disables
verdict notifications, the row is never created. Verified: with the preference off, a fresh
submission produced no new notification.

**Mutations are scoped by `userId` in the `where` clause**, not checked after fetching. One
user attempting to mark another's notification read gets a 404, and never learns whether the
id exists.

**Preferences rows are created lazily on first read**, so existing accounts needed no
backfill migration.

**Password change and account deletion both re-verify the password.** An authenticated
session alone is not sufficient to change credentials or destroy an account — a stolen open
tab should not be enough.

**Account deletion refuses when the account authored problems.** Cascading would delete
those problems and, with them, every other user's submissions against them. The error names
the count and asks for reassignment rather than silently destroying other people's history.

**Preferences save on toggle, with optimistic UI and rollback on failure.** A settings
toggle that needs a separate Save button is a reliable source of lost changes.

---

## Step 10 — Homepage CMS

**Nothing on the homepage is a literal in the React tree.** Every string, card, review,
logo, and link is a database row (guide §3: "Do not hardcode any of it"). Editing the
hero headline through the API changes what the page serves — verified, not assumed.

**Placeholder content installs itself on first read, not only via the seed.** A fresh
database serves a complete homepage without anyone remembering to run `db:seed`.
*The race this creates is handled by the primary key, not a check:* two visitors
arriving simultaneously on a cold database both try to create the singleton, the loser
catches the unique violation and re-reads. Child rows are only written by the winner, so
a race cannot produce ten course cards.

**The seed never overwrites existing homepage rows.** Re-running `db:seed` after an
admin has rewritten the hero copy must not silently revert their work, so each
collection is skipped entirely when it already has rows. Both paths — cold install and
no-op re-run — were exercised against the real database.

**One shared fetch for the page and the footer.** The footer renders on every route and
reads the same document, so the payload lives in a provider at the app root rather than
being refetched on each navigation.

**Copy that repeats gets a table; copy that is one-of-a-kind gets the singleton.**
Course cards, reviews, companies, and links are rows an admin can add and reorder.
Hero/contact/footer prose is a single `HomeContent` row — a five-table schema for text
that exists once would be ceremony without benefit.

**`heroHighlight` is stored as its own column, not as markup inside the headline.**
An admin highlights a word by naming it, rather than by typing HTML into a text field
that would then have to be trusted and rendered. If the word isn't found in the
headline, the page renders the headline unhighlighted instead of breaking.

**The newsletter endpoint answers identically whether or not the address is already
subscribed.** Distinct "subscribed" / "already subscribed" responses would make a public
unauthenticated endpoint into an "is this person registered here?" oracle. It also
carries a much tighter rate limit (10/min vs the global 100/min) because it is an
unauthenticated write.
*Rejected:* returning 409 on a duplicate. Signing up twice is not a user error.

**Unsubscribing stamps a timestamp instead of deleting the row**, so a resubscribe is
distinguishable from a first-time signup.

**Admin mutations are audit-logged** (guide §11), via a global `AuditService` written
now rather than retrofitted in step 12. Logging happens *after* the write succeeds, so
the trail records what changed rather than what was attempted — verified: four
successful mutations produced four entries, and the rejected 404/400 attempts produced
none. Audit writes never throw, for the same reason notification writes never throw.

**Company logos render as wordmarks when no image is uploaded.** Seeding real
third-party trademarks into the repository is not something to do casually, and a
missing-image placeholder would look broken. Logo *upload* is deferred with avatar
upload — same missing object storage.

**`/about`, `/privacy`, and `/terms` are routed but deliberately empty.** The footer
columns the guide specifies point at them, and a dead link is worse than an honest
"not written yet" page — but generating plausible-looking Terms of Service or a Privacy
Policy would be considerably worse than either.

**Two rendering bugs were caught by inspecting the compiled CSS, not the source.**
`h-4.5` and `bg-accent/12` are both plausible-looking Tailwind classes that the compiler
silently emits nothing for — 4.5 is not in the spacing scale and 12 is not in the opacity
scale. The affected icons would have rendered at zero size and the tiles with no
background. Checking that every utility the page depends on actually appears in
`dist/assets/*.css` is now part of verifying a UI step.

---

## Step 11 — Resources

**Hybrid content, as agreed.** 20 curated outbound links to material that is genuinely
free to read without an account, plus 3 reference sheets written for CodeForge and
stored as markdown. We link to other people's work; we never copy it.

**A resource has exactly one of `url` or `body`, never both and never neither.**
Enforced in the service on the *resulting* row, so a PATCH that clears one field
without supplying the other cannot leave a resource with no content at all. Postgres
check constraints aren't expressible in the Prisma schema, which is why this lives in
code rather than in the database.

**Sheet bodies are never included in the list payload** — only on the detail route.
The listing is a card grid; shipping ~6 KB of markdown per card to render a title and a
description would be waste.

**Problem steps in a learning path derive completion from the judge; resource steps are
self-reported.** Ticking a problem step by hand is rejected outright. A path can
therefore never claim a problem is solved when the judge disagrees, and there is no
stored flag that could drift out of sync with the submission record.
*Verified by insertion, not assertion:* an `ACCEPTED` submission written directly to the
database made the step read as complete, and deleting it made the step read as
incomplete again — proving nothing is persisted for those steps.

**Step targets are exclusive**: every step points at exactly one resource or one
problem, validated in the seed and in the service.

**One seed source, not two.** The step briefly had both a `resources-defaults.ts` and a
`seed-data/resources.json` describing the same content. Since the service does not
lazy-install Resources content the way the homepage does, only the seed path was live,
so the TS file was dead code. The two were merged — union of curated links, richer
version kept for each duplicated sheet — into the JSON, matching the existing
`problems.json` / `badges.json` convention, and the TS file was deleted.

*Worth recording about that merge:* `cpp-stl-reference` and `cpp-stl-cheat-sheet` were
the same sheet under two slugs, which a slug-level comparison does not catch. The merge
was done by a script that resolved the alias and then **validated every cross-reference**
— each resource's category, each path step's resource slug, and each path step's problem
title against `problems.json` — refusing to write if anything dangled.

**The seed never deletes, which has a consequence worth knowing.** Retiring a slug or
rewriting a path in the seed file leaves the old rows in the database; they must be
removed deliberately. That is the right default — the seed must not clobber content an
admin has curated — but it means seed edits are not automatically reflected in an
existing database.

---

## Step 13 — Responsive & accessibility

**The light theme was a toggle that did nothing.** `Settings` persisted `theme: 'light'`
but no `[data-theme]` rules existed. Now real, with a palette **computed and validated**
rather than derived by lightening the dark one — the dark-tuned difficulty colours fall
well below 4.5:1 on white. Shipped figures: body 17.5:1, secondary 7.8:1, muted 5.2:1,
accent 6.3:1, difficulty 4.9–6.3:1, worst CVD pair ΔE 24.6.
`muted` is deliberately darker than it looks like it needs to be: at the obvious value it
measured **4.45:1** against `raised`, just under threshold.

**`localStorage` is the render source of truth for the theme, even when signed in.**
It is readable synchronously; the account preference arrives an HTTP round-trip later,
and painting dark then flipping to light is worse than being briefly stale. An inline
script in `<head>` applies it before first paint.

**There was no mobile navigation at all.** The nav links were hidden below `md` with no
alternative, so Problems/Leaderboard/Resources were unreachable on a phone. The drawer
closes on navigation and carries the signed-in destinations that otherwise live only in
the profile dropdown.

**The transitional `brand-*` alias is gone**, as its own comment intended — the last
hardcoded `slate-*` classes were migrated first, since they ignored theming entirely.

---

## Step 14 — Final verification

**One real bug found: personal filters were silently dropped for anonymous callers.**
`GET /problems?status=bookmarked` returned the *entire catalogue* rather than nothing,
because the whole status clause was skipped when there was no user. A filter that widens
the result set is the more surprising failure — the same principle already applied to
tag AND-semantics in step 4. Now the filter is always applied: with no user, `solved`
and `bookmarked` match nothing and `unsolved` matches everything.
*Guarded by a regression test that was confirmed to fail against the old code.*

**Deliberately left as-is:** `/leaderboard` coerces unparseable paging to page 1 while
`/problems` rejects it with a 400. Lenient rather than wrong, and tightening it would
change an established client contract for no safety gain. Noted here so the asymmetry
reads as a decision rather than an oversight.

**Documentation correction:** `CLAUDE.md` said usernames are "assigned automatically at
registration". They are actually backfilled on the first profile read — freshly
registered accounts have `username: null` until then.

**Three "failures" in the final pass were the harness's fault, not the app's**: reading a
username before it is backfilled, asserting 401 on an endpoint that is public by design,
and — the interesting one — checking that a zero-XP user is unranked *after* having
called `GET /me/gamification`, which performs the daily check-in and therefore awards
login XP. Reading gamification state mutates it; that is by design, and worth knowing.

---

## Step 12 — Admin panel

**Two guards exist to stop an admin locking everyone out**: you cannot change your own
role, and you cannot remove or suspend the last active admin. Both are enforced on the
server; the UI merely disables buttons that could only fail.
*Verified adversarially*, not just by reading the code — the test demotes one admin so
another becomes the last, then tries every route to zero.

**Suspension revokes live sessions, not just future logins.** `JwtStrategy` now re-reads
the account on every authenticated request, so a suspended user's existing token stops
working immediately rather than at expiry. The same lookup makes **role changes take
effect on already-issued tokens** — a promotion works without re-login, and more
importantly a demotion cannot be outrun by a token minted moments earlier.
*Verified with the same token object across the change, in both directions.*
*Cost accepted:* one indexed primary-key lookup per authenticated request. Trusting the
token's embedded role would mean a demoted admin keeps admin powers until it expires,
which is not a trade worth making.

**Manual XP correction appends to the ledger; it never edits a total.** There is no
total to edit — XP is always `SUM(amount)`. Each adjustment carries a unique
`dedupeKey`, so two identical corrections are both recorded rather than the second being
swallowed by the idempotency machinery built for judge awards. A zero-amount adjustment
is rejected as almost certainly a mistake, and a reason is mandatory.

**The judge monitor never selects submission `code`.** It exists to spot executor
failures — verdicts, error output, timings — and an admin browsing a list has no reason
to read every user's source.

**Gamification config keys are validated against the known set.** An unknown key is a
typo, not configuration, and silently storing it where nothing will ever read it would
be worse than a 400. Edits invalidate the 30-second cache immediately, verified by
renaming the level the test account actually occupies and re-reading the live endpoint.

**Deleting a problem warns about the blast radius in words.** The cascade removes other
users' submissions and changes their leaderboard standing; the confirmation says so
rather than asking a generic "are you sure?".

---

## Image upload (closed a step 10 deferral)

Uploads write to the API host's local disk. The deployment target settled on in
milestone 10 is an Oracle Cloud VM with a persistent filesystem, so files survive a
restart there — the original deferral was written when the plan was Render, whose
ephemeral disk would have lost them.

**No new runtime dependency.** `multer` already ships inside
`@nestjs/platform-express`. Only `@types/multer` was added — types only, dev only.

**Memory storage, not disk storage.** Multer never writes anything; the service writes
the buffer itself after validating it. A file that fails validation therefore never
touches the filesystem at all, rather than being written and then deleted.

**Format is decided by magic bytes, never by the declared type or the extension.**
Both of those are attacker-controlled. A PHP payload named `shell.png` sent as
`image/png` is rejected because its first bytes are not those of an image.

**SVG is excluded, and excluded by construction rather than by a blocklist.** SVG is
XML with no fixed signature, so it cannot match any entry in a magic-byte allowlist.
That is the desired outcome: an SVG served from our own origin can carry a `<script>`
tag, which is stored XSS against every admin who opens the page. Verified with a real
script-bearing SVG, submitted both honestly and disguised as a PNG.

**The stored filename is generated, never derived from the upload.** This makes path
traversal structurally impossible instead of something a sanitiser has to catch, and
removes any chance of one upload overwriting another. Verified: uploading a file named
`../../../../evil.png` succeeds, is stored under a UUID, and writes nothing outside the
upload directory.

**`resolveUploadDir()` resolves from the process working directory, not `__dirname`.**
The first version used `__dirname`, which in a compiled run points inside `dist/` —
so every uploaded image would have been silently deleted by the next rebuild. Caught by
asserting the file was actually on disk at the expected path rather than trusting that
the HTTP response looked right.

**Uploads are admin-only.** Every consumer of these images is admin-authored content.
User avatar upload would need its own quota and moderation thinking, and is still
deferred.

---

## Deferred — not built, and why

| Feature | Status |
|---|---|
| Daily / weekly challenges | Not designed. The XP rules that reference them (+20 / +75) are inactive; the ledger accepts them unchanged once built (guide §6.8). |
| Contests | Same — the +30 / +200 contest rules are inactive. |
| Light theme | Tokens are structured for it, but only the dark palette has been validated. Both need validating before the toggle ships (guide §0.1). |
| Streak reminder notifications | The type and preference exist, but nothing schedules them — that needs a cron job, which the current single-process deployment has no home for. All other notification types are live. |
| User avatar upload | Admin image upload is built (see above). Avatars are user-facing and would need per-user quotas and a moderation story, so they stay deferred; the URL field still works. |
| Homepage admin **UI** | The CMS API is complete and verified (create/update/delete/publish for every collection, plus audit logging). The screens that drive it land with the rest of the admin panel in step 12. |
| Resource completion for *curated links* | A link step is ticked by the user, on trust — we cannot know they read it. Problem steps are judged. |
| `/about`, `/privacy`, `/terms` | Routed and reachable, intentionally without content — see step 10. |
| Server-side code drafts | `localStorage` is sufficient for surviving a refresh. |

---

## Testing posture

Every step is verified against the **real running stack** — real Postgres, real Redis, real
Docker judging — not mocks, before being reported complete. Unit tests cover pure logic
(verdict decisions, streak computation, the `time -v` parser) and the security-critical
Prisma query shapes. Throwaway accounts created during verification are deleted afterwards,
and the database is checked back to a clean state.

Two habits that repeatedly caught real problems:
1. **Query the database directly** rather than trusting a UI screenshot or an API response
   shape.
2. **When a check fails, find out why before changing code.** Several "failures" during
   this rebuild turned out to be wrong assertions in the test — a malformed C++ literal
   producing a compile error, an omitted streak bonus in expected arithmetic, a real
   runtime percentile mistaken for a bug. Each was confirmed against the database before
   concluding the application was correct.
