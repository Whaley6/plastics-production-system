const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');
content = content.replace(/replaceSpareParts: wo\./g, '');
content = content.replace(/typeField: wo\./g, '');
content = content.replace(/hours: wo\./g, '');
content = content.replace(/extraOil: wo\./g, '');
fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
