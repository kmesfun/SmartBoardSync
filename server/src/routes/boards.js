const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { getBoardsByUser, createBoard, getBoardById, getBoardWithColumns, deleteBoard } = require('../db/queries/boards');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await getBoardsByUser(req.user.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await createBoard(name, req.user.id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:boardId', async (req, res) => {
  try {
    const boardResult = await getBoardById(req.params.boardId);
    const board = boardResult.rows[0];
    if (!board) return res.status(404).json({ error: 'Not found' });
    const columns = await getBoardWithColumns(req.params.boardId);
    res.json({ board, columns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:boardId', async (req, res) => {
  try {
    const boardResult = await getBoardById(req.params.boardId);
    if (!boardResult.rows[0]) return res.status(404).json({ error: 'Not found' });
    await deleteBoard(req.params.boardId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
