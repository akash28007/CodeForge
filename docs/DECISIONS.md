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
deferred. *(Superseded — see "Corrections pass" below.)*

---

## Corrections pass (post step 14)

A round of fixes and additions requested after the user clicked through the finished app.

### Theme toggle in the top bar

**Decision:** the switch lives in the navbar for everyone, signed in or not, and is
rendered outside the authenticated branch. Settings keeps its dropdown; both write the
same places.

The theme was already `localStorage`-first (so it paints correctly before any network
call), which is exactly what makes an anonymous toggle possible. When a user *is* signed
in the navbar also PATCHes `/settings/preferences`, fire-and-forget — the visual change
has already happened locally, and a failed persist is not worth a toast on a one-click
control.

### Split-pane divider only dragged one way

**Root cause, not a workaround:** the right pane was `flex-1` with no `min-w-0`. A flex
item defaults to `min-width: auto`, so it refused to shrink below Monaco's intrinsic
width. Dragging left shrank the left pane and worked; dragging right needed the *right*
pane to give way and silently did nothing. Both panes now carry `min-w-0`, and the left
pane is `lg:shrink-0` so its `flexBasis` is honoured — scoped to `lg` because below that
the container is `flex-col`, where the basis would apply to height instead.

### Badge art

**Decision:** one hand-drawn SVG per badge code in `components/BadgeArt.tsx`, *not* an
admin-editable `Badge.icon` column.

Considered and rejected: a DB column plus an upload/preview flow in the admin panel. Badge
art is a design asset that changes about once a year, and the column would have bought a
migration and a screen for something no admin will ever use. A badge added to
`seed-data/badges.json` without art here still renders — there is a criteria-keyed
fallback, so a new badge degrades to a generic emblem rather than a blank box.

The bug it replaced was real: the old code did `LEVELS[Math.min(index, LEVELS.length - 1)]`,
so every badge past the last level rendered the *identical* silhouette. Each badge now has
a distinct plate shape, glyph and hue — three independent axes, so two can never read alike.

**Locked badges keep their art**, at 42% opacity with *partial* desaturation and a small
lock chip in the corner, rather than a grey silhouette behind a padlock. An unearned badge
should advertise what it is; hiding it entirely removes the reason to chase it.

**Scrolling:** the horizontal scroller was replaced with a wrapping grid rather than being
fixed. The row had `overflow-x-auto` inside a card with no scroll affordance, so the later
half of the set was effectively invisible. A grid has nothing to discover.

### Profile pictures

**Decision:** a dedicated `POST /profile/avatar` upload, and `avatarUrl` is deliberately
**not** a field on `PATCH /profile`.

The column can therefore only ever hold a path this server generated. Accepting a free-text
URL would let any account point its avatar at an arbitrary third-party image — a tracking
pixel, or something that changes to abuse content after moderation. Verified: a `PATCH`
carrying `avatarUrl` is ignored.

Validation reuses `UploadsService`, so avatars inherit the magic-byte allowlist that
already excludes SVG (an SVG served from our own origin can carry `<script>` — stored XSS).
Replacing or removing a picture deletes the old file; that delete is best-effort and never
throws, because the profile has already saved by then and an unlinked file is not something
the user can act on.

**`assetUrl()` fixed a pre-existing bug.** Uploaded images were rendered as bare
`/uploads/x.png`, which resolves against the *client* origin, not the API's — so every
admin-uploaded hero image, company logo and review avatar was already broken. The helper
is applied inside `Avatar` rather than at each call site, so no future caller can forget it.

### Reviews — redesign and user submissions

**Decision:** `status` (PENDING/APPROVED/REJECTED) is a *separate* field from the existing
`published` boolean.

Collapsing them was tempting but wrong in both directions: an admin could not unpublish an
approved review without pretending it was never approved, and — more importantly — flipping
the publish toggle on a rejected row would put it back on the landing page. Public reads
require **both** `published: true` and `status: APPROVED`. Verified explicitly.

