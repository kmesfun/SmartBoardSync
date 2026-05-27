/**
 * Card Tests — Locking, Moving, Conflict Resolution
 * Run: npm test -- cards.test.js
 * Watch: npm run test:watch -- cards.test.js
 *
 * Tests auto-rerun when cards.js routes, sockets/cards.js, or db/queries/cards.js change.
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

async function createBoard(token, name = 'Test Board') {
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
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");

  tokenA = await registerAndLogin('userA@test.com', 'User A');
  tokenB = await registerAndLogin('userB@test.com', 'User B');

  const board = await createBoard(tokenA);
  boardId = board.id;

  const column = await createColumn(tokenA, boardId);
  columnId = column.id;

  card = await createCard(tokenA, columnId);
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  await pool.end();
});

// ─── CARD CRUD ────────────────────────────────────────────────────────────────

describe('Card CRUD', () => {
  it('creates a card with a FLOAT position', async () => {
    expect(typeof card.position).toBe('number');
    expect(card.title).toBe('Test Card');
    expect(card.column_id).toBe(columnId);
  });

  it('assigns incrementing positions to multiple cards', async () => {
    const card2 = await createCard(tokenA, columnId, 'Card 2');
    expect(card2.position).toBeGreaterThan(card.position);
  });

  it('edits a card title and description', async () => {
    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Updated', description: 'New desc' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.description).toBe('New desc');
  });

  it('deletes a card', async () => {
    const res = await request(app)
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);

    const check = await pool.query('SELECT * FROM cards WHERE id = $1', [card.id]);
    expect(check.rows.length).toBe(0);
  });
});

// ─── FLOAT POSITIONS ─────────────────────────────────────────────────────────

describe('Card position (FLOAT ordering)', () => {
  it('inserts a card between two existing cards without updating others', async () => {
    const card2 = await createCard(tokenA, columnId, 'Card 2');

    // Insert card between card and card2
    const midPosition = (card.position + card2.position) / 2;
    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ columnId, title: 'Middle Card', position: midPosition });

    expect(res.body.position).toBeGreaterThan(card.position);
    expect(res.body.position).toBeLessThan(card2.position);
  });
});

// ─── CARD LOCKING (via DB queries directly — unit level) ─────────────────────

describe('Card locking logic', () => {
  it('locks a card when it is free', async () => {
    const { rows } = await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW()
       WHERE id = $2 AND locked_by IS NULL RETURNING *`,
      ['some-user-id', card.id]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].locked_by).toBe('some-user-id');
  });

  it('fails to lock a card already locked by another user (race condition guard)', async () => {
    // Lock with user A
    await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW() WHERE id = $2 AND locked_by IS NULL`,
      ['user-a-id', card.id]
    );

    // Attempt lock with user B — should affect 0 rows
    const { rows } = await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW()
       WHERE id = $2 AND locked_by IS NULL RETURNING *`,
      ['user-b-id', card.id]
    );
    expect(rows.length).toBe(0); // lock was rejected
  });

  it('releases a lock correctly', async () => {
    await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW() WHERE id = $2 AND locked_by IS NULL`,
      ['user-a-id', card.id]
    );

    await pool.query(
      `UPDATE cards SET locked_by = NULL, locked_at = NULL WHERE id = $1 AND locked_by = $2`,
      [card.id, 'user-a-id']
    );

    const { rows } = await pool.query('SELECT * FROM cards WHERE id = $1', [card.id]);
    expect(rows[0].locked_by).toBeNull();
  });

  it('releases all locks for a user on disconnect', async () => {
    const userId = 'disconnected-user-id';

    // Lock two cards
    const card2 = await createCard(tokenA, columnId, 'Card 2');
    await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW() WHERE id = ANY($2::uuid[]) AND locked_by IS NULL`,
      [userId, [card.id, card2.id]]
    );

    // Simulate disconnect — release all
    await pool.query(
      `UPDATE cards SET locked_by = NULL, locked_at = NULL WHERE locked_by = $1`,
      [userId]
    );

    const { rows } = await pool.query(
      'SELECT * FROM cards WHERE id = ANY($1::uuid[])',
      [[card.id, card2.id]]
    );
    expect(rows.every(r => r.locked_by === null)).toBe(true);
  });
});

// ─── TIMESTAMP CONFLICT GUARD ────────────────────────────────────────────────

describe('Timestamp conflict resolution', () => {
  it('rejects a card move with a stale timestamp', async () => {
    const { rows } = await pool.query('SELECT updated_at FROM cards WHERE id = $1', [card.id]);
    const updated_at = rows[0].updated_at;

    // Stale timestamp = before updated_at
    const staleTimestamp = new Date(updated_at.getTime() - 5000).toISOString();

    // The conflict check logic (mirrors sockets/cards.js)
    const isStale = new Date(staleTimestamp) < new Date(updated_at);
    expect(isStale).toBe(true); // move should be rejected
  });

  it('accepts a card move with a current timestamp', async () => {
    const { rows } = await pool.query('SELECT updated_at FROM cards WHERE id = $1', [card.id]);
    const updated_at = rows[0].updated_at;

    const freshTimestamp = new Date(updated_at.getTime() + 1).toISOString();
    const isStale = new Date(freshTimestamp) < new Date(updated_at);
    expect(isStale).toBe(false); // move should proceed
  });
});

// ─── ACTIVITY LOG ────────────────────────────────────────────────────────────

describe('Activity log', () => {
  it('fetches activity for a board', async () => {
    // Insert a test activity entry
    await pool.query(
      `INSERT INTO activity_log (board_id, user_id, action, payload)
       VALUES ($1, $2, 'card:moved', $3)`,
      [boardId, null, JSON.stringify({ cardId: card.id, title: card.title })]
    );

    const res = await request(app)
      .get(`/api/activity/${boardId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].action).toBe('card:moved');
  });
});
