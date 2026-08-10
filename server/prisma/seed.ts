/**
 * Bulk-loads problems from prisma/seed-data/problems.json.
 *
 * Idempotent: problems are matched by title, so re-running updates the existing
 * problem (replacing its tags and test cases) rather than creating duplicates.
 * Existing submissions are never touched.
 *
 *   npm run db:seed
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BadgeCriteria, BadgeRarity, Difficulty, PrismaClient, ResourceType, Role } from '@prisma/client';
import {
  HOME_CONTENT_ID,
  defaultCompanies,
  defaultCourseCards,
  defaultFooterLinks,
  defaultHomeContent,
  defaultReviews,
  defaultSocialLinks,
} from '../src/modules/home/home-defaults';

const prisma = new PrismaClient();

interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

interface SeedProblem {
  title: string;
  difficulty: keyof typeof Difficulty;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  timeLimit: number;
  memoryLimit: number;
  tags?: string[];
  testCases: SeedTestCase[];
}

function loadProblems(): SeedProblem[] {
  const file = join(__dirname, 'seed-data', 'problems.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as SeedProblem[];
  if (!Array.isArray(parsed)) {
    throw new Error('seed-data/problems.json must contain a JSON array');
  }
  return parsed;
}

/** Problems need an owner. Prefer SEED_ADMIN_EMAIL, else fall back to any admin. */
async function resolveAuthorId(): Promise<string> {
  const preferred = process.env.SEED_ADMIN_EMAIL;

  if (preferred) {
    const user = await prisma.user.findUnique({ where: { email: preferred }, select: { id: true, role: true } });
    if (!user) throw new Error(`SEED_ADMIN_EMAIL is set to "${preferred}" but no such user exists.`);
    if (user.role !== Role.ADMIN) throw new Error(`User "${preferred}" is not an ADMIN.`);
    return user.id;
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true, email: true } });
  if (!admin) {
    throw new Error(
      'No ADMIN user found. Register an account first, promote it to ADMIN, then re-run the seed.\n' +
        'You can also point the seeder at a specific account with SEED_ADMIN_EMAIL=you@example.com',
    );
  }
  console.log(`Using admin "${admin.email}" as the problem author.`);
  return admin.id;
}

async function resolveTagIds(names: string[]): Promise<string[]> {
  const tags = await Promise.all(
    names.map((name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } })),
  );
  return tags.map((tag) => tag.id);
}

interface SeedBadge {
  code: string;
  name: string;
  description: string;
  criteria: keyof typeof BadgeCriteria;
  threshold: number;
  rarity: keyof typeof BadgeRarity;
  xpReward: number;
  order: number;
}

/** Badge definitions are upserted by code, so tweaking one in JSON updates it in place. */
async function seedBadges() {
  const file = join(__dirname, 'seed-data', 'badges.json');
  const badges = JSON.parse(readFileSync(file, 'utf8')) as SeedBadge[];

  for (const badge of badges) {
    const data = {
      name: badge.name,
      description: badge.description,
      criteria: BadgeCriteria[badge.criteria],
      threshold: badge.threshold,
      rarity: BadgeRarity[badge.rarity],
      xpReward: badge.xpReward,
      order: badge.order,
    };
    await prisma.badge.upsert({ where: { code: badge.code }, update: data, create: { code: badge.code, ...data } });
  }
  console.log(`  ${badges.length} badge definitions in place`);
}

/**
 * Installs the placeholder homepage content if it isn't there yet.
 *
 * Deliberately never overwrites: once an admin has edited the hero copy or removed a
 * course card, re-running the seed must not undo that. Collections that already have
 * rows are left completely alone.
 */
async function seedHomepage() {
  const existing = await prisma.homeContent.findUnique({ where: { id: HOME_CONTENT_ID } });
  if (existing) {
    console.log('  homepage content already present — left untouched');
  } else {
    await prisma.homeContent.create({ data: defaultHomeContent });
    console.log('  created homepage content');
  }

  const collections = [
    ['course cards', () => prisma.courseCard.count(), () => prisma.courseCard.createMany({ data: defaultCourseCards })],
    ['reviews', () => prisma.review.count(), () => prisma.review.createMany({ data: defaultReviews })],
    ['companies', () => prisma.company.count(), () => prisma.company.createMany({ data: defaultCompanies })],
    ['social links', () => prisma.socialLink.count(), () => prisma.socialLink.createMany({ data: defaultSocialLinks })],
    ['footer links', () => prisma.footerLink.count(), () => prisma.footerLink.createMany({ data: defaultFooterLinks })],
  ] as const;

  for (const [label, count, create] of collections) {
    if ((await count()) > 0) {
      console.log(`  ${label} already present — left untouched`);
      continue;
    }
    const { count: created } = await create();
    console.log(`  created ${created} ${label}`);
  }
}

