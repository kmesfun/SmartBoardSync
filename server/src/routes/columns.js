const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { createColumn, updateColumn, deleteColumn, getColumnById } = require('../db/queries/columns');
const { isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { boardId, name } = req.body;
    if (!boardId || !name) return res.status(400).json({ error: 'boardId and name are required' });
    const membership = await isBoardMember(boardId, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const result = await createColumn(boardId, name);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:columnId', async (req, res) => {
  try {
    const colRes = await getColumnById(req.params.columnId);
    if (!colRes.rows[0]) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(colRes.rows[0].board_id, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await updateColumn(req.params.columnId, name);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:columnId', async (req, res) => {
  try {
    const colRes = await getColumnById(req.params.columnId);
    if (!colRes.rows[0]) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(colRes.rows[0].board_id, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    await deleteColumn(req.params.columnId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
