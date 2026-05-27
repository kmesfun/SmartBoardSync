/**
 * Socket.io Integration Tests
 * Run: npm test -- sockets.test.js
 * Watch: npm run test:watch -- sockets.test.js
 *
 * Tests auto-rerun when sockets/*.js or db/queries/cards.js change.
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const request = require('supertest');
const app = require('../app');
const { pool } = require('../db');
const { registerSocketHandlers } = require('../sockets');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

let httpServer, ioServer, port;
let tokenA, tokenB, userAId, boardId, columnId, cardId;

async function registerAndLogin(email, name) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name });
  return { token: res.body.token, userId: res.body.user.id };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

// ─── SETUP ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@socket-test.com'");

  // Create HTTP + Socket.io server
  httpServer = createServer(app);
  ioServer = new Server(httpServer, {
    cors: { origin: '*' },
  });
  registerSocketHandlers(ioServer);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;

  // Create test users
  const a = await registerAndLogin('userA@socket-test.com', 'User A');
  const b = await registerAndLogin('userB@socket-test.com', 'User B');
  tokenA = a.token;
  tokenB = b.token;
  userAId = a.userId;

  // Create board, column, card
  const board = await (await request(app)
    .post('/api/boards')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Socket Test Board' })).body;
  boardId = board.id;

  const column = await (await request(app)
    .post('/api/columns')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ boardId, name: 'To Do' })).body;
  columnId = column.id;

  const card = await (await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ columnId, title: 'Socket Test Card' })).body;
  cardId = card.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@socket-test.com'");
  await new Promise((resolve) => httpServer.close(resolve));
  await pool.end();
});

beforeEach(async () => {
  // Release any locks between tests
  await pool.query('UPDATE cards SET locked_by = NULL, locked_at = NULL WHERE id = $1', [cardId]);
});

// ─── CONNECTION AUTH ──────────────────────────────────────────────────────────

describe('Socket authentication', () => {
  it('connects with a valid token', async () => {
    const client = await connectSocket(tokenA);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('rejects connection with no token', async () => {
    await expect(
      new Promise((_, reject) => {
        const client = ioClient(`http://localhost:${port}`, {
          auth: {},
          transports: ['websocket'],
        });
        client.on('connect_error', reject);
        client.on('connect', () => reject(new Error('Should not connect')));
      })
    ).rejects.toBeDefined();
  });
});

// ─── PRESENCE ────────────────────────────────────────────────────────────────

describe('Presence events', () => {
  it('broadcasts presence:update when a user joins a board room', async () => {
    const clientA = await connectSocket(tokenA);
    const clientB = await connectSocket(tokenB);

    clientA.emit('presence:join', { boardId });

    const presencePromise = waitForEvent(clientA, 'presence:update');
    clientB.emit('presence:join', { boardId });

    const { activeUsers } = await presencePromise;
    expect(activeUsers.length).toBeGreaterThanOrEqual(1);

    clientA.disconnect();
    clientB.disconnect();
  });
});

// ─── CARD LOCKING ────────────────────────────────────────────────────────────

describe('card:lock events', () => {
  it('broadcasts card:locked to room when lock succeeds', async () => {
    const clientA = await connectSocket(tokenA);
    const clientB = await connectSocket(tokenB);

    clientA.emit('presence:join', { boardId });
    clientB.emit('presence:join', { boardId });
    await new Promise(r => setTimeout(r, 50)); // let joins settle

    const lockedPromise = waitForEvent(clientB, 'card:locked');
    clientA.emit('card:lock', { cardId });

    const payload = await lockedPromise;
    expect(payload.cardId).toBe(cardId);
    expect(payload.lockedBy).toBeDefined();

    clientA.disconnect();
    clientB.disconnect();
  });

  it('emits card:lock:rejected to sender when card is already locked', async () => {
    // Pre-lock the card
    await pool.query(
      `UPDATE cards SET locked_by = $1, locked_at = NOW() WHERE id = $2`,
      [userAId, cardId]
    );

    const clientB = await connectSocket(tokenB);
    clientB.emit('presence:join', { boardId });
    await new Promise(r => setTimeout(r, 50));

    const rejectedPromise = waitForEvent(clientB, 'card:lock:rejected');
    clientB.emit('card:lock', { cardId });

    const payload = await rejectedPromise;
    expect(payload.cardId).toBe(cardId);

    clientB.disconnect();
  });
});

// ─── CARD MOVING ─────────────────────────────────────────────────────────────

describe('card:move events', () => {
  it('broadcasts card:moved to room after a valid move', async () => {
    const clientA = await connectSocket(tokenA);
    clientA.emit('presence:join', { boardId });
    await new Promise(r => setTimeout(r, 50));

    // Lock first
    clientA.emit('card:lock', { cardId });
    await waitForEvent(clientA, 'card:locked');

    const movedPromise = waitForEvent(clientA, 'card:moved');
    clientA.emit('card:move', {
      cardId,
      columnId,
      position: 99.0,
      timestamp: Date.now(),
    });

    const payload = await movedPromise;
    expect(payload.cardId).toBe(cardId);
    expect(payload.position).toBe(99.0);

    clientA.disconnect();
  });

  it('emits card:move:rejected when timestamp is stale', async () => {
    const clientA = await connectSocket(tokenA);
    clientA.emit('presence:join', { boardId });
    await new Promise(r => setTimeout(r, 50));

    clientA.emit('card:lock', { cardId });
    await waitForEvent(clientA, 'card:locked');

    const rejectedPromise = waitForEvent(clientA, 'card:move:rejected');
    clientA.emit('card:move', {
      cardId,
      columnId,
      position: 99.0,
      timestamp: 0, // epoch — always stale
    });

    const payload = await rejectedPromise;
    expect(payload.cardId).toBe(cardId);

    clientA.disconnect();
  });
});

// ─── DISCONNECT ───────────────────────────────────────────────────────────────

describe('Disconnect handling', () => {
  it('releases all locks held by a disconnected user', async () => {
    const clientA = await connectSocket(tokenA);
    clientA.emit('presence:join', { boardId });
    await new Promise(r => setTimeout(r, 50));

    // Lock card
    clientA.emit('card:lock', { cardId });
    await waitForEvent(clientA, 'card:locked');

    // Verify locked
    const before = await pool.query('SELECT locked_by FROM cards WHERE id = $1', [cardId]);
    expect(before.rows[0].locked_by).not.toBeNull();

    // Disconnect
    clientA.disconnect();
    await new Promise(r => setTimeout(r, 200)); // let disconnect propagate

    // Verify released
    const after = await pool.query('SELECT locked_by FROM cards WHERE id = $1', [cardId]);
    expect(after.rows[0].locked_by).toBeNull();
  });
});
