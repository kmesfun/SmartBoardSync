import { useParams } from 'react-router-dom';
import useBoard from '../hooks/useBoard';
import { useSocket } from '../hooks/useSocket';
import BoardComponent from '../components/Board';
import Navbar from '../components/Navbar';
import PresenceBar from '../components/PresenceBar';
import ActivityLog from '../components/ActivityLog';
import AIRecommendations from '../components/AIRecommendations';
import useBoardStore from '../store/boardStore';

export default function BoardPage() {
  const { boardId } = useParams();
  const { loading, error } = useBoard(boardId);
  useSocket(boardId);
  const board = useBoardStore(s => s.board);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64 text-gray-500">Loading board…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">{board?.name}</h1>
        <div className="flex items-center gap-3">
          <AIRecommendations boardId={boardId} />
          <PresenceBar />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-x-auto">
          <BoardComponent boardId={boardId} />
        </div>
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <ActivityLog boardId={boardId} />
        </div>
      </div>
    </div>
  );
}
