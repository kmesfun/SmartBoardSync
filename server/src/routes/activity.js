const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { getActivity } = require('../db/queries/activity');
const { isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

router.get('/:boardId', async (req, res) => {
  try {
    const membership = await isBoardMember(req.params.boardId, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const result = await getActivity(req.params.boardId, limit, offset);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