`status` defaults to `APPROVED` so every existing admin-authored and seeded row behaved
exactly as before the migration; only user submissions are created PENDING.

**Identity comes from the account, not the form.** `SubmitReviewDto` accepts only
`designation`, `rating` and `body` — no `name`, `avatarUrl`, `published` or `status`. A
review is attributed to a real profile on this site, so a submitter typing their own name
would make the attribution meaningless, and the whitelist means a crafted payload cannot
self-approve (verified: extra fields 400).

**"Verified Learner" is derived, never stored** — computed from an ACCEPTED submission at
read time, in one grouped query for the whole batch. Storing it would let it be set
directly, and would go stale when someone solves their first problem after writing a
review. Likewise the avatar reads through the author relation rather than being copied, so
changing your profile picture updates your review.

**Rejected: like/dislike counts** from the reference mockup. Display-only numbers an admin
edits would be fabricated engagement, which breaks the "no fake data" ground rule; real
voting was not wanted for this pass. The card omits them.

### Palette — final: near-black + blue→magenta gradient

Third and settled attempt. Supplied: the gradient pair `#003af7 → #e000f0`, and a dark
ramp `#040214 · #1a0f3c · #3c215d · #7d498c · #d799c5`. The brief was explicit — near-black
for most of the dark page, mostly white for the light page, the gradient present as
*ambience* rather than as decoration, and buttons that never compromise the text on them.
"Professional, not a colourful canvas."

**`#003af7` cannot be text on a dark ground — it measures 2.88:1.** That single number
drove the structure. It is kept exactly where it works: as the light-theme accent (7.12:1
on white), as a filled button with white on it (7.12:1), and as one end of the ambience
gradient. `--c-accent` in dark mode is a *lightened tint of the same hue* so links, icons
and focus rings are legible; the literal colour survives in `--c-grad-a`.

**`#e000f0` is never text or a fill in the light theme** — 3.87:1 on white, below the
threshold. It appears only in gradients. Being given a colour is not a reason to put it
somewhere it cannot be read.

**Body copy is near-neutral, not tinted purple.** The supplied ramp furnishes the
*surfaces* (`#1a0f3c` raised, `#3c215d` borders) and the activity heat map. Purple body
text is the fastest way to make a product look like a theme demo.

**The ambience is two very wide radial washes at 0.16/0.10 alpha in dark and 0.07/0.05 in
light**, `background-attachment: fixed` so they read as lighting rather than as a banner
that scrolls away. Light mode needs far weaker alphas: the values that read as a glow on
near-black read as tinted paper on white, which is precisely the "colourful canvas" being
avoided. Cards sit on an opaque `surface`, so the wash is never behind body copy — but
`check-contrast.mjs` now composites each wash over `base` and re-checks all four text
roles against the result, because raising a wash opacity silently changes the ground under
every unenclosed piece of text on the page.

**Buttons are gradient fills, and the direction inverts between themes.** The flat accent
fill read as monochrome against a page of neutrals — correct by the numbers, lifeless in
practice. Now:

| | Fill | Label |
|---|---|---|
| Dark | light `#7A98FF → #E58BF0` | near-black (7.6:1 / 9.1:1) |
| Light | deep `#003AF7 → #A3009E` | white (7.1:1 / 6.9:1) |

On a near-black page the button should be the *light* thing in the room; on white it
should be the dark thing. The magenta stop is deepened from `#e000f0` in light mode
because white on the supplied value is 3.87:1 — **a gradient button whose far end fails is
a failing button**, so `check-contrast.mjs` checks the label against *both* stops rather
than the average. Hover brightens with a filter instead of swapping to a second gradient:
one declaration, so it cannot drift out of step with the base state.

**`--c-accent-2` exists because one accent on a page of neutrals is what "monochromatic"
means.** It is the magenta end of the brand gradient, lifted until it passes as text, and
it gives chips, badges and figures somewhere to go. The stats strip alternates its figures
between the two accents; four identical tiles in one colour read as a wall.

