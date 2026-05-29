import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Card } from './Card';
import api from '../lib/api';
import { useBoardStore } from '../store/boardStore';

export default function Column({ column, lockedCards = {} }) {
  const addCard = useBoardStore(s => s.addCard);
  const [adding, setAdding] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [addError, setAddError] = useState(false);

  const { setNodeRef } = useDroppable({ id: column.id });

  const totalPoints = (column.cards || []).reduce((s, c) => s + (c.points || 0), 0);
  const cards = column.cards || [];

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    try {
      const res = await api.post('/cards', { columnId: column.id, title: cardTitle });
      if (typeof addCard === 'function') addCard(res.data);
      setCardTitle('');
      setAdding(false);
      setAddError(false);
    } catch {
      setAddError(true);
    }
  };

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 rounded-xl flex flex-col max-h-full">
      <div className="px-3 pt-3 pb-1">
        <h3 className="font-semibold text-gray-700 text-sm">{column.name}</h3>
      </div>

      <div ref={setNodeRef} className="flex-1 px-3 py-1 space-y-2 overflow-y-auto min-h-[40px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => {
            const lock = lockedCards[card.id];
            return (
              <Card
                key={card.id}
                card={card}
                isLocked={!!lock}
                lockedBy={lock || null}
              />
            );
          })}
        </SortableContext>
        {cards.length === 0 && (
          <div
            data-testid={`column-${column.id}-empty`}
            className="h-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400"
          >
            Drop here
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200">
        {adding ? (
          <form onSubmit={handleAddCard}>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Card title…"
              value={cardTitle}
              onChange={e => setCardTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setAdding(false); }}
            />
            <div className="flex gap-2">
              <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Add</button>
              <button type="button" onClick={() => { setAdding(false); setAddError(false); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
            {addError && <p className="text-xs text-red-500 mt-1">Failed to add card — please try again</p>}
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-gray-500 hover:text-blue-600 font-medium"
            >
              + Add card
            </button>
            {totalPoints > 0 && (
              <span className="text-xs text-gray-400">Total: {totalPoints} pts</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
