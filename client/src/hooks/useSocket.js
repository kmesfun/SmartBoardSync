import { useEffect } from 'react';
import socket from '../lib/socket';
import { useBoardStore } from '../store/boardStore';

export function useSocket(boardId) {
  // Subscribe only to confirm the hook re-runs if boardId changes.
  // Inside handlers we call useBoardStore.getState() so we always get the
  // latest action references without the stale-closure problem.
  useEffect(() => {
    if (!boardId) return;
    if (!socket.connected) socket.connect();

    socket.emit('presence:join', { boardId });

    const onPresence = ({ activeUsers }) =>
      useBoardStore.getState().setActiveUsers(activeUsers);
    const onLocked = ({ cardId, lockedBy }) =>
      useBoardStore.getState().lockCard(cardId, lockedBy);
    const onUnlocked = ({ cardId }) =>
      useBoardStore.getState().unlockCard(cardId);
    const onMoved = ({ cardId, columnId, position }) =>
      useBoardStore.getState().moveCard(cardId, columnId, position);

    socket.on('presence:update', onPresence);
    socket.on('card:locked', onLocked);
    socket.on('card:unlocked', onUnlocked);
    socket.on('card:moved', onMoved);

    return () => {
      socket.off('presence:update', onPresence);
      socket.off('card:locked', onLocked);
      socket.off('card:unlocked', onUnlocked);
      socket.off('card:moved', onMoved);
    };
  }, [boardId]);
}

export default useSocket;