**Six decorative tones, assigned by hashing a string.** Sixteen topic tiles and a column
of initials avatars in one accent is what "monochromatic" actually looked like. `--c-tone-1`
to `--c-tone-6` sweep along the brand gradient plus two cool neighbours — varied, not
carnival — and `utils/tone.ts` picks one by FNV-1a hash of the item's name.

Hashing rather than indexing is the point: `arrays` keeps its colour between renders and
across pages, and adding a topic does not reshuffle every other tile. The tones carry **no
meaning**, so nothing is lost when two items collide, and no user ever has to decode them.

All six are contrast-checked as text, because they are used for the count figure on each
tile — "it is only decorative" stops being true the moment one of them is a number
somebody reads.

**Every selected/filled control goes through `.btn-gradient`, not `bg-accent`.** A flat
accent fill needs a matching ink class beside it, and the two can drift — which is exactly
what happened: `TopicChip` appended `hover:text-primary` to *both* states, so hovering a
**selected** chip turned its label near-black on its own dark blue fill. The gradient
utility carries its own label colour in one declaration, so the pairing cannot come apart.
The pagination's current-page button moved for the same reason.

The one remaining flat fill is the checkbox tick (`checked:bg-accent` +
`checked:after:text-on-accent`), which has no hover rule to invert it.

**Cards glow from a corner (`.card-glow`).** A `::before` layer, not a background image
on the card, so the card keeps its opaque `surface` fill underneath — every "text on a
card" contrast figure is measured against that fill, and making the card itself
semi-transparent would have quietly invalidated all of them.

The validator now composites the glow over `surface` and re-checks the dimmer text roles,
which immediately caught the first attempt: at 0.22 alpha, `muted` text over the glow
measured **3.57:1**. Lowered to 0.12 in dark mode, where the worst tone leaves 4.59:1.
This is exactly the class of bug that ships invisibly — the card looks better and one text
role quietly stops being readable.

### Activity calendar uses the contribution-graph green

Adopted the green ramp people already know from contribution graphs, in both themes. It is
the one chart a developer can read without consulting a legend, so borrowing the
convention costs nothing.

`heat-0` (the empty day) is deliberately a **neutral grey, not a pale green** — otherwise
"no activity" reads as "a little activity", which is the opposite of what the cell means.

The two deepest steps in the light theme are darker than the contribution-graph originals,
because this calendar prints the day number *inside* the cell: at the usual `#30a14e` the
near-white ink measures 3.09:1, so the number would be least readable on exactly the days
with the most activity.

### Difficulty: two sets, and why

`--c-bar-*` (charts) is vivid and identical in both themes. `--c-easy`/`--c-medium`/
`--c-hard` (labels and badges) stays per-theme and accessible.

The split exists because a bar is not text. On white, 4.5:1 is a hard ceiling on how bright
a *label* can get — a vivid green measures under 4:1 and simply cannot be used for text
there. `medium` and `hard` had headroom and were brightened to the limit; `easy` had none.
Charts are free of that constraint, so they carry the luminous set the user asked for.

The light accent moved off the palette's `#003af7`, which read as navy and heavy on white,
to `#2563EB` — still 5.17:1 as text and with white on it, but visibly less inky. That
change alone pushed the accent-over-ambience-wash check to 4.40:1, so the light wash
dropped to 0.05/0.04: the accent and the wash are the same hue, and lightening the ground
under text of that hue is exactly what erodes it.

### Uploaded PNGs are trimmed of transparent padding

A Google wordmark uploaded at 2800×2800 rendered about a third the size of its neighbours.
Decoding its alpha channel showed why: the actual ink measured **2324×758 — 27% of the
canvas height**, the rest transparent. The marquee sizes logos by height, and that
constraint applies to the whole canvas, padding included. Resolution was never the issue;
everything is scaled to 36px regardless.

Fixed at upload time rather than at render time, so every consumer gets a tight image
without needing to know the problem exists, and so it does not depend on whoever exported
the file having cropped it.

