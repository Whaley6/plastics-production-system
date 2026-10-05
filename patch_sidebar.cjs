const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const target = `<button
          title={!isOpen ? "PC Backup & Sync" : undefined}
          onClick={() => setIsSyncModalOpen(true)}
          className={\`w-full flex items-center py-3 text-[13px] font-medium transition-colors cursor-pointer outline-none text-emerald-500/80 hover:text-emerald-400 hover:bg-emerald-500/10 \${isOpen ? 'justify-between px-5' : 'justify-center px-0 flex-col gap-2'}\`}
        >
          <div className="flex items-center">
            <Server className={\`w-[18px] h-[18px] shrink-0 \${isOpen ? 'mr-3' : ''}\`} />
            {isOpen && <span className="truncate">PC Backup & Sync</span>}
          </div>
          <div 
            className="flex items-center relative group p-1 shrink-0"
            onClick={(e) => {
              if (syncStatus === 'disconnected') {
                e.stopPropagation();
                checkConnection();
              }
            }}
          >
            {syncStatus === 'disconnected' && <span className="w-2 h-2 rounded-full bg-quaternary hover:bg-quaternary/80 cursor-pointer"></span>}
            {syncStatus === 'up-to-date' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
            {syncStatus === 'syncing' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>}
            {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
            {syncStatus === 'permission-required' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+8px)] whitespace-nowrap bg-surface-strong px-2 py-1 rounded-lg text-[10px] text-primary opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-divider capitalize">
              {syncStatus.replace('-', ' ')}
            </div>
          </div>
        </button>`;

if (code.includes('PC Backup & Sync')) {
  // It's safer to just split and replace based on a simpler regex to avoid indentation mismatches
  code = code.replace(/<button[^>]*title=\{!isOpen \? "PC Backup & Sync" : undefined\}[^>]*>[\s\S]*?<\/button>/, '');
  fs.writeFileSync('src/components/Sidebar.tsx', code);
  console.log('patched');
} else {
  console.log('not found');
}
