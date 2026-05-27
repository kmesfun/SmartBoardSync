const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { getActivity } = require('../db/queries/activity');

router.use(verifyToken);

router.get('/:boardId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const result = await getActivity(req.params.boardId, limit, offset);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
