import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/boardStore';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

const POINTS = [1, 2, 3, 5, 8, 13];

export function Card({ card, isLocked = false, lockedBy = null }) {
  const updateCardInStore = useBoardStore(s => s.updateCard);
  const updateCardPoints = useBoardStore(s => s.updateCardPoints);
  const user = useAuthStore(s => s.user);

  const [showPointPicker, setShowPointPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [titleError, setTitleError] = useState(false);

  const isLockedByOther = isLocked && lockedBy?.id !== user?.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !!isLockedByOther,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Lock is now emitted in Board's handleDragStart so it only fires when a real drag begins,
  // not on every mousedown (which includes clicks and right-clicks).

  const handlePointClick = async (points) => {
    const newPoints = card.points === points ? null : points;
    try {
      await api.patch(`/cards/${card.id}`, { points: newPoints });
      if (typeof updateCardPoints === 'function') updateCardPoints(card.id, newPoints);
    } catch {}
    setShowPointPicker(false);
  };

  const handleTitleSave = async () => {
    if (title.trim() && title !== card.title) {
      try {
        const res = await api.patch(`/cards/${card.id}`, { title });
        if (typeof updateCardInStore === 'function') updateCardInStore(res.data);
      } catch {
        // Revert optimistic title and show brief error indicator
        setTitle(card.title);
        setTitleError(true);
        setTimeout(() => setTitleError(false), 2000);
      }
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      data-testid={`card-${card.id}`}
      data-locked={String(!!isLockedByOther)}
      style={style}
      className={`relative bg-white rounded-lg shadow-sm border px-3 py-2 cursor-grab select-none
        ${isLockedByOther ? 'border-red-300 bg-red-50' : titleError ? 'border-yellow-400' : 'border-gray-200 hover:border-blue-300'}
        ${isDragging ? 'shadow-md' : ''}`}
      {...attributes}
      {...listeners}
    >
      {isLockedByOther && (
        <div
          data-testid="lock-overlay"
          className="absolute inset-0 rounded-lg bg-red-50/70 flex items-center justify-center z-10"
        >
          <span className="text-xs text-red-500 font-medium px-2 text-center">
            Locked by {lockedBy?.name}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
        ) : (
          <p
            className="text-sm text-gray-800 flex-1"
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
          >
            {card.title}
          </p>
        )}

        <div className="relative flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
          <button
            className={`text-xs px-1.5 py-0.5 rounded font-semibold
              ${card.points ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
            onClick={e => { e.stopPropagation(); setShowPointPicker(v => !v); }}
            title="Set story points"
          >
            {card.points ?? '?'}
          </button>
          {showPointPicker && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1 z-20">
              {POINTS.map(p => (
                <button
                  key={p}
                  onClick={() => handlePointClick(p)}
                  className={`w-7 h-7 text-xs font-semibold rounded
                    ${card.points === p ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-700'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePointClick(null)}
                className="w-7 h-7 text-xs text-gray-400 hover:text-red-500 rounded"
                title="Clear points"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}

      {titleError && (
        <p className="text-xs text-yellow-600 mt-1">Failed to save — please try again</p>
      )}
    </div>
  );
}

export default Card;
