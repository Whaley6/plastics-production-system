export type NotificationType = 
  | 'order_created' 
  | 'order_updated' 
  | 'item_checked' 
  | 'system_broadcast' 
  | 'direct_message' 
  | 'alert';

export type NotificationPriority = 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: NotificationType;
  senderUsername: string;
  senderRole?: string;
  targetUsername: 'all' | string; // 'all' for everyone, or specific username e.g. 'operator1'
  priority?: NotificationPriority;
  link?: string; // Route page ID, e.g. 'production' | 'maintenance' | 'cnc'
  readBy: string[]; // List of usernames who marked as read
  dismissedBy?: string[]; // List of usernames who deleted/hidden from their inbox
  metadata?: {
    orderId?: string;
    orderNumber?: string;
    machineId?: string;
    checkItemName?: string;
    module?: string;
  };
}
