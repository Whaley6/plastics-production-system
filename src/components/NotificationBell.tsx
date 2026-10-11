import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export default function NotificationBell({ onClick, className = '' }: NotificationBellProps) {
  const { unreadCount, notifications } = useNotifications();

  // Check if any unread notification is urgent or high
  const hasUrgent = notifications.some(n => !n.isRead && (n.priority === 'urgent' || n.priority === 'high'));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2 rounded-xl text-tertiary hover:text-white hover:bg-surface-elevated transition-all flex items-center justify-center group ${className}`}
      title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      aria-label="Notifications"
    >
      <Bell className={`w-5 h-5 transition-transform group-hover:scale-110 ${
        unreadCount > 0 ? 'text-blue-400' : 'text-tertiary'
      }`} />

      {unreadCount > 0 && (
        <>
          {/* Subtle pulse effect for urgent or unread */}
          <span className={`absolute top-1.5 right-1.5 flex h-2.5 w-2.5 ${hasUrgent ? 'animate-ping' : ''}`}>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              hasUrgent ? 'bg-rose-500' : 'bg-blue-500'
            }`} />
          </span>

          {/* Badge counter */}
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white shadow-md ${
            hasUrgent 
              ? 'bg-rose-600 ring-2 ring-canvas animate-pulse' 
              : 'bg-blue-600 ring-2 ring-canvas'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </>
      )}
    </button>
  );
}
