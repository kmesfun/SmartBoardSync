import { create } from 'zustand';

const useBoardStore = create((set, get) => ({
  board: null,
  columns: [],
  lockedCards: {},
  activeUsers: [],

  setBoard: (board, columns) => set({ board, columns }),

  moveCard: (cardId, toColumnId, position) => {
    set((state) => {
      const columns = state.columns.map((col) => {
        const cards = col.cards.filter((c) => c.id !== cardId);
        return { ...col, cards };
      });
      const card = state.columns
        .flatMap((c) => c.cards)
        .find((c) => c.id === cardId);
      if (!card) return { columns };
      const updated = columns.map((col) => {
        if (col.id === toColumnId) {
          const newCards = [...col.cards, { ...card, column_id: toColumnId, position }]
            .sort((a, b) => a.position - b.position);
          return { ...col, cards: newCards };
        }
        return col;
      });
      return { columns: updated };
    });
  },

  lockCard: (cardId, user) => {
    set((state) => ({
      lockedCards: { ...state.lockedCards, [cardId]: user },
    }));
  },

  unlockCard: (cardId) => {
    set((state) => {
      const { [cardId]: _, ...rest } = state.lockedCards;
      return { lockedCards: rest };
    });
  },

  setActiveUsers: (users) => set({ activeUsers: users }),

  updateCardPoints: (cardId, points) => {
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, points } : c)),
      })),
    }));
  },

  addCard: (card) => {
    set((state) => ({
      columns: state.columns.map((col) =>
        col.id === card.column_id
          ? { ...col, cards: [...col.cards, card].sort((a, b) => a.position - b.position) }
          : col
      ),
    }));
  },

  updateCard: (updatedCard) => {
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === updatedCard.id ? { ...c, ...updatedCard } : c)),
      })),
    }));
  },
}));

export { useBoardStore };
export default useBoardStore;