**Hand-rolled rather than adding `sharp`.** The work is a zlib inflate, a defilter, a crop
and a deflate — all native to Node. `sharp` is a native build-step dependency and this is
not enough work to justify one, particularly on the single-VM deployment.

Scope is deliberately narrow: 8-bit RGBA / grey-alpha, non-interlaced PNG, which is what
image editors and logo downloads emit. JPEG, WebP, GIF, paletted and 16-bit PNGs are
stored untouched — they either have no alpha to trim or are too rare to justify the
decoder. **Any failure falls back to storing the original**; a malformed image is not an
upload failure, it is simply not trimmable.

Covered by 11 unit tests including off-centre padding, a fully transparent image (must
*not* crop to nothing), a near-invisible alpha fringe, truncated data, and a byte-for-byte
identity check that an already-tight image is not needlessly re-encoded. The test builds
its PNGs with a Sub filter rather than via `encodePng`, so the round-trip tests are not
just the encoder agreeing with itself.

**Company marquee: logo support was always there, the logos were not.** `Company.logoUrl`
renders an uploaded image; the wordmark is the fallback. Third-party logos are still not
committed to this repo — see the deferred note — so the fallback was upgraded to a proper
lockup (tone-coloured initial tile + name, divider rules between entries) rather than bare
grey text. Uploading real logos through Admin → Homepage → Companies replaces it with the
genuine mark at full opacity.

**The step numerals were invisible, not subtle.** They were `text-raised` on `bg-surface`
— two tokens within a few points of each other. A watermark is meant to be quiet, not
absent, so each now takes its step's own tone at 0.22 alpha and is large enough to read as
a background mark.

**The gradient gets exactly two identity moments: the wordmark and the hero headline.** `.text-brand-gradient`,
used on the three places "CodeForge" is rendered and nowhere else. Reserving it is what
makes it identity rather than decoration. Its stops are *not* `grad-a`/`grad-b` — a
gradient is only as legible as its worst stop, so both ends have their own tokens and both
are contrast-checked individually.

**The one genuine tension in the brief:** near-black page plus dark cards (and white page
plus white cards) leaves surfaces barely distinguishable — both themes initially failed
the layer-separation check at 1.03–1.05:1. Resolved by lifting `surface` slightly in dark
and tinting `base` slightly in light, which is the smallest departure from "pure" that
still lets a card read as a card.

### Palette — the supplied blue set (superseded)

Superseded the ember attempt below. The user supplied five colours —
`#3D52A0 · #7091E6 · #8697C4 · #ADBBDA · #EDE8F5` — and rejected ember as "muddy".

**That criticism was correct and the cause was diagnosable.** Ember paired a
mid-saturation orange with *warm* near-black greys. Warm plus desaturated is how you get
brown; nothing on the page was crisp. The lesson carried forward: the neutrals decide
whether a palette reads clean, not the accent.

**The supplied set is light-first — all five values are mid-to-light — and this app is
dark-first.** So the dark backgrounds are *derived*: deep desaturated navies
(`#0A0D14`/`#121724`/`#1B2233`) from the same blue family, cool rather than warm. The
four foreground roles are the palette colours themselves, assigned by which one actually
passes contrast on that ground:

| Role | Dark | Light |
|---|---|---|
| body / secondary / muted | `#EDE8F5` · `#ADBBDA` · `#8697C4` | derived near-blacks |
| accent | `#7091E6` | `#3D52A0` |
| page | derived `#0A0D14` | `#EDE8F5` |

`#3D52A0` is only 2.6:1 on the dark ground, so it is held back for the light theme's
accent and for the heat ramp — where being dark is the point. In light mode the ramp is
the supplied palette in its entirety, in luminance order.

**A blue accent removed a constraint.** With amber, `medium` had to be pushed around to
stay distinguishable from the brand colour. Green/amber/red sit nowhere near blue, so the
difficulty triad is now free — worst colour-blind pair improved from ΔE 5.7 (the first
ember attempt) to 10.7, and every contrast figure improved too.

