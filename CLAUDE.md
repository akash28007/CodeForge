# CodeForge — Context for Claude Code

This file is the handoff from planning done in claude.ai chat. Read this fully before doing anything.

---

## CURRENT STATE — read this first (last updated: 11 Aug 2026)

**Everything is built and verified.** Milestones 1–10 and all 14 steps of the UI/UX
rebuild are complete.

### Deployment

The runbook is [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — a real file now; it had only
ever existed in a chat transcript. Code and config are deploy-ready and verified; what
remains is account signups only the owner can perform.

**Progress**: Neon and Upstash are done. Oracle Cloud would not let the user log in, so
the VM section now documents **AWS EC2 as Option A** alongside Oracle as Option B. The
AWS path needs two non-obvious adjustments that are easy to miss and hard to diagnose:
a **1 GB `t3.micro` cannot run `EXEC_QUEUE_CONCURRENCY=4`** (one compile container alone
requests 512 MB), so it drops to 1 plus 2 GB of swap; and an **Elastic IP is mandatory**
because the HTTPS hostname is derived from the public IP, which EC2 changes on stop/start.
Also note AWS's free window expires, unlike Oracle's.

Three blockers were found and fixed during the go-live audit, all of which only surface in
a production build:
- **`npm run start:prod` had never worked.** `nest build` emitted `dist/src/main.js`
  because no `rootDir` was set. Fixed with `tsconfig.build.json`; the incremental cache
  now lives inside `dist` so `deleteOutDir` cannot leave tsc thinking the output is
  current and emitting nothing.
- **Every rate limit was inert.** `ThrottlerModule.forRoot()` was registered but no
  `ThrottlerGuard` was bound, so all six `@Throttle()` decorators did nothing. Proven by
  firing 115 requests and getting 115 × 200; now 99 × 200 then 429.
- **Login and register had no limit at all**, only the global 100/min — 144k password
  guesses a day per IP. Now 10/min each.

`client/vercel.json` handles SPA routing; without it every deep link 404s.

### Corrections pass — in progress

The user listed ten corrections after clicking through the finished app. Rationale for
each is in [`docs/DECISIONS.md`](docs/DECISIONS.md) under "Corrections pass".

| # | Correction | Status |
|---|---|---|
| 1 | Theme toggle in the top bar, signed in or not | **done** |
| 2 | User profile pictures | **done** — migration `add_user_avatar`, 17/17 checks |
| 3 | Distinct badge art + no horizontal scroll | **done** |
| 4 | How profile views are counted | **done** — signed-in viewers, deduped per day, 11/11 checks |
| 5 | Split-pane divider only dragged one way | **done** — missing `min-w-0` |
| 6 | More languages | **open** — Java rejected as too costly; **Python agreed if feasible** |
| 7 | Adding course cards / reviews / companies | **done** — CMS create/edit forms, 32/32 checks |
| 8 | Review card redesign | **done** — migration `add_review_moderation`, 23/23 checks |
| 9 | User-submitted reviews with admin approval | **done** (same migration/checks as 8) |
| 10 | Editing Follow Us / footer links | **done** (same CMS work as 7) |
| 11 | Catalogue to 100+ problems | **done** — 111 problems, 96/96 new ones judged ACCEPTED |
| 12 | Palette looked "AI generated" | **done** — ember accent replacing stock indigo-500 |
| 13 | Longer homepage | **done** — live counters, how-it-works, topic grid |

**Palette** (settled, third attempt): near-black page with a `#003af7 → #e000f0`
gradient used as *ambience only*. Dark surfaces come from the supplied ramp
(`#040214` base, `#1a0f3c` raised, `#3c215d` borders); light mode is near-white.

Non-obvious rules, all of which have already caused a failure once:
- `#003af7` is **2.88:1 on near-black** — never text or an icon there. Dark-mode
  `--c-accent` is a lightened tint; the literal colour lives in `--c-grad-a`.
- `#e000f0` is **3.87:1 on white** — never text or a fill in light mode.
- Body copy stays near-neutral. The purple ramp is for surfaces and the heat map.
- `--c-on-accent` and `text-canvas` carry "what goes on top of a strong fill", which
  inverts between themes. Never hard-code `text-white` on a coloured fill.
- The gradient appears on the wordmark and the hero headline (`.text-brand-gradient`),
  and on primary buttons (`.btn-gradient`). Its stops are separate tokens from the
  ambience pair, because a gradient is only as legible as its worst stop — the validator
  checks **both** ends, never the average.
- Buttons invert between themes: **light fill + near-black label in dark mode, deep fill
  + white label in light mode.** On a near-black page the button is the light thing in
  the room. Use `variant="primary"`, never a hand-rolled `bg-accent` button.
- `--c-accent-2` (magenta) is the second accent; one accent across a page of neutrals is
  what reads as monochromatic.
- `--c-tone-1..6` are **decorative** tones for sets of items that should merely look
  different (topic tiles, initials avatars). Pick one with `toneColor(name)` from
  `utils/tone.ts` — it hashes the name, so an item keeps its colour and adding items
  never reshuffles the rest. They encode nothing, but all six are still contrast-checked
  because they are used for count figures.

**Run `cd client && npm run check:ui` before calling any UI change done.** It is in CI.
Two checkers:
- `tools/check-contrast.mjs` — WCAG contrast + colour-vision ΔE for every token in both
  themes, including gradient stops, glow-composited backgrounds and heat-ramp inks.
- `tools/check-ink.mjs` — scans components for a strong fill paired with a text colour
  that inverts between themes, and for hard-coded `text-white`/`bg-black`.

The second exists because the *same* defect was found from screenshots four separate
times (chip hover, notification badge, calendar cell, checkbox tick). Never hand-pair a
solid `bg-accent`/`bg-hard`/… with a text class — use `.btn-gradient`, `.cf-checkbox`, or
`text-on-accent`/`text-canvas`, which are defined against the fill.

**Name**: staying **CodeForge**. A rename to "Vertex" was proposed and advised against —
see `docs/DECISIONS.md`.

**Brand assets**: the user-supplied mark lives in `client/public/` (`logo.png`,
`favicon-32.png`, `apple-touch-icon.png`), generated by
`server/tools/build-logo.ts` from the source artwork. The source arrived on a **solid
black background**, which would render as a black rectangle in light mode, so the script
keys that out to transparency while keeping the artwork's real colours. Icons are cropped
to the curl because the full swoosh is 2.7:1 and its strokes vanish at 32px. Re-run the
script if the artwork changes; do not hand-edit the PNGs. `LogoMark` renders `logo.png`
and is sized **by height with `w-auto`** — a square box squashes it.

**#6 is the only one left.** Java is out (the JVM will not start under a 256 MB `--memory`
cap, and its filename/class-name coupling fights the sandbox's generated paths). Python is
agreed if practical. Scope, after reading `docker-executor.service.ts` properly:

- `compile()` hard-codes `g++ -O2 -o /sandbox/bin/a.out …` (line ~81) and `run()`
  hard-codes `/sandbox/bin/a.out` (line ~136). Both need a small per-language record:
  source filename, compile command (a syntax check for Python, so a `SyntaxError` still
  surfaces as COMPILE_ERROR), and run command.
- Add `python3` to the **existing** executor image rather than building a second one —
  one image keeps the build and CI unchanged.
- **Per-language time multipliers** are the one non-obvious requirement: Python is
  roughly 10–50× slower, so without a multiplier several seeded problems become
  unsolvable in it. The limits are already threaded through `run()`, so this is a
  multiplication, not a redesign.
- `SubmitCodeDto`'s `IsIn(['cpp'])`, the client `LANGUAGES` array, per-language
  boilerplate, and the Monaco mode.

Nothing else in the pipeline cares about the language string — submissions, filters and
`GET /submissions/languages` already treat it as free text.

### Where the source of truth lives

| What | Where |
|---|---|
| UI/UX spec driving the rebuild | `C:\Users\IIITA\Downloads\CodeForge_UIUX_Guide_with_references\CodeForge_UIUX_Implementation_Guide.md` — **outside the repo** |
| Reference mockups | `…\CodeForge_UIUX_Guide_with_references\ui-references\*.png` |
| Why things are built as they are | [`docs/DECISIONS.md`](docs/DECISIONS.md) — read before changing UI, gamification, or CMS code |
| Adding problems | [`docs/ADDING_PROBLEMS.md`](docs/ADDING_PROBLEMS.md) |

### Git

All work is on branch **`feat/ui-rebuild-steps-1-12`** (3 commits), **not merged to
`main`**. `main` is still at the initial commit. Merge with:
`git checkout main && git merge feat/ui-rebuild-steps-1-12`

### Running it locally

```
docker compose up -d                 # Postgres + Redis (from the repo root)
cd server && npm run start:dev       # API on http://localhost:4000  (docs at /docs)
cd client && npm run dev             # UI  on http://localhost:5173
```
There is one account in the database: `akashy07v@gmail.com`, already `ADMIN`.
Seed/refresh content with `cd server && npm run db:seed`.

### Gotchas that have actually bitten this project

- **Windows holds a lock on the Prisma query engine DLL.** Stop the API dev server
  before `prisma migrate` / `generate`, or it fails.
- **Orphaned `node` processes accumulate** across restarts and silently hold ports.
  Check with `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` before assuming
  a port is free.
- **Two Claude Code instances can resume the same session** and edit the same files
  concurrently, which looks exactly like a mystery second writer. Diagnose by comparing
  the `--resume=` flag across `claude.exe` processes; fix with a VS Code window reload.
- **The seed never deletes.** Retiring a slug or rewriting a learning path in
  `seed-data/*.json` leaves the old rows behind; they must be removed deliberately.
- **`GET /me/gamification` mutates state** — it performs the daily check-in and awards
  login XP. Do not use it as a read-only probe in a test.
- **Tailwind silently emits nothing for off-scale classes** (`h-4.5`, `bg-accent/12`).
  Two real rendering bugs came from this. Verify new UI by grepping the built
  `client/dist/assets/*.css` for the utilities the page depends on.

### What is verified, and what is not

Verified against the real stack (Postgres, Redis, Docker judge): **67 unit + 23 e2e
tests**, plus per-step API checks — step 10: 47/47, uploads: 32/32, step 11: 48/48,
step 12: 69/69 + 29/29, step 13: 33/33, step 14: 70/70. Lint and type-check clean.

**Not verified programmatically:** there is no browser test tooling in this project, so
nothing renders in a headless browser during checks. The user has confirmed the app
visually. Light theme is contrast-validated by computation and confirmed by eye.

### Remaining work

1. The corrections the user is about to describe.
2. Milestone 10 go-live — the Oracle Cloud VM runbook. Account signups and provisioning
   are steps only the user can perform.
3. Milestone 11 — README and resume bullets.

---

## What this project is

CodeForge: a production-style Online Judge (LeetCode/Codeforces-style), built as a
resume-grade portfolio piece for product-company interviews (Amazon, Microsoft, Adobe,
Atlassian, Oracle, Walmart Global Tech). Users register, browse problems, submit C++ code,
which is compiled/executed in sandboxed Docker containers against hidden test cases, queued
via Redis+BullMQ, results stored in Postgres, shown on a leaderboard.

## Core working principle — READ THIS FIRST

**One milestone at a time. Do not skip ahead. Do not generate the whole project at once.**
Explain every file/folder you create and why, prioritize the user's understanding over speed.
The user (Shreyansh) is on **Windows, using Command Prompt** — never give Unix-only commands
(no `cp`, use `copy`; no `rm`, use `del`; etc.) unless they say they're using WSL/Git Bash.

## Tech stack

- Backend: NestJS + TypeScript, Prisma ORM, PostgreSQL
- Frontend: React + TypeScript + Vite + Tailwind CSS, React Router, Axios
- Queue: Redis + BullMQ
- Execution: Docker (sandboxed g++ compile/run)
- Auth: JWT + bcrypt
- Validation/Security: class-validator, class-transformer, Helmet, @nestjs/throttler, CORS
- Docs: Swagger/OpenAPI (mounted at `/docs`)
- Testing: Jest (unit), Supertest (e2e)
- CI/CD: GitHub Actions
- Deployment target: Vercel (client), Render (server), Neon (Postgres), Upstash (Redis)

## Security requirements for the Docker executor (non-negotiable, milestone 7)

All submitted code is untrusted. Every execution must have:
- ephemeral, single-use container per submission
- CPU + memory limits from the problem's `timeLimit`/`memoryLimit`
- wall-clock timeout enforced from *outside* the container as a backstop
- no network access inside the container (`--network none`)
- read-only root filesystem + small writable tmp mount, disk quota
- non-root user, dropped Linux capabilities, seccomp/AppArmor profile
- capped queue concurrency

Never relax these for convenience, even temporarily "to get something working."

## Milestone status

- [x] 1. Environment setup — scaffold generated and delivered (`CodeForge_scaffold.zip`),
      folder structure, package.json files, Prisma schema, docker-compose.yml, executor
      Dockerfile stub, main.ts with Helmet/CORS/ValidationPipe/Swagger all in place.
      `npm install` completed successfully in both `client/` and `server/`.
      Docker Desktop confirmed running (WSL2 installed). `server/.env` created from
      `.env.example`. `docker compose up -d` brought up Postgres 16 + Redis 7
      (containers `codeforge-postgres-1`, `codeforge-redis-1`). Initial migration
      `20260802192517_init` applied via `npx prisma migrate dev --name init`; Prisma
      Client generated. Milestone complete.
- [x] 2. Project scaffolding — Auth, Problems, and Submissions modules wired into
      `AppModule`, each with a controller mapping the exact routes from the API surface
      above and a service stubbed with `NotImplementedException` pointing at the
      milestone that implements it for real (3, 5, 6 respectively). Verified the server
      boots and all 9 routes register correctly. Frontend: `react-router-dom` wired up in
      `App.tsx` with a shared `Layout`/`Navbar`, page stubs for Home/Login/Register/
      Problems/ProblemDetail/Submissions/NotFound, and an axios instance in
      `services/api.ts` reading `VITE_API_URL` (`client/.env.example` added). Verified
      `tsc -b` passes and the Vite dev server serves all routes. Leaderboard and Profile
      pages intentionally deferred — no backend for them yet (milestones 8 and later).
- [x] 3. Authentication (JWT + bcrypt, guards) — real `AuthService` backed by Prisma:
      register hashes passwords with bcrypt (10 salt rounds) and rejects duplicate
      emails (409); login verifies via `bcrypt.compare` and returns 401 on any mismatch
      without leaking which field was wrong. JWTs signed via `JwtModule.registerAsync`
      reading `JWT_SECRET`/`JWT_EXPIRES_IN` from env. Added `JwtStrategy`
      (passport-jwt), `JwtAuthGuard`, `RolesGuard` + `@Roles()` decorator, and a
      `@CurrentUser()` param decorator (all in `src/guards` and `src/utils` per the
      scaffolded folder layout). Added `GET /profile` (protected) since it's in the API
      surface but wasn't tied to a numbered milestone. Wired guards onto the
      already-existing route stubs: `POST/PUT/DELETE /problem` now require
      `JwtAuthGuard` + `RolesGuard(Role.ADMIN)` (matches the "(admin only)" annotations
      in the API surface); all `/submission*` routes require `JwtAuthGuard` (the
      `Submission` model has a non-nullable `userId`). `GET /problems` and
      `GET /problem/:id` stay public. End-to-end verified against the real local
      Postgres: register → wrong-password login (401) → correct login (201, token) →
      `/profile` with/without token (200/401) → admin-only write as a plain USER (403)
      → unauthenticated `/submissions` (401). Test users cleaned up afterward.
      **Update (closed while building Milestone 8):** added `POST /auth/refresh`.
      `register`/`login` now also issue a `refreshToken`, signed with the separate
      `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN` via a per-call `sign()` options
      override (no second `JwtModule` registration needed). Refresh rotates both
      tokens rather than just reissuing the access token. Verified: valid refresh
      returns a fresh pair; a garbage token 401s; an access token used as a refresh
      token also 401s (rejected on signature, since it's signed with a different
      secret) — confirms the two token types can't be swapped. This is one endpoint
      beyond the original documented API surface — noted below.
- [x] 4. Database & Prisma — schema and initial migration were finished while closing
      out Milestone 1 (see above). The remaining piece, wiring Prisma into Nest, is done
      now: `PrismaService` (extends `PrismaClient`, connects/disconnects with the Nest
      lifecycle) and a `@Global()` `PrismaModule` exporting it, imported once in
      `AppModule` so every feature module can inject `PrismaService` without repeating
      the import.
- [x] 5. Problem management (CRUD, admin-only writes) — real `ProblemsService` replacing
      the stubs. `CreateProblemDto`/`UpdateProblemDto` validate all scalar fields plus a
      nested `testCases: CreateTestCaseDto[]` (at least 1 required on create) and an
      optional `tags: string[]`. Tag names are upserted (`findOrCreate`) and linked
      through the `ProblemTag` join table; update replaces the full tag/test-case set
      when either is provided (`deleteMany` + `create` in one nested write) and leaves
      them untouched otherwise. Security-critical design choice: `GET /problems` and
      `GET /problem/:id` use an explicit Prisma `select` that never includes
      `testCases` at the query level — hidden test cases (the answer key) can't leak
      through those public endpoints even by accident, since the data is never fetched
      in the first place. Only the admin-only create/update responses (already behind
      `JwtAuthGuard` + `RolesGuard(Role.ADMIN)`) echo test case content back. Verified
      end-to-end against real Postgres as an admin-promoted test user: create (with tags
      + 2 test cases, one hidden) → confirmed list/detail responses contain zero test
      case data → 404 on a missing id → 400 on an incomplete payload (all
      class-validator messages fired correctly) → update (partial: changed title,
      replaced tags, left test cases untouched — confirmed untouched) → delete (cascades
      via the schema's `onDelete: Cascade`, confirmed 404 after) → 403 for the same
      write attempted as a plain `USER` (checked in Milestone 3). Test user/tags cleaned
      up afterward.
- [x] 6. Submission pipeline (queue + status polling) — scoped deliberately to the
      producer side; the consumer (actual code execution) is Milestone 7's job, since a
      BullMQ worker can't do anything meaningful without the Docker sandbox. Added
      `QueueModule` (`src/queue/`) registering the shared Redis connection once via
      `BullModule.forRootAsync` (reads `REDIS_HOST`/`REDIS_PORT`), imported once in
      `AppModule`. `SubmissionsModule` registers a `judge` queue. Real
      `SubmissionsService`: `submit()` 404s if the problem doesn't exist, persists a
      `Submission` row (`status: PENDING`), then enqueues `{ submissionId }` onto the
      `judge` queue — no worker consumes it yet, so jobs sit in Redis until Milestone 7
      adds the processor (confirmed via `redis-cli LLEN bull:judge:wait`). `findOne()`
      enforces ownership (submission's owner or an `ADMIN`, else 403) since
      `GET /submission/:id` has no documented access-control note but the schema ties
      every submission to a `userId`. `findAllForCurrentUser()` lists only the
      caller's own submissions. `runSample()` (`POST /run`) throws
      `NotImplementedException` pointing at Milestone 7 — there's no meaningful
      "queue-only" version of a synchronous sample run. `SubmitCodeDto` currently
      restricts `language` to `'cpp'` only via `IsIn`, matching the project's current
      C++-only scope. Verified end-to-end against real Postgres + Redis: submit → job
      confirmed genuinely queued in Redis → poll as owner (200, includes code) → poll
      as a different user (403) → list history → submit to a nonexistent problem (404)
      → `/run` correctly 501s. Known gap flagged for Milestone 7: the `Submission`
      model has no field yet for judge output/stderr per test case — schema wasn't
      touched this milestone since that's a bigger decision; will need addressing when
      building the executor. Test data cleaned up afterward (one harmless leftover test
      job remains in the Redis queue with no consumer — self-resolves once Milestone 7's
      worker exists).
- [x] 7. Docker execution (sandboxed compile/run — see security section above) — built
      and reviewed in two phases.

      **Phase 1 (sandbox core, `server/src/docker/`)**: `DockerExecutorService` shells
      out to the `docker` CLI (no new dependency like `dockerode` — flagged, not
      pre-approved by the tech stack list). One ephemeral container per *compile*, one
      ephemeral container per *test-case run* (not one container for the whole
      submission) — chosen because per-test isolation is stronger and far simpler to
      timeout/kill correctly than juggling `docker exec` into a long-lived container;
      "ephemeral, single-use, nothing reused across submissions" is preserved either
      way. Every container: `--network none --read-only --cap-drop=ALL
      --security-opt=no-new-privileges --user 1000:1000 --memory/--memory-swap
      (equal, no swap escape) --cpus 1 --pids-limit --tmpfs /tmp`. The one deliberate
      writable mount is the compile step's `/sandbox/bin` (a disposable host dir, not
      tmpfs, since the binary must outlive that one container for the run containers to
      read it) — everything else is read-only. Wall-clock timeout is enforced from
      Node via `setTimeout` → `docker kill <container>`, independent of anything
      happening inside. TLE vs MLE are disambiguated even though both end in exit 137
      (SIGKILL): `timedOut` is set by our own kill, `oomKilled` is `exitCode===137 &&
      !timedOut` (the kernel's OOM killer). Exit codes 125/126/127 are treated as
      Docker/image infrastructure failures (thrown), distinct from the user's code
      failing. Fixed a real bug caught while building the processor: if `runDocker()`
      threw (infra failure) the temp-dir cleanup line right after it never ran,
      leaking directories — wrapped in try/catch/finally so cleanup always happens.
      Verified directly (no queue involved yet) against the real `codeforge-executor`
      image: correct compile+run, compile errors surface real g++ output, an infinite
      loop hits `timedOut` at the expected wall time, a memory bomb is OOM-killed and
      correctly flagged `oomKilled` (not `timedOut`), network access is blocked
      (`wget` fails inside the container), process runs as uid 1000 not root, writes
      outside the mounted dirs are blocked by the read-only root FS. No lingering
      containers or temp dirs after any test.

      **Phase 2 (queue wiring + verdict logic)**: closed the gap flagged during
      Milestone 6 — added `errorMessage`/`passedCount`/`totalCount` to `Submission`
      (migration `add_submission_judge_fields`) since there was nowhere to record why a
      submission failed. `JudgeProcessor` (`@Processor('judge')`, `src/modules/
      submissions/judge.processor.ts`) consumes two job types on the same queue:
      `judge-submission` (compiles once, runs every test case in order, stops at the
      first failure, writes the final verdict/runtime/passedCount back to the
      `Submission` row) and `run-sample` (compiles, runs once against the problem's
      public sample I/O, returns the result directly — no DB row, matching "not
      saved"). Concurrency is capped by setting `this.worker.concurrency` from
      `EXEC_QUEUE_CONCURRENCY` in `onModuleInit()` rather than as a decorator literal,
      since decorator arguments evaluate at import time, before `ConfigModule` has
      loaded `.env`. Hidden-test-case safety carried through to verdicts, not just
      reads: a wrong-answer/runtime-error on a hidden test case reports only "test
      case N failed", never the expected or actual output — only non-hidden test
      failures echo expected/got, since that data is already public. `POST /run` is
      routed through the *same* `judge` queue (not a bypass), via BullMQ's
      `job.waitUntilFinished(queueEvents, ...)`, specifically so interactive "run
      against sample" requests share the same concurrency cap as real submissions
      rather than opening a second, uncapped path to spawn containers — this is what
      "capped queue concurrency" actually requires. Verified end-to-end against the
      real running stack (not mocked): full PENDING→RUNNING→ACCEPTED cycle with
      passedCount 3/3; wrong-answer on the public sample correctly shows
      expected/got; wrong-answer on a hidden case shows only the test number; compile
      error surfaces real g++ output through the DB row; `/run` returns pass/fail
      synchronously in under a second for correct, wrong, and compile-error code.
      Load-tested the concurrency cap directly: fired 8 submissions at once against a
      problem whose solution sleeps 4s, sampled `docker ps` every 0.5s in the same
      shell invocation as the burst (a first attempt across separate tool calls
      produced a false negative from inter-call latency, not an app bug) — observed
      exactly 4 concurrent `codeforge-run-*` containers, then 0 while batch two
      compiled, then exactly 4 again, matching `EXEC_QUEUE_CONCURRENCY=4` precisely.
      Zero lingering containers or temp dirs afterward. All test data cleaned up.

      **Interpretation flagged during the pause-for-review**: "CPU + memory limits
      from the problem's `timeLimit`/`memoryLimit`" — memory maps directly to
      `--memory`; "CPU limit" was read as "cap at 1 core" (`--cpus 1`, a fixed resource
      cap) rather than something numerically derived from the ms value, since that's
      the only dimensionally sensible reading. Not corrected, so treated as accepted.

      **Update (closed while building Milestone 8):** `Submission.memory` is now
      populated. Added GNU `time` to the executor image and wrap the run command as
      `/usr/bin/time -v /sandbox/bin/a.out < input`; `time -v`'s report always starts
      with a stable `\tCommand being timed:` marker, so it's split out of the captured
      stderr (program's real stderr stays clean) and `Maximum resident set size
      (kbytes)` is parsed from it. `JudgeProcessor` tracks the max across test cases,
      same pattern as `runtime`. Verified directly against the real sandbox: a normal
      program's own stderr text comes through unpolluted by time's report; a 50MB
      allocation reports ~54MB; an OOM-killed process still reports a reading close to
      its memory limit (confirms `time` survives its child being OOM-killed, since the
      kernel only kills the biggest consumer, not the whole process tree); a
      timed-out process reports `memoryKb: null` (our own `docker kill` SIGKILLs the
      entire container process group at once, including `time` itself, before it can
      write anything) — an expected, harmless gap since TLE doesn't need a memory
      reading anyway.

      **Interpretation flagged during the pause-for-review**: "CPU + memory limits
      from the problem's `timeLimit`/`memoryLimit`" — memory maps directly to
      `--memory`; "CPU limit" was read as "cap at 1 core" (`--cpus 1`, a fixed resource
      cap) rather than something numerically derived from the ms value, since that's
      the only dimensionally sensible reading. Not corrected, so treated as accepted.
- [x] 8. Leaderboard — `LeaderboardModule` (`GET /leaderboard`, public, no guard —
      consistent with `GET /problems`). Ranks by count of *distinct* problems with at
      least one `ACCEPTED` submission per user (via `submission.groupBy(['userId',
      'problemId'])`, which naturally collapses repeat solves of the same problem to
      one), tie-broken alphabetically by name. Users with zero solves are omitted
      rather than shown with a 0. Frontend: added `pages/Leaderboard.tsx` (was
      intentionally deferred in Milestone 2 for lack of a backend) plus a nav link,
      fetching from `/leaderboard` with loading/error/empty states. Verified against
      real data: empty leaderboard returns `[]`; a user who solved the same problem
      twice (once redundantly) still shows `solvedCount: 1` for that problem, not 2;
      a two-problem solver correctly outranks a one-problem solver.
- [x] 9. Testing (unit + e2e) and CI/CD pipeline — closed a real pre-existing gap
      first: both `package.json`s had a `lint` script but ESLint was never actually
      installed/configured in either package. Added `@typescript-eslint` for server
      (`.eslintrc.js`) and server + `react-hooks`/`react-refresh` for client
      (`.eslintrc.cjs`); both lint clean against the existing codebase.

      **Unit tests** (`*.spec.ts`, Jest config in `server/package.json`, 35 tests / 6
      suites, all mocked — no DB/Redis/Docker): `AuthService` (duplicate-email 409,
      wrong-password 401, password never returned, refresh verifies against the
      *refresh* secret specifically), `ProblemsService` (asserts the actual Prisma
      `select` object passed for list/detail never contains a `testCases` key — tests
      the query-level security property directly, not just the response shape),
      `SubmissionsService` (404 on missing problem, ownership 403/allow, BullMQ job
      failures wrapped as a clean 500), `LeaderboardService` (ranking/tie-break logic,
      and an explicit test documenting that dedup relies on Prisma's `groupBy`
      contract rather than defending against duplicates itself), `RolesGuard` (all
      four branches), and `parseTimedStderr` (exported for direct testing — the `time
      -v` output parser from Milestone 7/8, including the "report never arrived"
      case).

      **E2E tests** (`test/*.e2e-spec.ts`, Supertest against a real running app —
      real Postgres, real Redis, real Docker judging, nothing mocked, 23 tests / 3
      suites): auth flow including refresh; problems CRUD including the same
      hidden-test-case-never-leaks property verified at the HTTP-response level this
      time; and — the one that matters most — submissions actually judged by the real
      sandbox (`ACCEPTED`/`WRONG_ANSWER` reached by polling, not asserted-then-assumed),
      ownership 403, and the accepted solve showing up correctly on `/leaderboard`.

      **A real production incident during this milestone, not a hypothetical**: the
      first e2e run hung for over an hour. Diagnosed rather than just killed and
      retried — the node process had accumulated only ~13s of CPU time across that
      hour, meaning it was idle/blocked, not looping, which pointed at a stuck
      promise rather than a bug in application logic. Killing it and re-running
      revealed the real story: the test *logic* finished in 12 seconds and 2 of 3
      suites passed; Jest itself just never exited afterward because BullMQ's
      Worker/Queue/Redis connections don't fully release on `app.close()` (a
      documented Jest+BullMQ interaction, not an app bug) — `run_in_background`
      doesn't force-exit, so the zombie process sat there indefinitely. Fixed with
      `--forceExit --runInBand` on `test:e2e`. While investigating, also found and
      fixed two real bugs of its own: `deleteProblem` in the test helper tried to
      delete a Problem before its Submissions (FK violation, `Submission.problemId`
      has no cascade), and — because that first crash left orphaned rows behind
      before `--forceExit` was added — the next run's broader `deleteTestUsersByPrefix`
      then tripped over *that* orphan too. Rewrote it to cascade through
      Submissions/Problems for matching users before deleting them, so a future
      crashed run can no longer poison the next one. Reran with a hard 90s shell-level
      timeout as a permanent safety net; full suite now passes in ~12s, confirmed
      zero leftover rows and zero lingering containers afterward.

      **CI** (`.github/workflows/ci.yml`): two jobs. `server` — lint, type-check, unit
      tests, `prisma migrate deploy` against real Postgres/Redis GitHub Actions
      service containers, builds the actual `codeforge-executor` image (ubuntu-latest
      runners have Docker Engine on the host directly, no DinD needed — so CI's e2e
      run exercises the real sandbox, not a stub), runs the e2e suite, then the
      production build. `client` — lint, type-check, Vite build. Every individual
      step was run and verified locally exactly as CI would run it (including
      `prisma migrate deploy`, which hadn't been exercised before — `migrate dev` was
      the only variant used so far) before writing the workflow, rather than trusting
      it untested.
- [~] 10. Deployment — in progress. Original plan (Vercel/Render/Neon/Upstash) hit a
      real architectural blocker: Render's web services give no Docker daemon access,
      and the judge shells out to the real `docker` CLI, so it can't run there
      unmodified. Tried a hosted execution API (Piston) as a fallback — its public
      instance turned out to be gated (401, whitelist-only as of Feb 2026, discovered
      by actually testing it, not assumed) — so pivoted to running the API + judge
      worker on a free-forever Oracle Cloud "Always Free" VM instead, keeping the
      real Docker sandbox completely unchanged. Revised free stack: client→Vercel,
      Postgres→Neon, Redis→Upstash, API+judge→Oracle Cloud VM, HTTPS→Caddy +
      sslip.io (needed because a browser blocks an HTTPS frontend from calling a
      plain-HTTP API — would have silently broken the live demo otherwise).
      Code changes made and verified locally: `createRedisConnection()` helper
      (`src/queue/redis-connection.util.ts`) supports Upstash's `REDIS_URL`
      (TLS/auth) in addition to local `REDIS_HOST`/`REDIS_PORT`, used by both
      `QueueModule` and `SubmissionsService`; `main.ts` CORS now reads `CLIENT_URL`
      to restrict origins in production (falls back to allow-all when unset, for
      local dev); `.env.example` documents both. Also extracted `decideVerdict()`
      (`src/modules/submissions/judge-verdict.util.ts`) out of `JudgeProcessor` — a
      pure, independently unit-tested function for the TLE/MLE/RTE/WA verdict logic,
      including the hidden-test-case-never-leaks behavior — a genuine simplification
      that came out of this work, kept regardless of the deployment path. Full
      lint/type-check/unit/e2e suite re-verified green after all of the above.
      Wrote a full step-by-step runbook (account setup, VM provisioning, Caddy/HTTPS,
      Vercel env vars, a troubleshooting table for the specific gotchas already known
      to bite this exact setup — Oracle's dual cloud+OS-level firewall, mixed content,
      CORS mismatch, Neon's required `sslmode=require`). The actual account creation,
      VM provisioning, and go-live are steps only the user can do (external service
      signups) — not yet confirmed live.

**Local end-to-end verification (before continuing to Milestone 11)** — the user
paused deployment specifically to click through the real app in a browser first,
since every milestone through 10 had only ever been verified via `curl`/Supertest,
never by hand. This surfaced a real, significant gap that automated testing had
been masking:

**Finding**: the frontend beyond Milestone 2's initial routing scaffold was never
actually built. `Login`, `Register`, `Problems`, `ProblemDetail`, and `Submissions`
were still the Milestone-2 placeholder stubs ("Form and auth wiring land in
Milestone 3", etc.) — real, tested, working backends existed for all of Auth/
Problems/Submissions/Leaderboard, but there was almost no way to actually use them
from a browser. Only `Leaderboard.tsx` had real functionality (built properly back
in Milestone 8). Each backend milestone's own summary was honest about being
backend-only, but the cumulative effect across several milestones produced a
misleading overall picture of "done." Built out for real: `AuthContext` (JWT +
user stored in `localStorage`, axios request/response interceptors for the auth
header and 401-handling), real `Login`/`Register` forms, a real `Problems` list
and `ProblemDetail` page (statement, samples, a code editor, `Run sample` and
`Submit` wired to the real endpoints with status polling), an admin-only
`ProblemForm` (create/edit, dynamic test case rows), and a real `Submissions`
history page. Role-aware UI (`user.role === 'ADMIN'`) gates the create/edit/delete
controls — enforced for real by the backend guards regardless, this is just UX.

**Two real bugs found and fixed while manually testing the new UI, not
hypothetical**:
1. `TestCase` had no explicit ordering field — Postgres/Prisma's default row
   order for a to-many relation isn't a guaranteed contract, so "wrong answer on
   test case N" could reference a different test case than what the admin saw as
   "N" in the form. Added `TestCase.order` (migration `add_test_case_order`),
   threaded through `ProblemsService` create/update (array index → `order`) and
   `JudgeProcessor`'s query (`orderBy: { order: 'asc' }`). Verified live: a
   deliberately-wrong solution now correctly fails on the intended test case and
   shows expected/got only when that specific case is non-hidden.
2. Deleting a problem with existing submissions threw an unhandled 500 —
   `Submission.problemId` had no cascade. Discussed the real tradeoff with the
   user (cascade-delete submission history vs. block the delete vs. soft-delete)
   rather than silently picking one, since cascade means *other users'* solve
   history and leaderboard counts can be silently affected by one admin's
   action. Decided on cascade (`onDelete: Cascade`, migration
   `submission_problem_cascade`) paired with an explicit frontend confirmation
   warning naming the consequence, rather than cascade with no warning. Verified
   live via the real API: created a problem, submitted, deleted the problem,
   confirmed the submission was actually gone (404) instead of the prior 500.

Also cleaned up a real mess from repeated `start:dev` restarts during this
session: each Windows Prisma Client regenerate needs the dev server stopped
first (it holds a lock on the query engine DLL), and several restarts left
orphaned watch-mode node processes accumulating in the background rather than
actually dying — found via `Get-Process node`, confirmed which PID actually
owned which port before killing anything, so the live Vite client wasn't taken
down by accident.

**Known, not yet fixed**: the UI is functional but visually bare — the user
flagged it looks "empty and dull" compared to something like LeetCode. Agreed to
finish functional verification first, then do a dedicated visual/UX/gamification
design pass as separate, deliberate work rather than patching styles mid-test.

**Remaining verdict coverage confirmed live**: the six terminal judge statuses
had automated test coverage but had never all been triggered against the real
running stack by hand. Verified via disposable throwaway accounts + the real
API (not mocked): COMPILE_ERROR, RUNTIME_ERROR (segfault), and
TIME_LIMIT_EXCEEDED all matched on the first try. MEMORY_LIMIT_EXCEEDED did not
on the first attempt — a `malloc`+`memset` of 500MB with no later use of the
pointer got optimized away entirely by g++'s `-O2` (classic dead-store
elimination), so the binary never actually touched the memory and returned
WRONG_ANSWER instead. Confirmed this was a test-code issue, not an app bug, by
running the identical container flags manually outside the app (real 257MB
peak RSS, real OOM kill, exit 137) — then retested through the app with a
`volatile` pointer to defeat the optimization, which correctly produced
MEMORY_LIMIT_EXCEEDED with a 263MB memory reading. All test accounts cleaned
up afterward.

**Visual/UX/gamification redesign pass** — no new npm dependencies (icons are
hand-rolled inline SVGs in `client/src/components/icons.tsx`; fonts are Inter +
JetBrains Mono via a Google Fonts `<link>` in `index.html`, not a package), so
nothing outside the originally approved stack was introduced. Added a Tailwind
theme extension (`tailwind.config.js`: brand indigo accent, semantic
easy/medium/hard colors, glow shadow, fade/pop keyframes) and a global
background gradient in `index.css`. New shared components:
`components/Badge.tsx` (`DifficultyBadge`, `StatusBadge` — a single
`statusMeta` map now drives status color/icon/label everywhere instead of each
page re-implementing its own `statusColor()` function). Every page was
restyled: sticky/blurred `Navbar` with active-route highlighting and an
initials avatar; `Home` now shows a hero, three feature cards, and — for
logged-in users — a solved/total stat computed client-side from
`/problems` + `/submissions` (no backend or schema change, since the
leaderboard's own solved-count logic already lives server-side and this is
just a personal-facing echo of the same public data); `Problems` gained a
solved-checkmark per row and a client-side difficulty filter, both derived the
same way; `Leaderboard` gained medal styling for the top 3 and highlights the
current user's own row; `Submissions` gained real status badges and relative
timestamps. One deliberate small backend change alongside the frontend work:
`SubmissionsService`'s `summarySelect` now includes `problem: { select: {
title } }` so `GET /submissions` returns the problem's title instead of
forcing the frontend to show a raw truncated UUID — no migration, no new
field, just a nested select on an existing relation, verified live via a
throwaway account (submit → confirmed `problem.title` present in the
response). `ProblemDetail`'s code editor now has a tab-bar header and the
verdict panel is a proper colored card keyed off the same `statusMeta`.
Type-check and lint verified clean on both `client` and `server` after all of
the above.
- [ ] 11. Documentation, README, resume bullets

## Full UI rebuild (post-milestone-10, driven by `CodeForge_UIUX_Implementation_Guide.md`)

The user supplied a complete UI/UX specification with reference mockups. Work follows
**that document's build order (§14)**, not this file's milestone numbering. Decisions,
rejected alternatives, and deferred features are recorded in
**[`docs/DECISIONS.md`](docs/DECISIONS.md)** — read that before changing UI or
gamification code.

- [x] 1. Design system — tokens, theme provider, shared components
- [x] 2. Top bar, profile dropdown, routing shell
- [x] 3. Auth pages
- [x] 4. Problems page — real server-side filters/search/sort/counts
      (migrations: `Problem.createdAt`, `Bookmark`)
- [x] 5. Problem Detail / solve page — Monaco, split pane, live verdicts
      (migration: `Problem.editorial`, `EditorialView`)
- [x] 6. Gamification backend — append-only XP ledger, levels, streaks, badges
      (migration: `XpEntry`, `Badge`, `UserBadge`, `GamificationConfig`)
- [x] 7. Progress page — real analytics, charts, profile editing
      (migration: `User.username/bio/profileViews`)
- [x] 8. Leaderboard rebuild — XP ranking, podium, pinned current-user row, public
      profiles at /u/:username
- [x] 9. Supporting pages — Submissions (filters+pagination), Favourites, Settings
      (profile/account/preferences/notifications/danger zone), Notifications
      (migration: Notification, UserPreferences)
- [x] 10. Homepage CMS models + Home page — every string, card, review, logo, and
      link on the landing page is a DB row, not a literal (migration:
      `HomeContent` singleton, `CourseCard`, `Review`, `Company`, `SocialLink`,
      `FooterLink`, `NewsletterSubscriber`, `AuditLog`). Placeholder content
      installs itself on first read as well as via `db:seed`, and the seed never
      overwrites rows an admin has edited. Admin CMS API is complete and
      audit-logged; the *screens* that drive it land with the admin panel in
      step 12. Site footer added to the shared layout (hidden on the solve page).
- [x] 11. Resources page + CMS — hybrid content per the agreed strategy: 20 curated
      outbound links + 3 markdown reference sheets written for CodeForge, across 6
      categories, plus 4 learning paths (24 steps). Migration
      `add_resources_and_learning_paths`. Problem steps derive completion from an
      ACCEPTED submission (never self-reported); resource steps are user-ticked.
      Single seed source (`seed-data/resources.json`) — the parallel
      `resources-defaults.ts` was dead code and was merged in then deleted.
      48/48 checks verified against the real stack.
- [x] 12. Admin panel — `/admin` shell with eight screens: Dashboard (live counts +
      judge queue health), Users (search/filter, promote/demote, suspend, XP
      correction), Judge monitor, Problems, Homepage CMS, Resources CMS,
      Gamification config, Audit log. Migration
      `add_user_suspension_and_admin_xp` (`User.suspendedAt/suspendedReason`,
      `XpReason.ADMIN_ADJUSTMENT`). `JwtStrategy` now re-reads the account per
      request so suspension and role changes apply to already-issued tokens.
      69/69 backend + 29/29 UI-contract checks verified against the real stack.
- [x] 13. Responsive + accessibility pass
- [x] 14. Final verification pass

**New runtime dependencies added during the rebuild** (the only ones outside the
originally approved stack): `monaco-editor`, `@monaco-editor/react`. Icons are
hand-rolled SVGs; fonts load via a `<link>`.

**Problem catalogue**: **111 problems** (48 Easy / 42 Medium / 21 Hard, 529 test cases,
19 topics), bulk-loadable via `npm run db:seed` — see
[`docs/ADDING_PROBLEMS.md`](docs/ADDING_PROBLEMS.md). Every seeded problem has been
verified end-to-end against the real Docker judge.

Most of the catalogue is **generated, not hand-written**, by the authoring pipeline in
`server/tools/problems/`: each entry ships a reference solution, and expected outputs
are whatever that solution actually prints when executed in the real executor image.
Hand-typed expected outputs do not survive a hundred problems — one typo silently
creates an unsolvable problem. `verify-catalog.mjs` then submits every reference
solution through the real API and asserts ACCEPTED, which is what catches a problem that
is correct but breaches the time or memory limit.

## Folder structure (already scaffolded)

```
CodeForge/
├── client/          React + Vite + TS + Tailwind
│   └── src/{components,pages,hooks,services,utils}
├── server/          NestJS + TS
│   └── src/{config,modules,services,guards,prisma,queue,docker,utils,types}
├── docker/executor/ Sandboxed C++ execution image
├── docs/MILESTONES.md
└── docker-compose.yml (Postgres + Redis for local dev)
```

## Core API surface (planned, not all built yet)

All endpoints below are built as of Milestone 8. `POST /auth/refresh` was added
during Milestone 3/8 cleanup — it wasn't in the original planned list, added
because `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN` already existed in
`.env.example` with nothing using them.

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh      (added — not in the original plan, see note above)

GET    /problems          (public; paginated + search/filter/sort; personalised when a token is sent)
GET    /problems/facets   (public; real topic/difficulty/status counts for the filter panel)
GET    /problem/:id       (public; admins also receive the editorial text for the edit form)
POST   /problem                     (admin only)
PUT    /problem/:id                 (admin only)
DELETE /problem/:id                 (admin only — cascades to that problem's submissions)
GET    /problem/:id/editorial       (auth; RECORDS the view before returning content)
GET    /problem/:id/submissions     (auth; caller's attempts at this problem)
POST   /problem/:id/bookmark        (auth)
DELETE /problem/:id/bookmark        (auth)

POST   /submission
POST   /run               (sample-input run only, not saved)
GET    /submission/:id
GET    /submissions       (current user's history)

GET    /leaderboard
GET    /profile
PATCH  /profile           (auth; name / username / bio)
GET    /u/:username       (public profile; bumps the owner's view counter)

GET    /me/activity       (auth; submissions per day)
GET    /me/progress       (auth; solved vs total, per difficulty)
GET    /me/analytics      (auth; ?range=week|month|year|all)
GET    /me/profile-card   (auth; identity + level + rank + derived skills)
GET    /me/gamification   (auth; XP, level, streak, badges — also performs the daily check-in)
GET    /me/skills         (auth; XP per topic)
GET    /me/xp-history     (auth; recent ledger entries)

GET    /home                    (public; hero, courses, reviews, companies, socials, footer)
POST   /newsletter              (public; subscribe — uniform response, 10/min limit)
POST   /newsletter/unsubscribe  (public)

GET    /admin/home              (admin; includes unpublished rows)
PATCH  /admin/home/content      (admin; hero / contact / footer / newsletter copy)
GET    /admin/home/newsletter   (admin; subscriber list)
POST PATCH DELETE /admin/home/courses[/:id]       (admin)
POST PATCH DELETE /admin/home/reviews[/:id]       (admin)
POST PATCH DELETE /admin/home/companies[/:id]     (admin)
PUT       DELETE /admin/home/socials[/:id]        (admin; one row per platform)
POST PATCH DELETE /admin/home/footer-links[/:id]  (admin)

GET    /resources                 (public; ?search=&category=&type=)
GET    /resources/categories      (public; with counts)
GET    /resources/paths           (public; per-user completion when a token is sent)
GET    /resources/:slug           (public; sheet markdown body)
PATCH  /resources/paths/steps/:id (auth; tick a RESOURCE step — problem steps are judged)

GET    /admin/resources           (admin; includes unpublished)
POST PATCH DELETE /admin/resources[/:id]            (admin)
POST PATCH DELETE /admin/resources/categories[/:id] (admin)
POST PATCH DELETE /admin/resources/paths[/:id]      (admin)

GET    /admin/stats               (admin; dashboard counts + queue health)
GET    /admin/audit               (admin; recent mutations)
GET    /admin/users               (admin; ?search=&role=&suspended=&page=)
GET    /admin/users/:id           (admin)
PATCH  /admin/users/:id/role      (admin; blocked for self / last admin)
PATCH  /admin/users/:id/suspension(admin; revokes live tokens immediately)
POST   /admin/users/:id/xp        (admin; appends an ADMIN_ADJUSTMENT ledger entry)
GET    /admin/submissions         (admin; judge monitor — never returns `code`)
GET    PATCH /admin/gamification  (admin; XP values + level thresholds)

POST   /admin/uploads             (admin; multipart image, max 2 MB)
DELETE /admin/uploads/:filename   (admin)
GET    /uploads/:filename         (public static; served by useStaticAssets)
```

Every `/admin/*` mutation writes an `AuditLog` row (guide §11) through the global
`AuditService`. Logging happens *after* the write succeeds, and never throws — an
audit failure must not roll back the change an admin was just told had saved.

## Instructions for Claude Code specifically

- Ask before introducing new technologies not listed above.
- Preserve clean architecture and Git history.
- Treat all submitted code as untrusted; never relax container isolation, resource limits,
  or timeouts for convenience.
- Confirm which milestone we're on before generating code — don't assume.
