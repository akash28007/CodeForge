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

15 problems ship in the seed file — 8 Easy, 5 Medium, 2 Hard — spanning arrays,
strings, math, dynamic programming, binary search, hashing, matrix, and
two-pointers. Every one has been verified end-to-end against the real Docker judge.
