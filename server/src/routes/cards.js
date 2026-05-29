const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { createCard, updateCard, deleteCard, getCardWithBoard } = require('../db/queries/cards');
const { getColumnById } = require('../db/queries/columns');
const { isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { columnId, title, position } = req.body;
    if (!columnId || !title) return res.status(400).json({ error: 'columnId and title are required' });
    const colRes = await getColumnById(columnId);
    if (!colRes.rows[0]) return res.status(404).json({ error: 'Column not found' });
    const membership = await isBoardMember(colRes.rows[0].board_id, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const result = await createCard(columnId, title, position !== undefined ? parseFloat(position) : null);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:cardId', async (req, res) => {
  try {
    const cardRes = await getCardWithBoard(req.params.cardId);
    if (!cardRes.rows[0]) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(cardRes.rows[0].board_id, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const { title, description, points } = req.body;
    if (points !== undefined && points !== null && ![1, 2, 3, 5, 8, 13].includes(points)) {
      return res.status(400).json({ error: 'points must be 1, 2, 3, 5, 8, or 13' });
    }
    const result = await updateCard(req.params.cardId, { title, description, points });
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:cardId', async (req, res) => {
  try {
    const cardRes = await getCardWithBoard(req.params.cardId);
    if (!cardRes.rows[0]) return res.status(404).json({ error: 'Not found' });
    const membership = await isBoardMember(cardRes.rows[0].board_id, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    await deleteCard(req.params.cardId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
