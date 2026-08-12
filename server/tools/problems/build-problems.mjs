/**
 * Builds `prisma/seed-data/problems.json` from the authored catalogue.
 *
 * The point of this tool: **expected outputs are never written by hand.** Each catalogue
 * entry ships a reference solution and a list of inputs; this script compiles that
 * solution inside the real executor image and records what it actually prints. A typo in
 * an expected output silently creates an unsolvable problem, and at ~100 problems that
 * is a matter of when, not if.
 *
 * Existing entries in problems.json are preserved unless the catalogue redefines the same
 * title, so the already-verified originals are not disturbed.
 *
 *   node tools/problems/build-problems.mjs            # build everything
 *   node tools/problems/build-problems.mjs arrays     # only catalogue files matching
 */
import { spawn } from 'child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(HERE, 'catalog');
const OUT_FILE = join(HERE, '..', '..', 'prisma', 'seed-data', 'problems.json');
const IMAGE = 'codeforge-executor';
const COMPILE_TIMEOUT_MS = 20_000;
const RUN_TIMEOUT_MS = 60_000;

const filter = process.argv[2] ?? '';

function run(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const killer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', (e) => {
      clearTimeout(killer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * Compiles one reference solution and runs it against every input in a single container.
 *
 * One container per *problem* rather than per test case: this is trusted, first-party
 * code being executed at build time, so the per-test isolation the judge needs buys
 * nothing here and would multiply a ~2s job by the test count.
 */
async function generateOutputs(problem) {
  const work = await mkdtemp(join(tmpdir(), 'codeforge-authoring-'));
  const inDir = join(work, 'in');
  const outDir = join(work, 'out');
  await mkdir(inDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  await writeFile(join(work, 'main.cpp'), problem.solution, 'utf8');
  for (const [i, input] of problem.tests.entries()) {
    // Trailing newline: a program reading with `cin >>` in a loop otherwise blocks on
    // the last token in some formulations.
    await writeFile(join(inDir, `${String(i).padStart(3, '0')}.txt`), input.endsWith('\n') ? input : `${input}\n`, 'utf8');
  }

  const script = [
    'set -e',
    'g++ -O2 -Wall -o /tmp/ref /work/main.cpp 2> /work/out/_compile.err',
    'for f in /work/in/*.txt; do',
    '  /tmp/ref < "$f" > "/work/out/$(basename "$f")" 2> "/work/out/$(basename "$f").err" || echo "EXIT:$?" > "/work/out/$(basename "$f").rc"',
    'done',
  ].join('\n');

  const result = await run(
    'docker',
    [
      'run',
      '--rm',
      '--network', 'none',
      '--memory', '1g',
      '--cpus', '2',
      '-v', `${work}:/work:rw`,
      IMAGE,
      script,
    ],
    COMPILE_TIMEOUT_MS + RUN_TIMEOUT_MS,
  );

  const compileErr = await readFile(join(outDir, '_compile.err'), 'utf8').catch(() => '');
  if (result.code !== 0) {
    await rm(work, { recursive: true, force: true });
    throw new Error(
      `Reference solution failed for "${problem.title}" (exit ${result.code})\n` +
        `${compileErr.trim() || result.stderr.trim()}`,
    );
  }
  if (compileErr.trim()) {
    console.warn(`  ⚠ ${problem.title}: compiler warnings\n${compileErr.trim().split('\n').slice(0, 4).join('\n')}`);
  }

  const outputs = [];
  for (const [i] of problem.tests.entries()) {
    const name = `${String(i).padStart(3, '0')}.txt`;
    if (existsSync(join(outDir, `${name}.rc`))) {
      await rm(work, { recursive: true, force: true });
      throw new Error(`Reference solution crashed on test ${i + 1} of "${problem.title}"`);
    }
    const raw = await readFile(join(outDir, name), 'utf8');
    const trimmed = raw.replace(/\s+$/, '');
    if (trimmed === '') {
      await rm(work, { recursive: true, force: true });
      throw new Error(`Reference solution produced no output on test ${i + 1} of "${problem.title}"`);
    }
    outputs.push(trimmed);
  }

  await rm(work, { recursive: true, force: true });
  return outputs;
}

function toSeedEntry(problem, outputs) {
  const visible = problem.visible ?? 1;
  return {
    title: problem.title,
    difficulty: problem.difficulty,
    statement: problem.statement,
    constraints: problem.constraints,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    // The first test doubles as the worked example shown on the problem page, so the
    // sample can never disagree with what the judge actually expects.
    sampleInput: problem.tests[0].replace(/\s+$/, ''),
    sampleOutput: outputs[0],
    timeLimit: problem.timeLimit ?? 1000,
    memoryLimit: problem.memoryLimit ?? 256,
    tags: problem.tags,
    ...(problem.editorial ? { editorial: problem.editorial } : {}),
    testCases: problem.tests.map((input, i) => ({
      input: input.replace(/\s+$/, ''),
      expectedOutput: outputs[i],
      isHidden: i >= visible,
    })),
  };
}

async function main() {
  const files = (await readdir(CATALOG_DIR))
    .filter((f) => f.endsWith('.mjs'))
    .filter((f) => !filter || f.includes(filter))
    .sort();

  if (files.length === 0) {
    console.error(`No catalogue files matched "${filter}" in ${CATALOG_DIR}`);
    process.exit(1);
  }

  const catalogue = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(CATALOG_DIR, file)).href);
    catalogue.push(...mod.default);
  }
  console.log(`Loaded ${catalogue.length} authored problem(s) from ${files.length} file(s).`);

  const titles = new Set();
  for (const p of catalogue) {
    if (titles.has(p.title)) throw new Error(`Duplicate title in the catalogue: "${p.title}"`);
    titles.add(p.title);
  }

  const built = [];
  let done = 0;
  for (const problem of catalogue) {
    const outputs = await generateOutputs(problem);
    built.push(toSeedEntry(problem, outputs));
    done += 1;
    process.stdout.write(`\r  generated ${done}/${catalogue.length}  ${problem.title.padEnd(42).slice(0, 42)}`);
  }
  process.stdout.write('\n');

  const existing = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  const kept = existing.filter((e) => !titles.has(e.title));
  const merged = [...kept, ...built];

  await writeFile(OUT_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  const byDiff = merged.reduce((acc, p) => ({ ...acc, [p.difficulty]: (acc[p.difficulty] ?? 0) + 1 }), {});
  console.log(`\nWrote ${merged.length} problems to seed-data/problems.json`);
  console.log(`  kept ${kept.length} existing, generated ${built.length}`);
  console.log(`  ${JSON.stringify(byDiff)}`);
  console.log(`  ${merged.reduce((n, p) => n + p.testCases.length, 0)} test cases total`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
