import localforage from 'localforage';

export type LogEntry = {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: 'info' | 'warning' | 'error' | 'success';
  user?: string;
};

const LOGS_KEY = 'system_logs_data';

export const logAction = async (action: string, details: string, type: LogEntry['type'] = 'info') => {
  if (typeof window === 'undefined') return;
  try {
    const logs: LogEntry[] = (await localforage.getItem<LogEntry[]>(LOGS_KEY)) || [];
    
    // Create new log
    const authUserStr = window.localStorage.getItem('auth_user');
    let username = 'System';
    if (authUserStr) {
      try {
        const user = JSON.parse(authUserStr);
        username = user.username || 'System';
      } catch (e) {}
    }
    const newLog: LogEntry = {
      user: username,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action,
      details,
      type
    };
    
    // Save to local storage and localforage for compatibility
    const updatedLogs = [newLog, ...logs];
    window.localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    await localforage.setItem(LOGS_KEY, updatedLogs);
    
    // Dispatch event to sync state across the app
    window.dispatchEvent(new Event("local-storage"));
    window.dispatchEvent(new CustomEvent("folder-sync-updated", { detail: [LOGS_KEY] }));
  } catch (err) {
    console.error("Failed to log action:", err);
  }
};
