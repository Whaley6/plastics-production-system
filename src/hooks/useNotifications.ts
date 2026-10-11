import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useAuth } from './useAuth';
import { AppNotification, NotificationType, NotificationPriority } from '../types/notifications';
import { playNotificationChime } from '../utils/notificationSound';

export interface SendNotificationParams {
  title: string;
  message: string;
  type?: NotificationType;
  targetUsername?: 'all' | string;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useLocalStorage<AppNotification[]>('app_notifications', []);
  const lastProcessedTimeRef = useRef<number>(Date.now());
  const initialLoadRef = useRef(true);

  const currentUsername = user?.username || 'guest';

  // Filter notifications relevant to current user and not dismissed
  const userNotifications = useMemo(() => {
    return (allNotifications || [])
      .filter(n => {
        const isTarget = n.targetUsername === 'all' || n.targetUsername === currentUsername;
        const isDismissed = Array.isArray(n.dismissedBy) && n.dismissedBy.includes(currentUsername);
        return isTarget && !isDismissed;
      })
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allNotifications, currentUsername]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !(Array.isArray(n.readBy) && n.readBy.includes(currentUsername))).length;
  }, [userNotifications, currentUsername]);

  // Detect incoming notifications from other accounts to show live toast
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (!allNotifications || allNotifications.length === 0) return;

    // Check newly added notifications since last check
    const newItems = allNotifications.filter(n => {
      const isNew = n.timestamp > lastProcessedTimeRef.current;
      const isFromOther = n.senderUsername !== currentUsername;
      const isTarget = n.targetUsername === 'all' || n.targetUsername === currentUsername;
      const notRead = !(Array.isArray(n.readBy) && n.readBy.includes(currentUsername));
      return isNew && isFromOther && isTarget && notRead;
    });

    if (newItems.length > 0) {
      newItems.forEach(item => {
        window.dispatchEvent(new CustomEvent('app-toast-notification', { detail: item }));
      });
      // Play sound
      const highestPriority = newItems.some(i => i.priority === 'urgent')
        ? 'urgent'
        : newItems.some(i => i.priority === 'high')
        ? 'high'
        : 'normal';
      playNotificationChime(highestPriority);
    }

    // Update watermark
    const latestTimestamp = Math.max(...allNotifications.map(n => n.timestamp || 0), lastProcessedTimeRef.current);
    lastProcessedTimeRef.current = latestTimestamp;
  }, [allNotifications, currentUsername]);

  // Send a new notification
  const sendNotification = useCallback((params: SendNotificationParams): AppNotification => {
    const newNotification: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: params.title,
      message: params.message,
      timestamp: Date.now(),
      type: params.type || 'system_broadcast',
      senderUsername: currentUsername,
      senderRole: user?.role || 'user',
      targetUsername: params.targetUsername || 'all',
      priority: params.priority || 'normal',
      link: params.link,
      metadata: params.metadata,
      readBy: [currentUsername], // Creator has read their own message
      dismissedBy: []
    };

    setAllNotifications(prev => [newNotification, ...(prev || [])]);
    return newNotification;
  }, [currentUsername, user?.role, setAllNotifications]);

  // Mark a specific notification as read
  const markAsRead = useCallback((id: string) => {
    setAllNotifications(prev => (prev || []).map(n => {
      if (n.id === id) {
        const currentRead = Array.isArray(n.readBy) ? n.readBy : [];
        if (!currentRead.includes(currentUsername)) {
          return { ...n, readBy: [...currentRead, currentUsername] };
        }
      }
      return n;
    }));
  }, [currentUsername, setAllNotifications]);

  // Mark all visible notifications as read
  const markAllAsRead = useCallback(() => {
    setAllNotifications(prev => (prev || []).map(n => {
      const isTarget = n.targetUsername === 'all' || n.targetUsername === currentUsername;
      if (isTarget) {
        const currentRead = Array.isArray(n.readBy) ? n.readBy : [];
        if (!currentRead.includes(currentUsername)) {
          return { ...n, readBy: [...currentRead, currentUsername] };
        }
      }
      return n;
    }));
  }, [currentUsername, setAllNotifications]);

  // Dismiss / hide a notification from user's view
  const dismissNotification = useCallback((id: string) => {
    setAllNotifications(prev => (prev || []).map(n => {
      if (n.id === id) {
        const currentDismissed = Array.isArray(n.dismissedBy) ? n.dismissedBy : [];
        if (!currentDismissed.includes(currentUsername)) {
          return { ...n, dismissedBy: [...currentDismissed, currentUsername] };
        }
      }
      return n;
    }));
  }, [currentUsername, setAllNotifications]);

  // Clear / dismiss all notifications for current user
  const clearAllNotifications = useCallback(() => {
    setAllNotifications(prev => (prev || []).map(n => {
      const isTarget = n.targetUsername === 'all' || n.targetUsername === currentUsername;
      if (isTarget) {
        const currentDismissed = Array.isArray(n.dismissedBy) ? n.dismissedBy : [];
        if (!currentDismissed.includes(currentUsername)) {
          return { ...n, dismissedBy: [...currentDismissed, currentUsername] };
        }
      }
      return n;
    }));
  }, [currentUsername, setAllNotifications]);

  return {
    notifications: userNotifications,
    rawNotifications: allNotifications,
    unreadCount,
    sendNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications
  };
}
