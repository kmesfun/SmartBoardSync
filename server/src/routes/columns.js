const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { createColumn, updateColumn, deleteColumn } = require('../db/queries/columns');

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { boardId, name } = req.body;
    if (!boardId || !name) return res.status(400).json({ error: 'boardId and name are required' });
    const result = await createColumn(boardId, name);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:columnId', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await updateColumn(req.params.columnId, name);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:columnId', async (req, res) => {
  try {
    await deleteColumn(req.params.columnId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
