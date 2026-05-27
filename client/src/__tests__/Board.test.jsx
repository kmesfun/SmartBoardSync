/**
 * Board Component Tests
 * Watch: npm run test:watch (vitest auto-reruns on file changes)
 *
 * Re-runs when: Board.jsx, Column.jsx, Card.jsx, or boardStore.js changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from '../components/Board';
import { useBoardStore } from '../store/boardStore';

// ─── MOCK STORE STATE ─────────────────────────────────────────────────────────

const mockColumns = [
  {
    id: 'col-1',
    name: 'To Do',
    position: 1.0,
    cards: [
      { id: 'card-1', title: 'Fix login bug', position: 1.0, locked_by: null },
      { id: 'card-2', title: 'Add dark mode', position: 2.0, locked_by: null },
    ],
  },
  {
    id: 'col-2',
    name: 'In Progress',
    position: 2.0,
    cards: [
      { id: 'card-3', title: 'Write tests', position: 1.0, locked_by: 'other-user-id' },
    ],
  },
  {
    id: 'col-3',
    name: 'Done',
    position: 3.0,
    cards: [],
  },
];

vi.mock('../store/boardStore', () => ({
  useBoardStore: vi.fn(),
}));

// ─── BOARD RENDERING ──────────────────────────────────────────────────────────

describe('Board component', () => {
  beforeEach(() => {
    useBoardStore.mockReturnValue({
      columns: mockColumns,
      lockedCards: { 'card-3': { id: 'other-user-id', name: 'User B' } },
      activeUsers: [],
      moveCard: vi.fn(),
      lockCard: vi.fn(),
      unlockCard: vi.fn(),
    });
  });

  it('renders all column names', () => {
    render(<Board boardId="board-1" />);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders all card titles', () => {
    render(<Board boardId="board-1" />);

    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('shows a locked overlay on cards locked by another user', () => {
    render(<Board boardId="board-1" />);

    // The locked card should show a lock indicator
    const lockedCard = screen.getByTestId('card-card-3');
    expect(lockedCard).toHaveAttribute('data-locked', 'true');
  });

  it('renders an "Add card" button in each column', () => {
    render(<Board boardId="board-1" />);
    const addButtons = screen.getAllByText(/add card/i);
    expect(addButtons.length).toBe(3); // one per column
  });

  it('shows empty state for columns with no cards', () => {
    render(<Board boardId="board-1" />);
    // Done column is empty — should show a drop zone or empty message
    expect(screen.getByTestId('column-col-3-empty')).toBeInTheDocument();
  });
});
