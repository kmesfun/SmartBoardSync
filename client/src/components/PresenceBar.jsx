import useBoardStore from '../store/boardStore';

const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];

export default function PresenceBar() {
  const activeUsers = useBoardStore(s => s.activeUsers);

  if (!activeUsers.length) return null;

  return (
    <div className="flex items-center gap-1">
      {activeUsers.map((user, i) => (
        <div
          key={user.id}
          title={user.name}
          className={`w-7 h-7 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-semibold`}
        >
          {user.name[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}
