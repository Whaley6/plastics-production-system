const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!code.includes('useAuth')) {
  code = code.replace(
    "import { logAction } from '../utils/logger';",
    "import { logAction } from '../utils/logger';\nimport { useAuth } from '../hooks/useAuth';"
  );
}

if (!code.includes('const { logout } = useAuth()')) {
  code = code.replace(
    "const syncStatus = useSyncStatus();",
    "const syncStatus = useSyncStatus();\n  const { logout } = useAuth();"
  );
}

const logoutBtn = `<button onClick={() => { logout(); window.location.reload(); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-colors">Sign Out</button>`;

if (!code.includes('Sign Out')) {
  code = code.replace(
    /<\/div>\s*\}\)\s*<\/div>/,
    "  " + logoutBtn + "\n                  </div>\n                )}\n              </div>"
  );
}

fs.writeFileSync('src/components/Sidebar.tsx', code);
