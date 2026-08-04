import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  deleteProblem,
  deleteTestUsersByPrefix,
  disconnectTestPrisma,
  promoteToAdmin,
  uniqueEmail,
} from './utils/bootstrap';

describe('Problems (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  const emailPrefix = 'e2e-problems';

  beforeAll(async () => {
    app = await createTestApp();
    const http = app.getHttpServer();

    const adminEmail = uniqueEmail('problems-admin');
    await request(http)
      .post('/auth/register')
      .send({ name: 'Admin', email: adminEmail, password: 'password123' })
      .expect(201);
    await promoteToAdmin(adminEmail);
    const adminLogin = await request(http)
      .post('/auth/login')
      .send({ email: adminEmail, password: 'password123' })
      .expect(201);
    adminToken = adminLogin.body.accessToken;

    const userEmail = uniqueEmail('problems-user');
    const userRes = await request(http)
      .post('/auth/register')
      .send({ name: 'User', email: userEmail, password: 'password123' })
      .expect(201);
    userToken = userRes.body.accessToken;
  });

  afterAll(async () => {
    await deleteTestUsersByPrefix(emailPrefix);
    await app.close();
    await disconnectTestPrisma();
  });

  const validProblemPayload = {
    title: 'E2E Sum',
    difficulty: 'EASY',
    statement: 's',
    constraints: 'c',
    inputFormat: 'i',
    outputFormat: 'o',
    sampleInput: '1 2',
    sampleOutput: '3',
    timeLimit: 1000,
    memoryLimit: 128,
    tags: ['e2e-tag'],
    testCases: [
      { input: '1 2', expectedOutput: '3', isHidden: false },
      { input: '5 5', expectedOutput: '10', isHidden: true },
    ],
  };

  it('blocks a non-admin from creating a problem (403)', async () => {
    await request(app.getHttpServer())
      .post('/problem')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validProblemPayload)
      .expect(403);
  });

  it('blocks an unauthenticated request from creating a problem (401)', async () => {
    await request(app.getHttpServer()).post('/problem').send(validProblemPayload).expect(401);
  });

  it('rejects an incomplete payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/problem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Incomplete' })
      .expect(400);
  });

  describe('with a created problem', () => {
    let problemId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/problem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProblemPayload)
        .expect(201);
      problemId = res.body.id;
    });

    afterAll(async () => {
      await deleteProblem(problemId);
    });

    it('never leaks test case data through the public list endpoint', async () => {
      const res = await request(app.getHttpServer()).get('/problems').expect(200);
      const found = res.body.find((p: { id: string }) => p.id === problemId);
      expect(found).toBeDefined();
      expect(found).not.toHaveProperty('testCases');
    });

    it('never leaks test case data through the public detail endpoint', async () => {
      const res = await request(app.getHttpServer()).get(`/problem/${problemId}`).expect(200);
      expect(res.body).not.toHaveProperty('testCases');
      expect(res.body.sampleInput).toBe('1 2');
    });

    it('404s for a nonexistent problem id', async () => {
      await request(app.getHttpServer()).get('/problem/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('lets an admin update the problem, and the change is visible publicly', async () => {
      await request(app.getHttpServer())
        .put(`/problem/${problemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E Sum (renamed)' })
        .expect(200);

      const res = await request(app.getHttpServer()).get(`/problem/${problemId}`).expect(200);
      expect(res.body.title).toBe('E2E Sum (renamed)');
    });

    it('blocks a non-admin from deleting the problem (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/problem/${problemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  it('lets an admin delete a problem, and it is gone afterward', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/problem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validProblemPayload)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/problem/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer()).get(`/problem/${createRes.body.id}`).expect(404);
  });
});
