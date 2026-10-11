import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Users, 
  User as UserIcon, 
  AlertTriangle, 
  Info, 
  BellRing,
  CheckCircle2,
  Megaphone,
  MessageSquare
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPriority } from '../types/notifications';

interface SendSystemMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: string;
}

export const SendSystemMessageModal: React.FC<SendSystemMessageModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'all'
}) => {
  const { sendNotification } = useNotifications();
  const [usersList, setUsersList] = useState<Array<{ username: string; role: string }>>([]);
  const [targetUser, setTargetUser] = useState<string>(defaultTarget);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch registered users from API
  useEffect(() => {
    if (!isOpen) return;
    setTargetUser(defaultTarget);
    setIsSuccess(false);

    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsersList(data);
        }
      })
      .catch(err => {
        console.warn('Could not fetch users list:', err);
      });
  }, [isOpen, defaultTarget]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const type = targetUser === 'all' ? 'system_broadcast' : 'direct_message';
      const resolvedTitle = title.trim() || (targetUser === 'all' ? '📢 System Broadcast' : '💬 Direct Message');

      sendNotification({
        title: resolvedTitle,
        message: message.trim(),
        type,
        targetUsername: targetUser,
        priority
      });

      setIsSuccess(true);
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setPriority('normal');
        setIsSubmitting(false);
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">Send Notification / System Message</h3>
              <p className="text-xs text-tertiary">Send a broadcast to all users or message a specific person</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-primary">Message Sent Successfully!</h4>
            <p className="text-xs text-tertiary">
              {targetUser === 'all' 
                ? 'Broadcast dispatched to all accounts.' 
                : `Direct message delivered to @${targetUser}.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4">
            {/* Recipient Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Recipient (Target)</span>
              </label>
              <select
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
                className="w-full bg-surface border border-divider rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">📢 All Users (Broadcast Announcement)</option>
                <optgroup label="Specific Accounts">
                  {usersList.map(u => (
                    <option key={u.username} value={u.username}>
                      👤 {u.username} ({u.role || 'user'})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-purple-400" />
                <span>Priority Level</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    priority === 'normal'
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-xs'
                      : 'bg-surface border-divider text-tertiary hover:text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    priority === 'high'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-xs'
                      : 'bg-surface border-divider text-tertiary hover:text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>High</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    priority === 'urgent'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-xs animate-pulse'
                      : 'bg-surface border-divider text-tertiary hover:text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgent!</span>
                </button>
              </div>
            </div>

            {/* Title / Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary">Subject / Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={targetUser === 'all' ? 'e.g. Factory Notice / Shift Update' : 'e.g. Please check Machine 3 order'}
                className="w-full bg-surface border border-divider rounded-xl px-3.5 py-2.5 text-xs text-primary placeholder:text-quaternary focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-primary">Message Body *</label>
                <span className="text-[10px] text-tertiary">{message.length}/500</span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={500}
                required
                rows={4}
                placeholder="Type your message here... The recipient(s) will receive an instant notification."
                className="w-full bg-surface border border-divider rounded-xl px-3.5 py-2.5 text-xs text-primary placeholder:text-quaternary focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-divider">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SendSystemMessageModal;