**Three `text-white` bugs surfaced and were fixed properly.** White on `bg-hard`, on the
notification badge, and on the mid heat steps all measured ~2.6:1 — a pre-existing fault
the old palette shared. The fix is `text-canvas`, not a new token: `canvas` is the
opposite end of the scale from a strong fill in *both* themes, so one class is correct in
each. The activity calendar needed its ink to flip a step earlier; light `heat-3` was
darkened off the palette's `#7091E6` because at that mid-tone *neither* light nor dark ink
clears 4.5:1, and the calendar prints a day number on it.

`check-contrast.mjs` grew checks for fill inks and for the ramp being monotonic, so these
cannot regress silently. It caught the light `heat-3` failure at 4.37:1.

### Rejected: renaming to "Vertex"

The user proposed renaming and asked for an opinion before any change. Advised against,
and they agreed:

1. A visible-only rename leaves the UI saying one thing while `package.json`, the
   database, the Docker image, every migration and the docs say another. For a portfolio
   project — whose audience opens the source — that inconsistency is visible.
2. **Vertex** collides with Google **Vertex AI**, a flagship product at exactly the class
   of company this project targets.
3. CodeForge is self-describing, and "forge" matches the compile-and-temper pipeline.

The counter-argument, noted fairly: "vertex" is a real graph-theory term and so apt for a
DSA site, and the name no longer matches its colours now that the forge palette is gone.
Judged not to outweigh the above.

### Palette — the earlier ember attempt (superseded)

The diagnosis was specific, not a matter of taste: `--c-accent` was `99 102 241`, which is
exactly Tailwind's stock `indigo-500` (`#6366F1`). That single hue is the current default
look of generated web UI. It was compounded by every surface sitting on one blue-slate
grey ramp with `base`/`surface`/`raised` only a few points apart — which reads as one flat
sheet whatever the accent is.

**Now: ember orange (`#F08A35`) on warm near-black.** The greys were re-cut warm so the
accent sits at the same temperature as the page rather than fighting it, and the layer
steps were widened so cards actually separate from the background.

**`--c-on-accent` is a new token, and it earns its place.** White on amber is ~2.6:1 — an
amber accent inverts which foreground is legible, and six components had `text-white`
hard-coded onto `bg-accent`. Putting the decision in a token means the light theme (where
white *is* correct, because its accent is a dark `#B24A08`) and the dark theme can
disagree without any component knowing.

**The palette is validated, not eyeballed** — `client/tools/check-contrast.mjs` reads the
real token values out of `index.css` and re-runs WCAG contrast plus CIE76 ΔE under
deuteranopia/protanopia/tritanopia. It was written because the original tokens were
validated that way, and retuning them by eye would have quietly thrown that away. It
caught two real regressions in the first pass: `muted` on `raised` at 4.28:1, and the
first difficulty triad at ΔE 5.7 under protanopia. `medium` was lightened as a result —
it now has to stay clear of the amber *accent* as well as of `hard`.

`accent-soft` is *lighter* than `accent` in dark mode and *darker* in light mode. It is
the hover state, and "more emphatic" points in opposite directions on the two grounds.

### Homepage — three new sections

Lengthened per the Coding Ninjas reference, but taking structural cues only: that site is
a course-sales funnel, so its lead-capture form and webinar CTAs have no equivalent here.

Added: a **live counters strip**, a **three-step explainer**, and a **topic grid**.

**The counters are computed on every read and never stored.** They are cheap aggregate
`COUNT`s, and a stored number is a number that will eventually be wrong. Nothing is padded
or rounded up — the strip is allowed to look modest on a fresh install.

