const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

if (!code.includes("import { defaultRoles }")) {
  code = code.replace(
    "import { useAuth } from '../hooks/useAuth';",
    "import { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

code = code.replace(
  "const [roles] = useLocalStorage<any[]>('app_roles', []);",
  "const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);"
);

code = code.replace(
  "const activeRole = roles.find(r => r.id === activeRoleId);",
  "const activeRole = roles.find((r: any) => r.id === activeRoleId) || defaultRoles.find((r: any) => r.id === activeRoleId) || defaultRoles[0];"
);

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
