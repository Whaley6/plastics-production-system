const fs = require('fs');
const file = 'src/pages/ProductionOrders.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /startDate:\s*formData\.get\('startDate'\)\s*as\s*string,/g,
  "startDate: editingOrder ? (editingOrder.startDate || new Date().toISOString()) : new Date().toISOString(),"
);

fs.writeFileSync(file, content);
console.log('Patched');
