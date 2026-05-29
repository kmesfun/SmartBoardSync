const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { getBoardsByUser, createBoard, getBoardById, getBoardWithColumns, deleteBoard, isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await getBoardsByUser(req.user.id);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await createBoard(name, req.user.id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:boardId', async (req, res) => {
  try {
    const boardResult = await getBoardById(req.params.boardId);
    const board = boardResult.rows[0];
    if (!board) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(req.params.boardId, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const columns = await getBoardWithColumns(req.params.boardId);
    res.json({ board, columns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:boardId', async (req, res) => {
  try {
    const boardResult = await getBoardById(req.params.boardId);
    if (!boardResult.rows[0]) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(req.params.boardId, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    if (membership.rows[0].role !== 'owner') return res.status(403).json({ error: 'Only the board owner can delete it' });
    await deleteBoard(req.params.boardId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
