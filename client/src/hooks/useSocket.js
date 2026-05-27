import { useEffect } from 'react';
import socket from '../lib/socket';
import { useBoardStore } from '../store/boardStore';

export function useSocket(boardId) {
  const { moveCard, lockCard, unlockCard, setActiveUsers } = useBoardStore(s => s);

  useEffect(() => {
    if (!boardId) return;
    if (!socket.connected) socket.connect();

    socket.emit('presence:join', { boardId });

    const onPresence = ({ activeUsers }) => setActiveUsers(activeUsers);
    const onLocked = ({ cardId, lockedBy }) => lockCard(cardId, lockedBy);
    const onUnlocked = ({ cardId }) => unlockCard(cardId);
    const onMoved = ({ cardId, columnId, position }) => moveCard(cardId, columnId, position);

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
