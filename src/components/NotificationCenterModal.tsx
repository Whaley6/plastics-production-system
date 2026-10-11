import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Plus, 
  PackageSearch, 
  CheckCircle2, 
  Megaphone, 
  MessageSquare, 
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification, NotificationType } from '../types/notifications';
import { useAuth } from '../hooks/useAuth';
import { SendSystemMessageModal } from './SendSystemMessageModal';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification, 
    clearAllNotifications 
  } = useNotifications();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'orders' | 'checks' | 'messages'>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notifications_sound_muted') === 'true');

  if (!isOpen) return null;

  const currentUsername = user?.username || 'guest';

  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    localStorage.setItem('notifications_sound_muted', String(nextState));
  };

  // Filter based on active tab
  const filteredNotifications = notifications.filter(n => {
    const isRead = Array.isArray(n.readBy) && n.readBy.includes(currentUsername);
    if (activeTab === 'unread') return !isRead;
    if (activeTab === 'orders') return n.type === 'order_created' || n.type === 'order_updated';
    if (activeTab === 'checks') return n.type === 'item_checked';
    if (activeTab === 'messages') return n.type === 'system_broadcast' || n.type === 'direct_message';
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'order_created':
      case 'order_updated':
        return <PackageSearch className="w-4 h-4 text-emerald-400" />;
      case 'item_checked':
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
      case 'system_broadcast':
        return <Megaphone className="w-4 h-4 text-purple-400" />;
      case 'direct_message':
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case 'alert':
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link && onNavigate) {
      onNavigate(notif.link);
      onClose();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div 
          className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-xl w-full flex flex-col h-[82vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Bell className="w-5 h-5" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-tertiary">Real-time alerts for orders, checks & system messages</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 text-tertiary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                title={isMuted ? 'Unmute notification chime' : 'Mute notification chime'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
              <button 
                type="button" 
                onClick={onClose}
                className="p-1.5 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Ribbon & Tabs */}
          <div className="px-6 py-2.5 bg-surface/40 border-b border-divider flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'unread'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('checks')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'checks'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                Checks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                Messages
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 text-xs">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1 text-secondary hover:text-primary bg-surface hover:bg-surface-elevated border border-divider rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Message</span>
              </button>
            </div>
          </div>

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0">
            {filteredNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center text-tertiary border border-divider">
                  <Bell className="w-6 h-6 opacity-40" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">No Notifications</h4>
                  <p className="text-xs text-tertiary mt-0.5">
                    {activeTab === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : "You have no notifications in this category yet."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(true)}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-divider text-xs text-primary font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Send a System Message</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const isRead = Array.isArray(notif.readBy) && notif.readBy.includes(currentUsername);
                const isUrgent = notif.priority === 'urgent';
                const isHigh = notif.priority === 'high';
                const isBroadcast = notif.targetUsername === 'all';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2 ${
                      !isRead
                        ? 'bg-surface-elevated/70 border-blue-500/40 shadow-xs hover:border-blue-500'
                        : 'bg-surface/60 border-divider/70 hover:bg-surface-elevated/40 hover:border-divider'
                    } ${isUrgent ? 'border-rose-500/60 bg-rose-500/5' : ''}`}
                  >
                    {/* Top Row: Icon, Title, Badges, Time */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isUrgent 
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                            : 'bg-surface-elevated border-divider'
                        }`}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs font-bold leading-tight ${!isRead ? 'text-primary' : 'text-secondary'}`}>
                              {notif.title}
                            </h4>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                            {isUrgent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                URGENT
                              </span>
                            )}
                            {isHigh && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                HIGH
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-tertiary mt-0.5">
                            <span>From: <strong className="text-secondary">{notif.senderUsername}</strong></span>
                            <span>•</span>
                            <span className="font-mono">{formatTimestamp(notif.timestamp)}</span>
                            <span>•</span>
                            <span className={isBroadcast ? 'text-purple-400' : 'text-blue-400'}>
                              {isBroadcast ? '📢 All Users' : '🔒 Direct to You'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notif.id);
                          }}
                          className="p-1 text-tertiary hover:text-rose-400 hover:bg-surface rounded-md transition-colors cursor-pointer"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notification Message Content */}
                    <p className="text-xs text-secondary leading-relaxed pl-10.5 pr-2">
                      {notif.message}
                    </p>

                    {/* Click Link Footer (if actionable) */}
                    {notif.link && (
                      <div className="pl-10.5 flex items-center justify-between text-[11px] text-blue-400 font-semibold pt-1">
                        <span className="flex items-center gap-1 hover:underline">
                          <span>View in {notif.link.replace('-', ' ')}</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-divider flex items-center justify-between bg-surface/80 shrink-0 text-xs">
            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-tertiary hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Notifications</span>
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-surface hover:bg-surface-elevated border border-divider text-primary rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Compose System Message Modal */}
      <SendSystemMessageModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </>
  );
};

export default NotificationCenterModal;
