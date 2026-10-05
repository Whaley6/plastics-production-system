const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { Role, defaultRoles } from './pages/Roles';")) {
  code = code.replace(
    "import { useAuth } from './hooks/useAuth';",
    "import { useAuth } from './hooks/useAuth';\nimport { Role, defaultRoles } from './pages/Roles';"
  );
}

if (!code.includes("const currentRole =")) {
  code = code.replace(
    "const { user, logout } = useAuth();",
    "const { user, logout } = useAuth();\n  const [roles] = useLocalStorage<Role[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === user?.role) || defaultRoles.find((r: Role) => r.id === 'worker') || defaultRoles[0];"
  );
}

// ensure we fallback to a page they have permission to
code = code.replace(
  "const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'workers');",
  "const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'workers');\n\n  // Default to a permitted page if they don't have access\n  useEffect(() => {\n    if (user && currentRole && currentPage !== 'account' && currentPage !== 'settings' && currentPage !== 'roles') {\n      if (!(currentRole.permissions as any)[currentPage]) {\n        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'archive'].find(p => (currentRole.permissions as any)[p]);\n        if (firstPermitted) setCurrentPage(firstPermitted as Page);\n      }\n    }\n  }, [currentRole, currentPage, user, setCurrentPage]);"
);

fs.writeFileSync('src/App.tsx', code);
