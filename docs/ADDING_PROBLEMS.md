# Adding problems to CodeForge

There are three ways to add problems. Use whichever fits the situation.

---

## 1. Bulk seed from a file (recommended for adding many)

Problems live in [`server/prisma/seed-data/problems.json`](../server/prisma/seed-data/problems.json).
Add entries to that array, then run:

```
cd server
npm run db:seed
```

The seeder is **idempotent** — it matches problems by title, so re-running updates
an existing problem (replacing its tags and test cases) instead of creating a
duplicate. Existing submissions are never touched.

### Entry format

```json
{
  "title": "Sum of Two Numbers",
  "difficulty": "EASY",
  "statement": "Given two integers a and b, print their sum.",
  "constraints": "-10^9 <= a, b <= 10^9",
  "inputFormat": "A single line containing two space-separated integers.",
  "outputFormat": "A single integer — the sum.",
  "sampleInput": "2 3",
  "sampleOutput": "5",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "tags": ["math", "basics"],
  "testCases": [
    { "input": "2 3", "expectedOutput": "5", "isHidden": false },
    { "input": "10 20", "expectedOutput": "30", "isHidden": true }
  ]
}
```

| Field | Notes |
|---|---|
| `difficulty` | `EASY`, `MEDIUM`, or `HARD` |
| `timeLimit` | milliseconds, enforced by the sandbox |
| `memoryLimit` | MB, enforced by the sandbox |
| `tags` | created automatically if they don't exist yet |
| `testCases` | order in the array **is** the judging order ("test case 1" = first entry) |
| `isHidden` | `true` (default) hides expected/actual output on failure. Keep at least one `false` so users get useful feedback |

Use `\n` inside `input` / `expectedOutput` for multi-line data.

### Choosing the author

Problems need an owner. The seeder uses the first `ADMIN` user it finds. To pin it
to a specific account:

```
set SEED_ADMIN_EMAIL=you@example.com
npm run db:seed
```

If no admin exists yet, register an account first and promote it (see below).

### Verify what you added

Always confirm a correct solution actually gets `ACCEPTED` — a typo in an expected
output silently creates an unsolvable problem. Submit through the UI, or check the
whole catalog at once via the API.

---

## 2. Admin UI (best for one-offs)

Sign in as an admin → **Problems** → **+ New Problem**. The form handles the
statement, limits, tags, and dynamic test case rows. Test case order in the form is
the judging order.

---

## 3. API (for scripting against a running server)

```
POST /problem          (admin only, Bearer token)
PUT  /problem/:id      (admin only)
DELETE /problem/:id    (admin only — cascades to that problem's submissions)
```

The request body is the same shape as a seed entry.

---

## Promoting a user to admin

There is intentionally no self-service admin promotion. Do it directly in the
database:

```
cd server
npx prisma studio
```

Open the `User` table, change `role` from `USER` to `ADMIN`, save.

---

## Current catalog

**111 problems** — 48 Easy, 42 Medium, 21 Hard, 529 test cases — across 19 topics:
arrays, strings, math, number theory, dynamic programming, knapsack, greedy,
binary search, two pointers, hashing, sorting, prefix sums, bit manipulation,
recursion, matrix, stack, graphs, implementation and basics.

Every problem has been verified end-to-end against the real Docker judge.

---

## 4. The authoring pipeline (how the bulk of the catalog was built)

Hand-typing expected outputs does not survive contact with a hundred problems — one
typo silently creates a problem nobody can solve. So most of the catalog is generated:
each entry ships a **reference solution**, and the expected outputs are whatever that
solution actually prints.

```
server/tools/problems/
├── catalog/            authored problems, grouped by topic
├── build-problems.mjs  runs the reference solutions → writes seed-data/problems.json
└── verify-catalog.mjs  submits every reference solution to the real judge
```

### Adding problems this way

Add an entry to a file in `catalog/` (or create a new one — every `.mjs` file there is
picked up automatically):

```js
{
  title: 'Array Sum',
  difficulty: 'EASY',
  statement: '...',
  constraints: '...',
  inputFormat: '...',
  outputFormat: '...',
  tags: ['arrays', 'basics'],
  visible: 2,               // first 2 tests are non-hidden; the rest are hidden
  timeLimit: 1000,          // optional, defaults to 1000ms
  memoryLimit: 256,         // optional, defaults to 256MB
  solution: `#include <bits/stdc++.h> ...`,   // reference solution, C++
  tests: ['5\n1 2 3 4 5', '1\n-7'],           // inputs only — outputs are generated
}
```

Then:

```
cd server
node tools/problems/build-problems.mjs        # or pass a filename fragment
npm run db:seed
node tools/problems/verify-catalog.mjs        # needs the API + Docker running
```

**`tests[0]` becomes the worked example** shown on the problem page, so keep it small
enough to follow by eye. The sample output is generated from it too, which means the
sample can never disagree with what the judge expects.

The builder compiles each reference solution inside the real `codeforge-executor` image
and refuses to continue if one fails to compile, crashes, or prints nothing — so a
broken entry is caught at build time rather than by a user.

Entries already in `problems.json` are preserved unless the catalog redefines the same
title, so the originals are never clobbered.

### Why verify separately

The builder guarantees the expected output matches what the reference prints. It says
nothing about whether the problem is solvable **under the judge's limits** — a correct
solution can still exceed the time or memory cap on the largest test. `verify-catalog.mjs`
submits every reference solution through the real API and asserts `ACCEPTED`, which is
the check that catches an unsolvable problem. It cleans up its throwaway account after.
