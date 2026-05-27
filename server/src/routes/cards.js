const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { createCard, updateCard, deleteCard } = require('../db/queries/cards');

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { columnId, title, position } = req.body;
    if (!columnId || !title) return res.status(400).json({ error: 'columnId and title are required' });
    const result = await createCard(columnId, title, position !== undefined ? parseFloat(position) : null);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:cardId', async (req, res) => {
  try {
    const { title, description, points } = req.body;
    if (points !== undefined && points !== null && ![1, 2, 3, 5, 8, 13].includes(points)) {
      return res.status(400).json({ error: 'points must be 1, 2, 3, 5, 8, or 13' });
    }
    const result = await updateCard(req.params.cardId, { title, description, points });
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:cardId', async (req, res) => {
  try {
    await deleteCard(req.params.cardId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
