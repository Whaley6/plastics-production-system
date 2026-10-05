const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `        hasAccess = (currentRole.permissions as any)[currentPage] !== false;`;
const replacement1 = `        hasAccess = (currentRole.permissions as any)[currentPage] !== false || (currentRole.permissions as any)[currentPage + '_readonly'] === true;`;

code = code.replace(target1, replacement1);

const target2 = `        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'archive'].find(p => (currentRole.permissions as any)[p] !== false);`;
const replacement2 = `        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'archive'].find(p => (currentRole.permissions as any)[p] !== false || (currentRole.permissions as any)[p + '_readonly'] === true);`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
