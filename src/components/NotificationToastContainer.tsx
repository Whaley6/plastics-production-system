import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Bell, 
  PackageSearch, 
  CheckCircle2, 
  Megaphone, 
  MessageSquare, 
  AlertTriangle, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { AppNotification } from '../types/notifications';

interface NotificationToastContainerProps {
  onNavigate?: (page: any) => void;
}

interface ToastItem extends AppNotification {
  toastId: string;
}

export default function NotificationToastContainer({ onNavigate }: NotificationToastContainerProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (e: CustomEvent<AppNotification>) => {
      const notification = e.detail;
      if (!notification) return;

      const newToast: ToastItem = {
        ...notification,
        toastId: `${notification.id}-${Date.now()}`
      };

      setToasts(prev => [newToast, ...prev].slice(0, 4));

      // Auto dismiss
      const duration = notification.priority === 'urgent' ? 10000 : 6500;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastId !== newToast.toastId));
      }, duration);
    };

    window.addEventListener('app-toast-notification', handleNewToast as EventListener);
    return () => {
      window.removeEventListener('app-toast-notification', handleNewToast as EventListener);
    };
  }, []);

  const dismissToast = (toastId: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order_created':
      case 'order_updated':
        return <PackageSearch className="w-5 h-5 text-blue-400" />;
      case 'item_checked':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'system_broadcast':
        return <Megaphone className="w-5 h-5 text-amber-400" />;
      case 'direct_message':
        return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'alert':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const isUrgent = toast.priority === 'urgent';
          const isHigh = toast.priority === 'high';

          return (
            <motion.div
              key={toast.toastId}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all ${
                isUrgent
                  ? 'bg-rose-950/90 border-rose-500/50 shadow-rose-900/40 text-white'
                  : isHigh
                  ? 'bg-amber-950/90 border-amber-500/50 shadow-amber-900/30 text-white'
                  : 'bg-[#151c2f]/95 border-blue-500/30 shadow-black/60 text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  isUrgent 
                    ? 'bg-rose-500/20 ring-1 ring-rose-500/40' 
                    : isHigh 
                    ? 'bg-amber-500/20 ring-1 ring-amber-500/40' 
                    : 'bg-blue-500/20 ring-1 ring-blue-500/30'
                }`}>
                  {getIcon(toast.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold truncate tracking-tight text-white flex items-center gap-1.5">
                      {toast.title}
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-rose-500 text-white rounded">
                          Urgent
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-tertiary shrink-0">
                      Just now
                    </span>
                  </div>

                  <p className="text-[11px] text-secondary/90 leading-relaxed line-clamp-2 mb-2 font-normal">
                    {toast.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                    <span className="text-tertiary">
                      From: <span className="text-secondary font-medium">{toast.senderUsername}</span>
                    </span>

                    {toast.link && onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(toast.link);
                          dismissToast(toast.toastId);
                        }}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.toastId)}
                  className="text-tertiary hover:text-white p-1 rounded-md transition-colors shrink-0 -mr-1 -mt-1"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
