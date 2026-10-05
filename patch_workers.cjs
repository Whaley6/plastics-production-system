const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

if (!code.includes("import { useAuth }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';"
  );
}

code = code.replace(
  "const [activeRoleId] = useLocalStorage<string>('activeRoleId', 'super-admin');",
  "const { user } = useAuth();\n  const activeRoleId = user?.role || 'super-admin';"
);

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
