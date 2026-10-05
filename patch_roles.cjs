const fs = require('fs');
let code = fs.readFileSync('src/pages/Roles.tsx', 'utf8');
code = code.replace("const defaultRoles: Role[] = [", "export const defaultRoles: Role[] = [");
fs.writeFileSync('src/pages/Roles.tsx', code);
