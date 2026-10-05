const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const target = `  ].filter(item => (currentRole.permissions as any)[item.id] !== false);`;
const replacement = `  ].filter(item => (currentRole.permissions as any)[item.id] !== false || (currentRole.permissions as any)[item.id + '_readonly'] === true);`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/Sidebar.tsx', code);
