import { useState } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners,
} from '@dnd-kit/core';
import { useBoardStore } from '../store/boardStore';
import Column from './Column';
import { Card } from './Card';
import { getSocket } from '../lib/socket';

export function Board({ boardId }) {
  const { columns, moveCard, lockedCards } = useBoardStore(s => s);

  const [activeCard, setActiveCard] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = ({ active }) => {
    const card = (columns || []).flatMap(c => c.cards || []).find(c => c.id === active.id);
    setActiveCard(card || null);
    // Emit lock here (drag-start) rather than on mousedown to avoid locking on clicks/right-clicks
    try { getSocket().emit('card:lock', { cardId: active.id }); } catch {}
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveCard(null);
    if (!over) {
      try { getSocket().emit('card:unlock', { cardId: active.id }); } catch {}
      return;
    }

    const cardId = active.id;
    const overId = over.id;

    let targetColumnId = null;
    let targetCards = [];
    for (const col of (columns || [])) {
      if (col.id === overId) { targetColumnId = col.id; targetCards = col.cards || []; break; }
      const idx = (col.cards || []).findIndex(c => c.id === overId);
      if (idx !== -1) { targetColumnId = col.id; targetCards = col.cards || []; break; }
    }
    if (!targetColumnId) return;

    const filtered = targetCards.filter(c => c.id !== cardId);
    const overCardIdx = filtered.findIndex(c => c.id === overId);

    let position;
    if (filtered.length === 0) {
      position = 1.0;
    } else if (overCardIdx === -1 || overId === targetColumnId) {
      position = (filtered[filtered.length - 1]?.position || 0) + 1;
    } else {
      const prev = filtered[overCardIdx - 1];
      const next = filtered[overCardIdx];
      if (prev && next) {
        position = (prev.position + next.position) / 2;
      } else if (!prev) {
        position = (next?.position || 1) / 2;
      } else {
        position = (prev?.position || 0) + 1;
      }
    }

    moveCard?.(cardId, targetColumnId, position);

    try {
      const socket = getSocket();
      // Send the card's last-known updated_at so the server can detect conflicts
      const cardState = allCards.find(c => c.id === cardId);
      socket.emit('card:move', { cardId, columnId: targetColumnId, position, clientUpdatedAt: cardState?.updated_at });
      socket.emit('card:unlock', { cardId });
    } catch {}
  };

  const handleDragCancel = ({ active }) => {
    setActiveCard(null);
    try { getSocket().emit('card:unlock', { cardId: active.id }); } catch {}
  };

  const allCards = (columns || []).flatMap(c => c.cards || []);
  const totalPoints = allCards.reduce((s, c) => s + (c.points || 0), 0);
  const lastCol = (columns || [])[columns.length - 1];
  const donePoints = lastCol ? (lastCol.cards || []).reduce((s, c) => s + (c.points || 0), 0) : 0;
  const pct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      {totalPoints > 0 && (
        <div className="text-xs text-gray-500 px-1">
          Board total: <strong>{totalPoints} pts</strong> · Completed: <strong>{donePoints} pts ({pct}%)</strong>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {(columns || []).map(col => (
            <Column key={col.id} column={col} lockedCards={lockedCards} />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <Card card={activeCard} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default Board;
