/**
 * PR Linking Tests
 * Run: npm test -- --testPathPattern=prs --runInBand
 */

const request = require('supertest');
const app = require('../app');
const { pool } = require('../db');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function registerAndLogin(email, name) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name });
  return res.body.token;
}

async function createBoard(token, name = 'PR Test Board') {
  const res = await request(app)
    .post('/api/boards')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  return res.body;
}

async function createColumn(token, boardId, name = 'To Do') {
  const res = await request(app)
    .post('/api/columns')
    .set('Authorization', `Bearer ${token}`)
    .send({ boardId, name });
  return res.body;
}

async function createCard(token, columnId, title = 'Test Card') {
  const res = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${token}`)
    .send({ columnId, title });
  return res.body;
}

// ─── SETUP ───────────────────────────────────────────────────────────────────

let tokenA, tokenB, boardId, columnId, card;

beforeEach(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@prtest.com'");

  tokenA = await registerAndLogin('ownerA@prtest.com', 'Owner A');
  tokenB = await registerAndLogin('nonmemberB@prtest.com', 'Non-member B');

  const board = await createBoard(tokenA);
  boardId = board.id;

  const column = await createColumn(tokenA, boardId);
  columnId = column.id;

  card = await createCard(tokenA, columnId);
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@prtest.com'");
  await pool.end();
});

// ─── LINK PR ─────────────────────────────────────────────────────────────────

describe('POST /api/cards/:cardId/prs', () => {
  it('links a GitHub PR URL to a card and returns parsed fields', async () => {
    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/3', prTitle: 'My PR' });

    expect(res.status).toBe(201);
    expect(res.body.pr_url).toBe('https://github.com/kmesfun/SmartBoardSync/pull/3');
    expect(res.body.pr_number).toBe(3);
    expect(res.body.repo).toBe('kmesfun/SmartBoardSync');
    expect(res.body.pr_title).toBe('My PR');
    expect(res.body.id).toBeDefined();
  });

  it('allows multiple PRs to be linked to the same card', async () => {
    await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/1' });

    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/2' });

    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT * FROM card_prs WHERE card_id = $1 ORDER BY created_at',
      [card.id]
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].pr_number).toBe(1);
    expect(rows[1].pr_number).toBe(2);
  });

  it('returns 400 when prUrl is missing', async () => {
    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prUrl/i);
  });

  it('returns 403 for a non-board-member', async () => {
    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/99' });

    expect(res.status).toBe(403);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/1' });

    expect(res.status).toBe(401);
  });

  it('upserts duplicate URL instead of erroring', async () => {
    const url = 'https://github.com/kmesfun/SmartBoardSync/pull/5';

    const r1 = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: url, prTitle: 'First title' });

    const r2 = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: url, prTitle: 'Updated title' });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r2.body.pr_title).toBe('Updated title');

    const { rows } = await pool.query(
      'SELECT * FROM card_prs WHERE card_id = $1 AND pr_url = $2',
      [card.id, url]
    );
    expect(rows).toHaveLength(1);
  });
});

// ─── REMOVE PR ───────────────────────────────────────────────────────────────

describe('DELETE /api/cards/:cardId/prs/:prId', () => {
  let prId;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/10' });
    prId = res.body.id;
  });

  it('removes a linked PR and returns ok', async () => {
    const res = await request(app)
      .delete(`/api/cards/${card.id}/prs/${prId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const { rows } = await pool.query('SELECT * FROM card_prs WHERE id = $1', [prId]);
    expect(rows).toHaveLength(0);
  });

  it('returns 403 for a non-board-member', async () => {
    const res = await request(app)
      .delete(`/api/cards/${card.id}/prs/${prId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent PR id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .delete(`/api/cards/${card.id}/prs/${fakeId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });
});

// ─── BOARD LOAD — PRs EMBEDDED ───────────────────────────────────────────────

describe('GET /api/boards/:boardId — prs embedded in cards', () => {
  it('returns prs array on each card after linking', async () => {
    await request(app)
      .post(`/api/cards/${card.id}/prs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ prUrl: 'https://github.com/kmesfun/SmartBoardSync/pull/7', prTitle: 'Fix bug' });

    const res = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const col = res.body.columns[0];
    const c = col.cards.find(ca => ca.id === card.id);
    expect(c.prs).toHaveLength(1);
    expect(c.prs[0].pr_number).toBe(7);
    expect(c.prs[0].pr_title).toBe('Fix bug');
  });

  it('returns an empty prs array for cards with no linked PRs', async () => {
    const res = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const col = res.body.columns[0];
    const c = col.cards.find(ca => ca.id === card.id);
    expect(Array.isArray(c.prs)).toBe(true);
    expect(c.prs).toHaveLength(0);
  });
});
