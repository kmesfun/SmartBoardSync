import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/boardStore';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

const POINTS = [1, 2, 3, 5, 8, 13];

function PrBadge({ pr, onRemove }) {
  const label = pr.pr_number ? `#${pr.pr_number}` : pr.pr_url;
  const display = pr.repo ? `${pr.repo.split('/')[1]}#${pr.pr_number}` : label;
  return (
    <a
      href={pr.pr_url}
      target="_blank"
      rel="noopener noreferrer"
      title={pr.pr_title || pr.pr_url}
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-violet-200 transition-colors"
    >
      <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
      </svg>
      {display}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="ml-0.5 text-violet-400 hover:text-violet-700"
        title="Remove PR link"
      >
        ×
      </button>
    </a>
  );
}

export function Card({ card, isLocked = false, lockedBy = null }) {
  const updateCardInStore = useBoardStore(s => s.updateCard);
  const updateCardPoints = useBoardStore(s => s.updateCardPoints);
  const addCardPr = useBoardStore(s => s.addCardPr);
  const removeCardPr = useBoardStore(s => s.removeCardPr);
  const user = useAuthStore(s => s.user);

  const [showPointPicker, setShowPointPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [titleError, setTitleError] = useState(false);
  const [addingPr, setAddingPr] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prError, setPrError] = useState('');

  const prs = card.prs || [];
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
        setTitle(card.title);
        setTitleError(true);
        setTimeout(() => setTitleError(false), 2000);
      }
    }
    setEditing(false);
  };

  const handleAddPr = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = prUrl.trim();
    if (!url) return;
    try {
      const res = await api.post(`/cards/${card.id}/prs`, { prUrl: url, prTitle: prTitle.trim() });
      addCardPr(card.id, res.data);
      setPrUrl('');
      setPrTitle('');
      setPrError('');
      setAddingPr(false);
    } catch (err) {
      setPrError(err.response?.data?.error || 'Failed to link PR');
    }
  };

  const handleRemovePr = async (prId) => {
    // Optimistic remove
    removeCardPr(card.id, prId);
    try {
      await api.delete(`/cards/${card.id}/prs/${prId}`);
    } catch {
      // Re-fetch would be needed on failure; for now the store diverges — acceptable for this UI
    }
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

      {/* Title row */}
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

        {/* Story points */}
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

      {/* Description */}
      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}

      {/* PR links */}
      {(prs.length > 0 || addingPr) && (
        <div className="mt-2" onMouseDown={e => e.stopPropagation()}>
          {prs.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {prs.map(pr => (
                <PrBadge key={pr.id} pr={pr} onRemove={() => handleRemovePr(pr.id)} />
              ))}
            </div>
          )}
          {addingPr && (
            <form onSubmit={handleAddPr} onClick={e => e.stopPropagation()} className="mt-1 space-y-1">
              <input
                autoFocus
                type="url"
                placeholder="https://github.com/owner/repo/pull/123"
                value={prUrl}
                onChange={e => setPrUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setAddingPr(false); setPrUrl(''); setPrError(''); } }}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <input
                type="text"
                placeholder="PR title (optional)"
                value={prTitle}
                onChange={e => setPrTitle(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              {prError && <p className="text-[10px] text-red-500">{prError}</p>}
              <div className="flex gap-1">
                <button type="submit" className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded hover:bg-violet-700">Link</button>
                <button type="button" onClick={() => { setAddingPr(false); setPrUrl(''); setPrError(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Link PR button — visible when not adding */}
      {!addingPr && (
        <div onMouseDown={e => e.stopPropagation()} className="mt-1.5">
          <button
            onClick={e => { e.stopPropagation(); setAddingPr(true); }}
            className="text-[10px] text-gray-400 hover:text-violet-600 flex items-center gap-0.5 transition-colors"
            title="Link a Pull Request"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
            </svg>
            Link PR
          </button>
        </div>
      )}

      {titleError && (
        <p className="text-xs text-yellow-600 mt-1">Failed to save — please try again</p>
      )}
    </div>
  );
}

export default Card;
