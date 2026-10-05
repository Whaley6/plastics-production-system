const fs = require('fs');
const file = 'src/pages/ProductionOrders.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "startDate: formData.get('startDate') as string,",
  "startDate: editingOrder ? (editingOrder.startDate || new Date().toISOString()) : new Date().toISOString(),"
);

content = content.replace(
  "startDate: formData.get('startDate') as string,",
  "startDate: new Date().toISOString(),"
);

// We need to find the correct occurrences and replace them safely.
