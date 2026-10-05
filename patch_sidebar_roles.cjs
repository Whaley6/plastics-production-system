const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!code.includes("import { Role, defaultRoles } from '../pages/Roles';")) {
  code = code.replace(
    "import { useAuth } from '../hooks/useAuth';",
    "import { useAuth } from '../hooks/useAuth';\nimport { Role, defaultRoles } from '../pages/Roles';\nimport { useLocalStorage } from '../hooks/useLocalStorage';"
  );
}

if (!code.includes("const [roles] = useLocalStorage<Role[]>('app_roles', defaultRoles);")) {
  code = code.replace(
    "const { logout } = useAuth();",
    "const { user, logout } = useAuth();\n  const [roles] = useLocalStorage<Role[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === 'employee') || defaultRoles[0];"
  );
}

// Ensure the useLocalStorage import isn't duplicated
code = code.replace(
  "import { useSyncStatus, checkConnection } from '../hooks/useLocalStorage';",
  "import { useSyncStatus, checkConnection } from '../hooks/useLocalStorage';" // Let it be, we can just import from it or have multiple imports
);

// We need to filter navItems
code = code.replace(
  "const navItems = [",
  "const navItems = [\n    { id: 'workers', label: 'Worker Management', icon: Users },\n    { id: 'maintenance', label: 'Maintenance & Orders', icon: Wrench },\n    { id: 'cnc', label: 'CNC Mold Tickets', icon: Cpu },\n    { id: 'auxiliary', label: 'Utilities Equipment', icon: Settings2 },\n    { id: 'production', label: 'Production Orders', icon: PackageSearch },\n    { id: 'complaints', label: 'Worker KPIs', icon: MessageSquareWarning },\n    { id: 'machines', label: 'Machine Directory', icon: Factory },\n    { id: 'archive', label: 'System Archive', icon: Trash2 },\n  ].filter(item => (currentRole.permissions as any)[item.id] !== false);\n\n  // Remove old navItems array\n  const dummy = ["
);
code = code.replace(
  "  ].filter(item => (currentRole.permissions as any)[item.id] !== false);\n\n  // Remove old navItems array\n  const dummy = [\n    { id: 'workers', label: 'Worker Management', icon: Users },\n    { id: 'maintenance', label: 'Maintenance & Orders', icon: Wrench },\n    { id: 'cnc', label: 'CNC Mold Tickets', icon: Cpu },\n    { id: 'auxiliary', label: 'Utilities Equipment', icon: Settings2 },\n    { id: 'production', label: 'Production Orders', icon: PackageSearch },\n    { id: 'complaints', label: 'Worker KPIs', icon: MessageSquareWarning },\n    { id: 'machines', label: 'Machine Directory', icon: Factory },\n    { id: 'archive', label: 'System Archive', icon: Trash2 },\n  ];",
  "  ].filter(item => (currentRole.permissions as any)[item.id] !== false);"
);

// Conditionally show settings and roles based on currentRole.permissions.settings
code = code.replace(
  `<button onClick={() => { onNavigate('settings'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Settings</button>
                    <button onClick={() => { onNavigate('roles'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Roles & Permissions</button>`,
  `{currentRole.permissions.settings !== false && (
                      <>
                        <button onClick={() => { onNavigate('settings'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Settings</button>
                        <button onClick={() => { onNavigate('roles'); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-secondary hover:text-white hover:bg-white/10 transition-colors border-b border-divider/50">Roles & Permissions</button>
                      </>
                    )}`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
