import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaClient, Role } from '@prisma/client';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}

const prisma = new PrismaClient();

/** Promotes a just-registered user straight to ADMIN — there is no API route for this by design. */
export async function promoteToAdmin(email: string): Promise<void> {
  await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
}

export async function deleteTestUser(email: string): Promise<void> {
  await prisma.user.deleteMany({ where: { email } });
}

export async function deleteTestUsersByPrefix(prefix: string): Promise<void> {
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    return;
  }

  // Self-healing cleanup: also removes anything these users own, even if a previous
  // test run crashed mid-teardown and left orphaned rows behind.
  await prisma.submission.deleteMany({ where: { userId: { in: userIds } } });
  const problems = await prisma.problem.findMany({ where: { createdById: { in: userIds } }, select: { id: true } });
  const problemIds = problems.map((p) => p.id);
  if (problemIds.length > 0) {
    await prisma.submission.deleteMany({ where: { problemId: { in: problemIds } } });
    await prisma.problemTag.deleteMany({ where: { problemId: { in: problemIds } } });
    await prisma.problem.deleteMany({ where: { id: { in: problemIds } } });
  }
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function deleteProblem(id: string): Promise<void> {
  // Submission.problemId has no onDelete: Cascade — submissions must go first.
  await prisma.submission.deleteMany({ where: { problemId: id } });
  await prisma.problem.deleteMany({ where: { id } });
}

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

export async function disconnectTestPrisma(): Promise<void> {
  await prisma.$disconnect();
}
