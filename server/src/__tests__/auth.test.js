/**
 * Auth Route Tests
 * Run: npm test -- auth.test.js
 * Watch: npm run test:watch -- auth.test.js
 *
 * These tests auto-rerun whenever auth.js, app.js, or db/queries/users.js changes.
 */

const request = require('supertest');
const app = require('../app');
const { pool } = require('../db');

// Wipe test users before each test
beforeEach(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  await pool.end();
});

// ─── REGISTER ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a user and returns a JWT + user object', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.password).toBeUndefined(); // never expose hash
  });

  it('rejects registration with a duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password456', name: 'Alice2' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@test.com' }); // missing password and name

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects a weak password (under 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'charlie@test.com', password: '123', name: 'Charlie' });

    expect(res.status).toBe(400);
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' });
  });

  it('returns a JWT for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Alice');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ─── PROTECTED ROUTES ────────────────────────────────────────────────────────

describe('Protected route middleware', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a malformed token', async () => {
    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts requests with a valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dave@test.com', password: 'password123', name: 'Dave' });

    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
  });
});
