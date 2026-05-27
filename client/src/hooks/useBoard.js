import { useEffect, useState } from 'react';
import api from '../lib/api';
import useBoardStore from '../store/boardStore';

export default function useBoard(boardId) {
  const setBoard = useBoardStore(s => s.setBoard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    api.get(`/boards/${boardId}`)
      .then(res => {
        setBoard(res.data.board, res.data.columns);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [boardId]);

  return { loading, error };
}
