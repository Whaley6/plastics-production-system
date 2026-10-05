import { useState, useEffect, useRef, useCallback } from 'react';

// Expose these helpers so the UI can connect/disconnect 
// (stubbed out since we now use the server directly)
export const setDatabaseFolderHandle = async (handle: any) => {};
export const getDatabaseFolderHandle = () => null;
export const checkConnection = async () => {};
export const loadFromFolder = async (dirHandle: any) => {};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  
  const stateRef = useRef(storedValue);
  useEffect(() => {
    stateRef.current = storedValue;
  }, [storedValue]);

  const isMounted = useRef(true);
  const pendingSaves = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchFromServer = async () => {
      if (pendingSaves.current > 0) return;
      try {
        const res = await fetch(`/api/data/${encodeURIComponent(key)}`, { cache: 'no-store' });
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return;
          }
          const data = await res.json();
          if (pendingSaves.current > 0) return;
          
          const newString = JSON.stringify(data);
          const currentString = window.localStorage.getItem(key);
          
          if (newString !== currentString) {
            window.localStorage.setItem(key, newString);
            if (isMounted.current) {
              setStoredValue(data);
            }
          }
        }
      } catch (err: any) {
        // Silently fall back to local storage if offline or server is temporarily restarting
        console.warn('Server sync unavailable, using local cache:', err?.message || err);
      }
    };

    fetchFromServer();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchFromServer, 5000);

    const handleSyncUpdate = (e: any) => {
      if (isMounted.current) {
        if (e.detail && Array.isArray(e.detail)) {
          if (e.detail.includes(key)) { 
             fetchFromServer();
          }
        } else {
          fetchFromServer();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('local-storage-sync', handleSyncUpdate);
    }

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('local-storage-sync', handleSyncUpdate);
      }
    };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;
      
      setStoredValue(valueToStore);
      stateRef.current = valueToStore;
      
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      pendingSaves.current++;
      fetch(`/api/data/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valueToStore)
      }).then(() => {
        pendingSaves.current--;
        if (typeof window !== 'undefined') {
           window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: [key] }));
        }
      }).catch(err => {
        pendingSaves.current--;
        console.warn("Could not save to server, saved locally:", err?.message || err);
      });
      
    } catch (error: any) {
      console.log(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export function useSyncStatus() {
  return 'up-to-date';
}
