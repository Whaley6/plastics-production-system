import React, { useState, useEffect } from 'react';
import { Download, Upload, Server, X, Check, FileJson, Database, ShieldAlert, FolderOpen, Files } from 'lucide-react';
import { setDatabaseFolderHandle, getDatabaseFolderHandle, loadFromFolder } from '../hooks/useLocalStorage';

type LocalSyncModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LocalSyncModal({ isOpen, onClose }: LocalSyncModalProps) {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | null>(null);

  // Check connection status when modal opens
  useEffect(() => {
    const checkState = async () => {
      const handle = getDatabaseFolderHandle();
      if (handle) {
        try {
          const status = await handle.queryPermission({ mode: 'readwrite' });
          setPermissionStatus(status);
          setIsConnected(status === 'granted');
        } catch (e) {
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
        setPermissionStatus(null);
      }
    };
    if (isOpen) checkState();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPermission = async () => {
    const handle = getDatabaseFolderHandle();
    if (handle) {
      try {
        const status = await handle.requestPermission({ mode: 'readwrite' });
        setPermissionStatus(status);
        setIsConnected(status === 'granted');
        if (status === 'granted') {
          setSuccessMsg('Permission granted! Auto-sync is active.');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } catch (err: any) {
        setErrorMsg('Failed to get permission: ' + err.message);
      }
    }
  };

  const handleConnectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        setErrorMsg('Your browser does not support Folder Sync. Please use an updated Chrome/Edge browser.');
        return;
      }

      // Use the modern File System Access API for Directories
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Try to load existing database.json if it exists
      try {
        await loadFromFolder(dirHandle);
      } catch (e) {
        console.warn("No existing database.json found in folder - will start fresh sync.");
      }

      // Keep connection open
      await setDatabaseFolderHandle(dirHandle);
      setIsConnected(true);
      setSuccessMsg('Successfully connected to folder! Data will now auto-save.');
      
      // Delay reload to let user see success
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('Failed to connect: ' + err.message);
        setTimeout(() => setErrorMsg(''), 4000);
      }
    }
  };

  const handleDisconnect = async () => {
    await setDatabaseFolderHandle(null);
    setIsConnected(false);
    setPermissionStatus(null);
    setSuccessMsg('Disconnected from local folder.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-canvas border border-divider rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/30">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            PC Folder Sync (No Pictures in JSON)
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-full transition-colors text-tertiary hover:text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            {(window.self !== window.top) && (
               <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm">
                 <strong>⚠️ Security Constraint:</strong> You are currently viewing the app inside the AI Studio "Preview" frame. 
                 <br/><br/>
                 Browser security blocks directory access here. To enable <strong>Folder Sync</strong>, please click the <strong>"Open in New Tab"</strong> icon (top right) and use this menu there.
               </div>
            )}
            <p className="text-sm text-secondary leading-relaxed">
               <strong>Advanced Organization:</strong> This mode splits your data into cleanly categorized files:
            </p>
            <ul className="text-xs text-tertiary mt-2 grid grid-cols-2 gap-x-4 gap-y-1 ml-4 list-disc">
              <li><code className="text-blue-400">workers.json</code></li>
              <li><code className="text-blue-400">maintenance.json</code></li>
              <li><code className="text-blue-400">auxiliary.json</code></li>
              <li><code className="text-blue-400">production.json</code></li>
              <li><code className="text-blue-400">complaints.json</code></li>
              <li><code className="text-blue-400">machines.json</code></li>
              <li><code className="text-emerald-400 font-bold">media_assets.json</code></li>
            </ul>
            <p className="text-sm text-secondary mt-3 leading-relaxed text-balance">
               This keeps your data human-readable and separates large photo data from your records.
            </p>
          </div>

          <div className="bg-surface-elevated/50 p-4 rounded-lg border border-divider-subtle flex flex-col gap-3">
            {isConnected ? (
              <div className="flex flex-col gap-4 items-center p-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-primary mb-1">Folder Link Active</h3>
                  <p className="text-sm text-tertiary text-balance">
                    Your data is syncing in real-time to the individual modular JSON files inside your selected folder.
                  </p>
                </div>
                <button type="button"
                  onClick={handleDisconnect}
                  className="mt-2 px-4 py-2 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 text-sm font-medium transition-colors"
                >
                  Unlink Folder
                </button>
              </div>
            ) : permissionStatus === 'prompt' ? (
              <div className="flex flex-col gap-4 items-center p-4 text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                  <ShieldAlert className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-primary mb-1">Permission Required</h3>
                  <p className="text-sm text-tertiary text-balance">
                    The app remembers your folder, but needs your permission again to start saving.
                  </p>
                </div>
                <button type="button"
                  onClick={handleVerifyPermission}
                  className="mt-2 w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-bold shadow-lg transition-all"
                >
                  Verify & Reconnect
                </button>
                <button type="button"
                  onClick={handleDisconnect}
                  className="text-tertiary hover:text-secondary text-xs mt-2"
                >
                  Forget this folder
                </button>
              </div>
            ) : (
              <>
                <button type="button"
                  onClick={handleConnectFolder}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-canvas hover:bg-surface-elevated border border-divider rounded-lg transition-colors text-blue-500 font-medium text-sm shadow-sm"
                >
                  <FolderOpen className="w-6 h-6 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <div className="text-primary text-sm font-semibold">Select Sync Folder</div>
                    <div className="text-tertiary text-xs">Choose a folder on your PC to store the database files.</div>
                  </div>
                </button>
                
                <div className="p-3 bg-surface border border-divider rounded-xl text-[11px] text-quinary italic text-center">
                  Linking a folder allows the app to manage multiple files for better organization.
                </div>
              </>
            )}
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-500 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-500 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <X className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