**They describe the catalogue only — never user activity.** The first version showed
"solutions judged / N accepted" from a platform-wide submission count, and the user caught
the problem: on a site with one real account, a platform-wide total *is* that person's
submission history, published to anonymous visitors who have not signed in. It was not a
cross-account leak — nothing per-user was ever queried — but the distinction stops
mattering when the aggregate has a population of one. It was also simply a weak number for
a visitor to read. Replaced with a count of published resources; the fields were removed
from the payload entirely rather than hidden in the UI, since data you do not display is
data you should not ship. Any future usage metric here has to be one that a single user
cannot be reverse-engineered from.

Registered-user count is deliberately absent for the same reason, plus it would be honest
and useless at this stage.

**The topic grid uses real tag counts**, and excludes tags with zero problems — an empty
topic tile links to an empty list, which is worse than omitting the topic.

Copy for the headings and the three steps went into `HomeContent` as flat columns
(migration `add_homepage_stats_and_how_it_works`) rather than a child table: there are
exactly three steps and they are copy, not a collection an admin adds to. The *numbers*
underneath the stats heading are pointedly not editable.

### Profile views — what the number actually means

**Policy: signed-in visitors only, one per viewer per profile per day.**

Anonymous views stay uncounted, and that is a decision rather than the old behaviour left
alone. Without an account there is nothing stable to deduplicate on except the IP address,
which behind the production reverse proxy is the *proxy's* — so every signed-out visitor
would collapse to one key, and crawlers would inflate the number for free. A smaller true
number beats a larger meaningless one, and it needs no `trust proxy` change.

**Deduplication is an in-memory `Map`, not a `ProfileView` table.** It only has to stop a
refresh — and React's double-invoked effects in development — from inflating the count. A
table would mean a migration, unbounded row growth and a cleanup job for data nothing ever
queries. The window resets on restart and is per-process; both are acceptable when the
worst case is counting one extra view. Rejected as over-engineering for this feature.

**The real problem was reachability, not counting.** Only one link into `/u/:username`
existed anywhere in the UI (a leaderboard row), so the counter had almost no way to move.
Review cards written by a registered user now link to that profile; admin-authored rows
have no account behind them and stay plain text.

The count is also surfaced honestly: the Progress sidebar states the counting rule on
hover, because a bare number with no stated basis invites the assumption that it counts
every visit.

### Homepage CMS — create/edit forms

Closed the step-10 deferral. The screen previously had only publish/unpublish and delete,
so adding a course card or a company meant editing the seed or calling the API by hand,
and social links and footer links had no UI at all.

**One spec-driven `EntityDialog` rather than five hand-written forms.** The collections
differ only in their field lists; five copies of the same seeding, validation and submit
plumbing is exactly the code that drifts apart. Each collection contributes a `FieldSpec[]`
and nothing else.

**Social links are the one special case.** The API is `PUT /admin/home/socials` keyed on
platform, not POST/PATCH on an id, because the schema allows exactly one row per platform.
The dialog routes to `PUT` for that kind specifically — doing it uniformly would let the UI
offer a second GitHub link that the database then refuses. Verified: a second PUT for the
same platform replaces rather than duplicating.

**`ImageField` allows upload *or* a pasted URL.** Uploading is the common case, but a
company logo often already lives on a CDN and forcing a re-upload of something that is fine
where it is would be busywork. The hero image got the same control, since asking an admin
to produce a URL by hand for a file they have on disk is the wrong shape of question.

---

## Deferred — not built, and why

| Feature | Status |
|---|---|
| Daily / weekly challenges | Not designed. The XP rules that reference them (+20 / +75) are inactive; the ledger accepts them unchanged once built (guide §6.8). |
| Contests | Same — the +30 / +200 contest rules are inactive. |
| Light theme | Tokens are structured for it, but only the dark palette has been validated. Both need validating before the toggle ships (guide §0.1). |
| Streak reminder notifications | The type and preference exist, but nothing schedules them — that needs a cron job, which the current single-process deployment has no home for. All other notification types are live. |
| ~~User avatar upload~~ | **Built** in the corrections pass — see above. |
| ~~Homepage admin **UI** — create/edit forms~~ | **Built** in the corrections pass — see above. |
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