interface SeedResourceFile {
  categories: { slug: string; name: string; icon: string; accent: string; order: number }[];
  resources: {
    slug: string;
    title: string;
    description: string;
    type: keyof typeof ResourceType;
    category: string;
    url?: string;
    body?: string;
    estimatedMinutes?: number;
    order: number;
  }[];
  paths: {
    slug: string;
    title: string;
    description: string;
    icon: string;
    accent: string;
    order: number;
    steps: { resource?: string; problem?: string; label?: string }[];
  }[];
}

/**
 * Resources, categories and learning paths.
 *
 * Categories and resources are upserted by slug so edits to the JSON propagate, but
 * learning paths are only created when absent: their steps reference problems by
 * title, and silently rebuilding a path an admin has curated would be destructive.
 */
async function seedResources() {
  const file = join(__dirname, 'seed-data', 'resources.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as SeedResourceFile;

  const categoryIds = new Map<string, string>();
  for (const category of data.categories) {
    const row = await prisma.resourceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, accent: category.accent, order: category.order },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }

  const resourceIds = new Map<string, string>();
  for (const resource of data.resources) {
    const categoryId = categoryIds.get(resource.category);
    if (!categoryId) throw new Error(`Resource "${resource.slug}" references unknown category "${resource.category}"`);

    const payload = {
      title: resource.title,
      description: resource.description,
      type: ResourceType[resource.type],
      categoryId,
      url: resource.url ?? null,
      body: resource.body ?? null,
      estimatedMinutes: resource.estimatedMinutes ?? null,
      order: resource.order,
    };
    const row = await prisma.resource.upsert({
      where: { slug: resource.slug },
      update: payload,
      create: { slug: resource.slug, ...payload },
    });
    resourceIds.set(resource.slug, row.id);
  }
  console.log(`  ${data.categories.length} resource categories, ${data.resources.length} resources in place`);

  for (const path of data.paths) {
    const existing = await prisma.learningPath.findUnique({ where: { slug: path.slug }, select: { id: true } });
    if (existing) {
      console.log(`  learning path "${path.title}" already present — left untouched`);
      continue;
    }

    const steps = [];
    for (const [index, step] of path.steps.entries()) {
      let problemId: string | null = null;
      if (step.problem) {
        const problem = await prisma.problem.findFirst({ where: { title: step.problem }, select: { id: true } });
        if (!problem) {
          console.log(`  skipped step "${step.problem}" in "${path.title}" — no such problem`);
          continue;
        }
        problemId = problem.id;
      }
      const resourceId = step.resource ? (resourceIds.get(step.resource) ?? null) : null;
      if (!problemId && !resourceId) continue;

      steps.push({ order: index, label: step.label ?? null, resourceId, problemId });
    }

    await prisma.learningPath.create({
      data: {
        slug: path.slug,
        title: path.title,
        description: path.description,
        icon: path.icon,
        accent: path.accent,
        order: path.order,
        steps: { create: steps.map((step, i) => ({ ...step, order: i })) },
      },
    });
    console.log(`  created learning path "${path.title}" with ${steps.length} steps`);
  }
}

async function main() {
  const problems = loadProblems();
  const createdById = await resolveAuthorId();

  let created = 0;
  let updated = 0;

  for (const problem of problems) {
    const tagIds = await resolveTagIds(problem.tags ?? []);

    const scalars = {
      title: problem.title,
      difficulty: Difficulty[problem.difficulty],
      statement: problem.statement,
      constraints: problem.constraints,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      sampleInput: problem.sampleInput,
      sampleOutput: problem.sampleOutput,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
    };

    const testCases = {
      create: problem.testCases.map((tc, index) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden ?? true,
        order: index,
      })),
    };

    const existing = await prisma.problem.findFirst({ where: { title: problem.title }, select: { id: true } });

    if (existing) {
      await prisma.problem.update({
        where: { id: existing.id },
        data: {
          ...scalars,
          testCases: { deleteMany: {}, ...testCases },
          tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
      updated++;
      console.log(`  updated  ${problem.title}`);
    } else {
      await prisma.problem.create({
        data: {
          ...scalars,
          createdById,
          testCases,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
      created++;
      console.log(`  created  ${problem.title}`);
    }
  }

  await seedBadges();
  await seedHomepage();
  await seedResources();

  const total = await prisma.problem.count();
  console.log(`\nSeed complete — ${created} created, ${updated} updated. ${total} problems in the database.`);
}

main()
  .catch((err) => {
    console.error(`\nSeed failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
