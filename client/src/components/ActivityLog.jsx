import { useEffect, useState } from 'react';
import api from '../lib/api';

const ACTION_LABELS = {
  'card:move': 'moved a card',
  'card:moved': 'moved a card',
};

export default function ActivityLog({ boardId }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!boardId) return;
    api.get(`/activity/${boardId}?limit=30`)
      .then(res => setEvents(res.data))
      .catch(() => {});
  }, [boardId]);

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity</h2>
      {events.length === 0 ? (
        <p className="text-xs text-gray-400">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map(ev => (
            <li key={ev.id} className="text-xs text-gray-600">
              <span className="font-medium">{ev.user_name || 'Someone'}</span>{' '}
              {ACTION_LABELS[ev.action] || ev.action}
              {ev.payload?.cardTitle && (
                <span className="text-gray-400"> — {ev.payload.cardTitle}</span>
              )}
              <div className="text-gray-400 text-[10px]">
                {new Date(ev.created_at).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
