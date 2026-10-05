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

 return ( <div className="flex h-screen w-full bg-canvas text-primary font-sans overflow-hidden transition-colors duration-200">
 <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
 <main className={`flex-1 flex flex-col overflow-hidden bg-canvas ${isReadOnly ? 'global-readonly-module' : ''}`}>
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
 </div>
 );
}
