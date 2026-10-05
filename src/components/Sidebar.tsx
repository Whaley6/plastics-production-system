import { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  Wrench, 
  PackageSearch, 
  MessageSquareWarning, 
  Factory,
  Server,
  Trash2,
  Settings2,
  Cpu,
  FileSpreadsheet,
  Menu,
  ChevronDown,
  Activity
} from 'lucide-react';
import LocalSyncModal from './LocalSyncModal';
import { useSyncStatus, checkConnection } from '../hooks/useLocalStorage';
import { generateDailyReport } from '../utils/dailyReport';
import { logAction } from '../utils/logger';
import { useAuth } from '../hooks/useAuth';
import { Role, defaultRoles } from '../pages/Roles';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const syncStatus = useSyncStatus();
  const { user, logout } = useAuth();
  const [roles] = useLocalStorage<Role[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === 'worker') || defaultRoles[0];
  
  const navItems = [
    { id: 'workers', label: 'Worker Management', icon: Users },
    { id: 'maintenance', label: 'Maintenance & Orders', icon: Wrench },
    { id: 'cnc', label: 'CNC Mold Tickets', icon: Cpu },
    { id: 'auxiliary', label: 'Utilities Equipment', icon: Settings2 },
    { id: 'production', label: 'Production Orders', icon: PackageSearch },
    { id: 'complaints', label: 'Worker KPIs', icon: MessageSquareWarning },
    { id: 'machines', label: 'Machine Directory', icon: Factory },
    { id: 'machine-health', label: 'Machine Health & Downtime', icon: Activity },
    { id: 'archive', label: 'System Archive', icon: Trash2 },
  ].filter(item => {
    if (item.id === 'machine-health') {
      return (currentRole.permissions as any)['machine-health'] !== false && ((currentRole.permissions as any)['machines'] !== false || (currentRole.permissions as any)['machines_readonly'] === true);
    }
    return (currentRole.permissions as any)[item.id] !== false || (currentRole.permissions as any)[item.id + '_readonly'] === true;
  });

  return (
    <aside className={`border-r border-divider bg-surface flex flex-col h-full shrink-0 py-6 justify-between overflow-x-hidden overflow-y-auto transition-all duration-300 ${isOpen ? 'w-[240px]' : 'w-[72px]'}`}>
      <div>
        <div className={`mb-8 flex items-center ${isOpen ? 'px-6 justify-between' : 'px-0 justify-center'}`}>
          {isOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img src="/logo.svg" alt="Apex Logo" className="w-8 h-8 rounded-lg shrink-0 shadow-sm" referrerPolicy="no-referrer" />
              <div className="text-lg font-bold tracking-tighter text-blue-400 whitespace-nowrap overflow-hidden leading-tight">
                APEX PLASTICS <span className="text-[10px] font-medium text-quaternary block tracking-normal uppercase">Operations Suite</span>
              </div>
            </div>
          ) : (
            <img src="/logo.svg" alt="Apex Logo" className="w-8 h-8 rounded-lg shrink-0 shadow-sm" referrerPolicy="no-referrer" />
          )}
          <div className="flex items-center gap-1">
            {isOpen && (
              <div className="relative">
                <button type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setIsSettingsOpen(false), 200); }}
                  className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-elevated shrink-0"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isSettingsOpen && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-[#1A233A] border border-divider rounded-lg shadow-lg z-50 overflow-hidden">
                    {currentRole.permissions.settings !== false && (
                      <>
                        <button type="button" onClick={() => { onNavigate('settings'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Settings</button>
                        <button type="button" onClick={() => { onNavigate('roles'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Roles & Permissions</button>
                      </>
                    )}
                    <button type="button" onClick={() => { onNavigate('account'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors">Account</button>
                    <button type="button" onClick={() => { logout(); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-colors border-t border-divider/50">Sign Out</button>
                  </div>
                )}
              </div>
            )}
            <button type="button" 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-elevated shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="flex flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button type="button"
                key={item.id}
                title={!isOpen ? item.label : undefined}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center py-3 text-[13px] font-medium transition-colors border-l-[3px] cursor-pointer outline-none ${isOpen ? 'px-5' : 'justify-center px-0'} ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500' 
                    : 'text-tertiary border-transparent hover:text-secondary hover:bg-surface-elevated/50'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isOpen ? 'mr-3' : ''} shrink-0 ${isActive ? 'text-blue-500' : 'text-tertiary'}`} />
                {isOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="flex flex-col mt-8">
        <button type="button"
          title={!isOpen ? "Daily Excel Report" : undefined}
          onClick={async () => {
            try {
              await generateDailyReport();
              logAction('System', 'Downloaded Daily Overview Report', 'info');
            } catch (err: any) {
              console.error('Report generation error:', err);
              logAction('System', `Failed to generate report: ${err.message}`, 'error');
              alert(`Failed to generate report: ${err.message}`);
            }
          }}
          className={`w-full flex items-center py-3 text-[13px] font-medium transition-colors cursor-pointer outline-none text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 ${isOpen ? 'px-5' : 'justify-center px-0'}`}
        >
          <FileSpreadsheet className={`w-[18px] h-[18px] shrink-0 ${isOpen ? 'mr-3' : ''}`} />
          {isOpen && <span className="truncate">Daily Excel Report</span>}
        </button>

        
      </div>
      <LocalSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
    </aside>
  );
}
