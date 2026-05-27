/**
 * useSocket Hook Tests
 * Watch: npm run test:watch (vitest auto-reruns when useSocket.js changes)
 *
 * Verifies that socket events correctly update boardStore state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocket } from '../hooks/useSocket';
import socket from '../lib/socket';
import { useBoardStore } from '../store/boardStore';

vi.mock('../store/boardStore');
vi.mock('../lib/socket');

const mockStore = {
  lockCard: vi.fn(),
  unlockCard: vi.fn(),
  moveCard: vi.fn(),
  setActiveUsers: vi.fn(),
};

describe('useSocket hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardStore.mockReturnValue(mockStore);

    // Simulate socket.on registering listeners
    socket.on.mockImplementation((event, cb) => {
      socket._listeners = socket._listeners || {};
      socket._listeners[event] = cb;
    });

    socket.off.mockImplementation((event) => {
      if (socket._listeners) delete socket._listeners[event];
    });
  });

  function triggerEvent(event, payload) {
    socket._listeners?.[event]?.(payload);
  }

  it('joins the board room on mount', () => {
    renderHook(() => useSocket('board-1'));
    expect(socket.emit).toHaveBeenCalledWith('presence:join', { boardId: 'board-1' });
  });

  it('calls lockCard on card:locked event', () => {
    renderHook(() => useSocket('board-1'));
    triggerEvent('card:locked', { cardId: 'card-1', lockedBy: { id: 'u1', name: 'User A' } });
    expect(mockStore.lockCard).toHaveBeenCalledWith('card-1', { id: 'u1', name: 'User A' });
  });

  it('calls unlockCard on card:unlocked event', () => {
    renderHook(() => useSocket('board-1'));
    triggerEvent('card:unlocked', { cardId: 'card-1' });
    expect(mockStore.unlockCard).toHaveBeenCalledWith('card-1');
  });

  it('calls moveCard on card:moved event', () => {
    renderHook(() => useSocket('board-1'));
    triggerEvent('card:moved', { cardId: 'card-1', columnId: 'col-2', position: 1.5 });
    expect(mockStore.moveCard).toHaveBeenCalledWith('card-1', 'col-2', 1.5);
  });

  it('calls setActiveUsers on presence:update event', () => {
    renderHook(() => useSocket('board-1'));
    triggerEvent('presence:update', { activeUsers: [{ id: 'u1', name: 'User A' }] });
    expect(mockStore.setActiveUsers).toHaveBeenCalledWith([{ id: 'u1', name: 'User A' }]);
  });

  it('removes all socket listeners on unmount (no memory leak)', () => {
    const { unmount } = renderHook(() => useSocket('board-1'));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('card:locked', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('card:unlocked', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('card:moved', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('presence:update', expect.any(Function));
  });
});
