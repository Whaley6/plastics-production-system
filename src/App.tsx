/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useClientStorage } from './hooks/useClientStorage';
import { useAuth } from './hooks/useAuth';
import { Role, defaultRoles } from './pages/Roles';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import WorkerManagement from './pages/WorkerManagement';
import MaintenanceOrders from './pages/MaintenanceOrders';
import AuxiliaryMaintenance from './pages/AuxiliaryMaintenance';
import ProductionOrders from './pages/ProductionOrders';
import WorkerKPIs from './pages/WorkerKPIs';
import MachineDirectory from './pages/MachineDirectory';
import SystemArchive from './pages/SystemArchive';
import CncMoldTickets from './pages/CncMoldTickets';
import MachineHealthAnalytics from './pages/MachineHealthAnalytics';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Account from './pages/Account';
import { Send } from 'lucide-react';
import NotificationToastContainer from './components/NotificationToastContainer';
import NotificationBell from './components/NotificationBell';
import NotificationCenterModal from './components/NotificationCenterModal';
import SendSystemMessageModal from './components/SendSystemMessageModal';

type Page = 'workers' | 'maintenance' | 'auxiliary' | 'production' | 'complaints' | 'machines' | 'machine-health' | 'archive' | 'cnc' | 'settings' | 'account' | 'roles';

const PageContent = ({ page, isDarkMode, setIsDarkMode, textScale, setTextScale }: { page: Page, isDarkMode: boolean, setIsDarkMode: any, textScale: number, setTextScale: any }) => {
   switch (page) {
     case 'workers': return <WorkerManagement />;
     case 'maintenance': return <MaintenanceOrders />;
     case 'auxiliary': return <AuxiliaryMaintenance />;
     case 'production': return <ProductionOrders />;
     case 'complaints': return <WorkerKPIs />;
     case 'machines': return <MachineDirectory />;
     case 'machine-health': return <MachineHealthAnalytics />;
     case 'archive': return <SystemArchive />;
     case 'cnc': return <CncMoldTickets />;
     case 'settings': return <Settings isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} textScale={textScale} setTextScale={setTextScale} />;
     case 'account': return <Account />;
     case 'roles': return <Roles />;
     default: return <WorkerManagement />;
   }
};

export default function App() {
 const { user, logout } = useAuth();
  const [roles] = useLocalStorage<Role[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === 'worker') || defaultRoles[0];
 const [currentPage, setCurrentPage] = useClientStorage<Page>('currentPage', 'workers');
 const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
 const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);

  // Check if current page is read-only
  const isReadOnly = currentRole?.id !== 'super-admin' && (currentRole?.permissions as any)?.[currentPage + '_readonly'] === true;

  // Default to a permitted page if they don't have access
  useEffect(() => {
    if (isReadOnly) {
      const observer = new MutationObserver(() => {
        document.querySelectorAll('.global-readonly-module button:not(.allow-readonly)').forEach(btn => {
          if (
            btn.querySelector('.lucide-x') || 
            btn.querySelector('.lucide-search') || 
            btn.textContent?.includes('Cancel') || 
            btn.textContent?.includes('Export') ||
            btn.className.includes('border-b-2') ||
            btn.textContent?.includes('Close')
          ) {
            btn.classList.add('allow-readonly');
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (user && currentRole && currentPage !== 'account') {
      let hasAccess = false;
      if (currentPage === 'settings' || currentPage === 'roles') {
        hasAccess = currentRole.permissions.settings !== false;
      } else if (currentPage === 'machine-health') {
        hasAccess = (currentRole.permissions as any)['machine-health'] !== false && (currentRole.permissions.machines !== false || (currentRole.permissions as any)['machines_readonly'] === true);
      } else {
        hasAccess = (currentRole.permissions as any)[currentPage] !== false || (currentRole.permissions as any)[currentPage + '_readonly'] === true;
      }
      
      if (!hasAccess) {
        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'machine-health', 'archive'].find(p => (currentRole.permissions as any)[p] !== false || (currentRole.permissions as any)[p + '_readonly'] === true);
        if (firstPermitted) setCurrentPage(firstPermitted as Page);
        else setCurrentPage('account');
      }
    }
  }, [currentRole, currentPage, user, setCurrentPage]);
 const [isDarkMode, setIsDarkMode] = useClientStorage<boolean>('isDarkMode', true);
 const [textScale, setTextScale] = useClientStorage<number>('textScale', 1);

 useEffect(() => {
 if (isDarkMode) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 }, [isDarkMode]);

 useEffect(() => {
   const size = `${11 + textScale}px`;
   document.documentElement.style.fontSize = size;
 }, [textScale]);

 if (!user) return <Login />;

  return (
    <div className="flex h-screen w-full bg-canvas text-primary font-sans overflow-hidden transition-colors duration-200">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className={`flex-1 flex flex-col overflow-hidden bg-canvas ${isReadOnly ? 'global-readonly-module' : ''}`}>
        {/* Top Operational Header Bar */}
        <header className="h-14 border-b border-divider bg-surface/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider hidden sm:inline">Apex Operations</span>
            <span className="text-tertiary/40 hidden sm:inline">/</span>
            <span className="text-sm font-bold text-primary capitalize flex items-center gap-2">
              {currentPage.replace('-', ' ')}
              {isReadOnly && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  Read Only
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Send System Message / Broadcast Button */}
            <button
              type="button"
              onClick={() => setIsSendMessageOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
              title="Send broadcast or direct system notification"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send Message</span>
            </button>

            {/* Live Notification Bell */}
            <NotificationBell onClick={() => setIsNotificationCenterOpen(true)} />

            {/* User Profile Pill */}
            <div 
              onClick={() => setCurrentPage('account')}
              className="flex items-center gap-2.5 pl-3 border-l border-divider cursor-pointer hover:opacity-80 transition-opacity"
              title={`Logged in as ${user.username} (${currentRole.name})`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-primary truncate max-w-[120px]">{user.name || user.username}</span>
                <span className="text-[10px] text-tertiary capitalize">{currentRole.name}</span>
              </div>
            </div>
          </div>
        </header>
 <AnimatePresence mode="wait">
 <motion.div
   key={currentPage}
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   exit={{ opacity: 0, y: -10 }}
   transition={{ duration: 0.15 }}
   className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto relative h-full w-full"
 >
 <PageContent page={currentPage} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} textScale={textScale} setTextScale={setTextScale} />
 </motion.div>
 </AnimatePresence>
      </main>

      {/* Floating Real-time Notification Popups */}
      <NotificationToastContainer onNavigate={setCurrentPage} />

      {/* Interactive Notification Center Drawer/Modal */}
      <NotificationCenterModal 
        isOpen={isNotificationCenterOpen} 
        onClose={() => setIsNotificationCenterOpen(false)} 
        onNavigate={setCurrentPage} 
      />

      {/* Send Broadcast / Direct Message Modal */}
      <SendSystemMessageModal 
        isOpen={isSendMessageOpen} 
        onClose={() => setIsSendMessageOpen(false)} 
      />
    </div>
  );
}
