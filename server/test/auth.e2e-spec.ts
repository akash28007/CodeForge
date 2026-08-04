import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, deleteTestUsersByPrefix, disconnectTestPrisma, uniqueEmail } from './utils/bootstrap';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const emailPrefix = 'e2e-auth';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsersByPrefix(emailPrefix);
    await app.close();
    await disconnectTestPrisma();
  });

  it('registers a new user and never returns the password hash', async () => {
    const email = uniqueEmail('auth-register');

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password: 'password123' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rejects a duplicate registration with 409', async () => {
    const email = uniqueEmail('auth-dup');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'First', email, password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Second', email, password: 'password123' })
      .expect(409);
  });

  it('rejects registration with an invalid payload (400, class-validator wired up end-to-end)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('rejects login with the wrong password (401)', async () => {
    const email = uniqueEmail('auth-wrongpw');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password: 'correct-password' })
      .expect(201);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
  });

  it('logs in successfully and can then fetch /profile with the token', async () => {
    const email = uniqueEmail('auth-login');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password: 'password123' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    const token = loginRes.body.accessToken;

    const profileRes = await request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profileRes.body.email).toBe(email);
  });

  it('rejects /profile with no token (401)', async () => {
    await request(app.getHttpServer()).get('/profile').expect(401);
  });

  it('refreshes to a new token pair, and rejects a garbage refresh token', async () => {
    const email = uniqueEmail('auth-refresh');
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password: 'password123' })
      .expect(201);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registerRes.body.refreshToken })
      .expect(201);
    expect(refreshRes.body.accessToken).toBeDefined();

    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: 'garbage' }).expect(401);
  });
});
