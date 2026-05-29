const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { verifyToken } = require('../middleware/auth');
const { getBoardById, getBoardWithColumns, isBoardMember } = require('../db/queries/boards');

router.use(verifyToken);

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5';

router.get('/:boardId', async (req, res) => {
  try {
    const boardResult = await getBoardById(req.params.boardId);
    const board = boardResult.rows[0];
    if (!board) return res.status(404).json({ error: 'Not found' });

    const membership = await isBoardMember(req.params.boardId, req.user.id);
    if (!membership.rows[0]) return res.status(403).json({ error: 'Forbidden' });

    const columns = await getBoardWithColumns(req.params.boardId);

    // Flatten cards with column context
    const allCards = [];
    for (const col of columns) {
      for (const card of (col.cards || [])) {
        allCards.push({
          id: card.id,
          title: card.title,
          description: card.description || '',
          points: card.points,
          column: col.name,
          position: card.position,
        });
      }
    }

    if (allCards.length === 0) {
      return res.json({ recommendations: [], message: 'No cards on this board yet.' });
    }

    const boardContext = JSON.stringify({
      boardName: board.name,
      columns: columns.map(c => ({
        name: c.name,
        cardCount: (c.cards || []).length,
        totalPoints: (c.cards || []).reduce((s, ca) => s + (ca.points || 0), 0),
      })),
      cards: allCards,
    }, null, 2);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a senior product manager analyzing a Kanban board. Given the board data below, identify the top 5 most impactful stories/cards that should be prioritized. For each card, explain WHY it is high impact — consider factors like: blocking other work, business value signals in the title/description, story points complexity, current column (backlog vs in-progress), and any dependencies implied by the title.

Return ONLY valid JSON in this exact shape (no markdown, no prose outside JSON):
{
  "recommendations": [
    {
      "rank": 1,
      "cardId": "...",
      "title": "...",
      "column": "...",
      "impactScore": 85,
      "reason": "One or two sentences explaining why this card is high impact.",
      "tags": ["blocking", "high-value"]
    }
  ]
}

Available tags: "blocking", "high-value", "quick-win", "technical-debt", "risk", "customer-facing", "complex".

Board data:
${boardContext}`,
        },
      ],
    });

    let recommendations;
    try {
      const text = message.content[0].text;
      const parsed = JSON.parse(text);
      recommendations = parsed.recommendations;
    } catch {
      return res.status(500).json({ error: 'AI returned invalid JSON' });
    }

    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
