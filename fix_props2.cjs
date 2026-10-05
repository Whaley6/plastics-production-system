const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');
content = content.replace(/wo\.actionBy \|\| /g, '');
content = content.replace(/wo\.actionBy/g, "''");
fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
