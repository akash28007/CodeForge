# CodeForge — Context for Claude Code

This file is the handoff from planning done in claude.ai chat. Read this fully before doing anything.

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
- [ ] 11. Documentation, README, resume bullets

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
POST /auth/register
POST /auth/login
POST /auth/refresh        (added — not in the original plan, see note above)
GET  /problems
GET  /problem/:id
POST /problem            (admin only)
PUT  /problem/:id        (admin only)
DELETE /problem/:id      (admin only)
POST /submission
POST /run                 (sample-input run only, not saved)
GET  /submission/:id
GET  /submissions         (current user's history)
GET  /leaderboard
GET  /profile
```

## Instructions for Claude Code specifically

- Ask before introducing new technologies not listed above.
- Preserve clean architecture and Git history.
- Treat all submitted code as untrusted; never relax container isolation, resource limits,
  or timeouts for convenience.
- Confirm which milestone we're on before generating code — don't assume.
