import { useState } from 'react';
import api from '../lib/api';

const TAG_STYLES = {
  blocking: 'bg-red-100 text-red-700',
  'high-value': 'bg-green-100 text-green-700',
  'quick-win': 'bg-yellow-100 text-yellow-700',
  'technical-debt': 'bg-orange-100 text-orange-700',
  risk: 'bg-red-100 text-red-600',
  'customer-facing': 'bg-blue-100 text-blue-700',
  complex: 'bg-purple-100 text-purple-700',
};

function ImpactBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}</span>
    </div>
  );
}

export default function AIRecommendations({ boardId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.get(`/recommendations/${boardId}`);
      setRecommendations(res.data.recommendations);
      if (res.data.message) setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!recommendations) fetchRecommendations();
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        title="Get AI recommendations for highest-impact stories"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.384a3 3 0 01-4.95-1.535A5 5 0 016.464 16.22z" />
        </svg>
        AI Recommendations
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-h-[80vh] flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.384a3 3 0 01-4.95-1.535A5 5 0 016.464 16.22z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">AI Impact Recommendations</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="text-xs text-violet-600 hover:text-violet-800 disabled:opacity-40"
              title="Refresh"
            >
              {loading ? '…' : '↻ Refresh'}
            </button>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analyzing board with Claude…</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && !loading && (
            <p className="text-sm text-gray-500 text-center py-6">{message}</p>
          )}

          {!loading && !error && recommendations && recommendations.length > 0 && (
            <ol className="space-y-4">
              {recommendations.map((rec) => (
                <li key={rec.cardId} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {rec.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{rec.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">in <span className="font-medium">{rec.column}</span></p>
                    </div>
                  </div>

                  <ImpactBar score={rec.impactScore} />

                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{rec.reason}</p>

                  {rec.tags && rec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.tags.map(tag => (
                        <span
                          key={tag}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TAG_STYLES[tag] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
          Powered by Claude · Results are AI-generated suggestions
        </div>
      </div>
    </div>
  );
}
