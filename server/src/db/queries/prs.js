const { query } = require('../index');

function parsePrUrl(url) {
  const match = String(url).match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (match) return { repo: match[1], prNumber: parseInt(match[2], 10) };
  return { repo: null, prNumber: null };
}

const addPr = (cardId, prUrl, prTitle = '') => {
  const { repo, prNumber } = parsePrUrl(prUrl);
  return query(
    `INSERT INTO card_prs (card_id, pr_url, pr_number, repo, pr_title)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (card_id, pr_url) DO UPDATE SET pr_title = EXCLUDED.pr_title
     RETURNING *`,
    [cardId, prUrl, prNumber, repo, prTitle]
  );
};

const removePr = (prId, cardId) =>
  query('DELETE FROM card_prs WHERE id = $1 AND card_id = $2 RETURNING id', [prId, cardId]);

const getPrsForCard = (cardId) =>
  query(
    'SELECT * FROM card_prs WHERE card_id = $1 ORDER BY created_at',
    [cardId]
  );

module.exports = { addPr, removePr, getPrsForCard };
