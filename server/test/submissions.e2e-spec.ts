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

// Real compile + sandboxed run against Docker — several seconds per judged submission.
jest.setTimeout(30_000);

const CORRECT_CODE = '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<(a+b)<<std::endl;return 0;}';
const WRONG_CODE = '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<0<<std::endl;return 0;}';

async function pollUntilJudged(http: any, submissionId: string, token: string) {
  const terminal = ['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED'];
  for (let i = 0; i < 15; i++) {
    const res = await request(http).get(`/submission/${submissionId}`).set('Authorization', `Bearer ${token}`);
    if (terminal.includes(res.body.status)) {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Submission did not reach a terminal status in time');
}

describe('Submissions + Leaderboard (e2e, real Docker judging)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let problemId: string;
  const emailPrefix = 'e2e-submissions';

  beforeAll(async () => {
    app = await createTestApp();
    const http = app.getHttpServer();

    const adminEmail = uniqueEmail('submissions-admin');
    await request(http).post('/auth/register').send({ name: 'Admin', email: adminEmail, password: 'password123' });
    await promoteToAdmin(adminEmail);
    const adminLogin = await request(http)
      .post('/auth/login')
      .send({ email: adminEmail, password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const userEmail = uniqueEmail('submissions-user');
    const userRes = await request(http)
      .post('/auth/register')
      .send({ name: 'Solver', email: userEmail, password: 'password123' });
    userToken = userRes.body.accessToken;
    userId = userRes.body.user.id;

    const problemRes = await request(http)
      .post('/problem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'E2E Sum',
        difficulty: 'EASY',
        statement: 's',
        constraints: 'c',
        inputFormat: 'i',
        outputFormat: 'o',
        sampleInput: '2 3',
        sampleOutput: '5',
        timeLimit: 2000,
        memoryLimit: 128,
        testCases: [{ input: '2 3', expectedOutput: '5', isHidden: false }],
      });
    problemId = problemRes.body.id;
  });

  afterAll(async () => {
    await deleteProblem(problemId);
    await deleteTestUsersByPrefix(emailPrefix);
    await app.close();
    await disconnectTestPrisma();
  });

  it('404s when submitting to a nonexistent problem', async () => {
    await request(app.getHttpServer())
      .post('/submission')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ problemId: '00000000-0000-0000-0000-000000000000', code: 'x' })
      .expect(404);
  });

  it('blocks an unauthenticated submission attempt (401)', async () => {
    await request(app.getHttpServer()).post('/submission').send({ problemId, code: 'x' }).expect(401);
  });

  it('judges a correct submission to ACCEPTED end-to-end through the real sandbox', async () => {
    const http = app.getHttpServer();
    const submitRes = await request(http)
      .post('/submission')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ problemId, code: CORRECT_CODE })
      .expect(201);
    expect(submitRes.body.status).toBe('PENDING');

    const judged = await pollUntilJudged(http, submitRes.body.id, userToken);
    expect(judged.status).toBe('ACCEPTED');
    expect(judged.passedCount).toBe(judged.totalCount);
  });

  it('judges a wrong submission to WRONG_ANSWER', async () => {
    const http = app.getHttpServer();
    const submitRes = await request(http)
      .post('/submission')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ problemId, code: WRONG_CODE })
      .expect(201);

    const judged = await pollUntilJudged(http, submitRes.body.id, userToken);
    expect(judged.status).toBe('WRONG_ANSWER');
  });

  it('blocks a different user from viewing someone else\'s submission (403)', async () => {
    const http = app.getHttpServer();
    const submitRes = await request(http)
      .post('/submission')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ problemId, code: CORRECT_CODE })
      .expect(201);

    const otherEmail = uniqueEmail('submissions-other');
    const otherRes = await request(http)
      .post('/auth/register')
      .send({ name: 'Other', email: otherEmail, password: 'password123' });

    await request(http)
      .get(`/submission/${submitRes.body.id}`)
      .set('Authorization', `Bearer ${otherRes.body.accessToken}`)
      .expect(403);
  });

  it('runs against the sample input synchronously via /run without persisting anything', async () => {
    const http = app.getHttpServer();
    const before = await request(http)
      .get('/submissions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const runRes = await request(http)
      .post('/run')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ problemId, code: CORRECT_CODE })
      .expect(201);
    expect(runRes.body.passed).toBe(true);

    const after = await request(http)
      .get('/submissions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(after.body.length).toBe(before.body.length);
  });

  it('reflects the accepted solve on the leaderboard', async () => {
    const res = await request(app.getHttpServer()).get('/leaderboard').expect(200);
    const entry = res.body.find((e: { userId: string }) => e.userId === userId);
    expect(entry).toBeDefined();
    expect(entry.solvedCount).toBeGreaterThanOrEqual(1);
  });
});
