/**
 * Submits every catalogue problem's reference solution through the **real running API**
 * and asserts it is ACCEPTED.
 *
 * The builder already guarantees expected outputs match what the reference prints, but
 * that says nothing about whether the problem is solvable *under the judge's limits* —
 * a solution can be correct and still blow the time or memory cap on the largest test.
 * This is the check that catches an unsolvable problem before a user finds it.
 *
 * Requires: the API running on :4000, Docker up, and the catalogue already seeded.
 */
import { readdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PrismaClient } from '@prisma/client';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(HERE, 'catalog');
const BASE = 'http://localhost:4000';
const prisma = new PrismaClient();
const j = (r) => r.json().catch(() => null);

const only = process.argv[2] ?? '';

const files = (await readdir(CATALOG_DIR)).filter((f) => f.endsWith('.mjs')).sort();
const catalogue = [];
for (const f of files) {
  const mod = await import(pathToFileURL(join(CATALOG_DIR, f)).href);
  catalogue.push(...mod.default);
}
const targets = only ? catalogue.filter((p) => p.title.toLowerCase().includes(only.toLowerCase())) : catalogue;
console.log(`Verifying ${targets.length} problem(s) against the real judge.\n`);

const email = `catalog-verify-${Date.now()}@example.invalid`;
const reg = await fetch(`${BASE}/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Catalog Verifier', email, password: 'Passw0rd!23' }),
}).then(j);
const auth = { authorization: `Bearer ${reg.accessToken}`, 'content-type': 'application/json' };

const byTitle = new Map(
  (await prisma.problem.findMany({ select: { id: true, title: true } })).map((p) => [p.title, p.id]),
);

async function judge(problem) {
  const id = byTitle.get(problem.title);
  if (!id) return { ok: false, status: 'NOT_SEEDED' };

  const res = await fetch(`${BASE}/submission`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ problemId: id, code: problem.solution, language: 'cpp' }),
  }).then(j);
  if (!res?.id) return { ok: false, status: 'SUBMIT_FAILED' };

  for (let i = 0; i < 150; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const s = await fetch(`${BASE}/submission/${res.id}`, { headers: auth }).then(j);
    if (s && s.status !== 'PENDING' && s.status !== 'RUNNING') {
      return {
        ok: s.status === 'ACCEPTED',
        status: s.status,
        passed: `${s.passedCount}/${s.totalCount}`,
        runtime: s.runtime,
        memory: s.memory,
        error: (s.errorMessage ?? '').split('\n')[0].slice(0, 120),
      };
    }
  }
  return { ok: false, status: 'TIMED_OUT_POLLING' };
}

// A small amount of parallelism: the judge caps its own concurrency, so this just keeps
// the queue fed rather than waiting a full round trip per problem.
const CONCURRENCY = 4;
const results = [];
let cursor = 0;
let slowest = { runtime: 0 };

async function worker() {
  while (cursor < targets.length) {
    const problem = targets[cursor++];
    const r = await judge(problem);
    results.push({ title: problem.title, difficulty: problem.difficulty, ...r });
    if ((r.runtime ?? 0) > slowest.runtime) slowest = { title: problem.title, runtime: r.runtime };
    process.stdout.write(
      `${r.ok ? '  ok  ' : ' FAIL '}${problem.title.padEnd(44).slice(0, 44)} ${r.status}${r.ok ? ` ${r.passed} ${r.runtime ?? '?'}ms` : ` ${r.error ?? ''}`}\n`,
    );
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} reference solutions ACCEPTED`);
if (slowest.title) console.log(`slowest: ${slowest.title} at ${slowest.runtime}ms`);
if (failed.length) {
  console.log('\nFAILURES:');
  for (const f of failed) console.log(`  ${f.title} [${f.difficulty}] → ${f.status} ${f.error ?? ''}`);
}

// The verifier account exists only for this run.
const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
if (user) {
  await prisma.xpEntry.deleteMany({ where: { userId: user.id } });
  await prisma.userBadge.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.userPreferences.deleteMany({ where: { userId: user.id } });
  await prisma.submission.deleteMany({ where: { userId: user.id } });
  await prisma.review.deleteMany({ where: { authorId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`\ncleaned up ${email}`);
}

await prisma.$disconnect();
process.exit(failed.length ? 1 : 0);
