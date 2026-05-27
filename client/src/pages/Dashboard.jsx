import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/boards').then(res => {
      setBoards(res.data);
      setLoading(false);
    });
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await api.post('/boards', { name });
    setBoards(prev => [res.data, ...prev]);
    setName('');
  };

  const deleteBoard = async (id) => {
    await api.delete(`/boards/${id}`);
    setBoards(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Boards</h1>
        <form onSubmit={createBoard} className="flex gap-3 mb-8">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="New board name…" value={name} onChange={e => setName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create Board
          </button>
        </form>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="text-gray-500">No boards yet. Create one above.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boards.map(board => (
              <div key={board.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
                <Link to={`/board/${board.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                  {board.name}
                </Link>
                <button
                  onClick={() => deleteBoard(board.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
