const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
code = code.replace(
  "defaultRoles.find((r: Role) => r.id === 'employee')",
  "defaultRoles.find((r: Role) => r.id === 'worker')"
);
fs.writeFileSync('src/components/Sidebar.tsx', code);
