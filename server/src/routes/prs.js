const router = require('express').Router({ mergeParams: true });
const { verifyToken } = require('../middleware/auth');
const { addPr, removePr } = require('../db/queries/prs');
const { getCardWithBoard } = require('../db/queries/cards');
const { isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

// Resolve card → board and check membership, then run handler
async function withCardAuth(req, res, handler) {
  const cardRes = await getCardWithBoard(req.params.cardId);
  if (!cardRes.rows[0]) return res.status(404).json({ error: 'Card not found' });
  const membership = await isBoardMember(cardRes.rows[0].board_id, req.user.id);
  if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
  return handler(cardRes.rows[0]);
}

// POST /api/cards/:cardId/prs  — link a PR to this card
router.post('/', async (req, res) => {
  try {
    await withCardAuth(req, res, async () => {
      const { prUrl, prTitle } = req.body;
      if (!prUrl) return res.status(400).json({ error: 'prUrl is required' });
      const result = await addPr(req.params.cardId, prUrl, prTitle);
      res.status(201).json(result.rows[0]);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cards/:cardId/prs/:prId  — unlink a PR from this card
router.delete('/:prId', async (req, res) => {
  try {
    await withCardAuth(req, res, async () => {
      const result = await removePr(req.params.prId, req.params.cardId);
      if (!result.rows[0]) return res.status(404).json({ error: 'PR link not found' });
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
