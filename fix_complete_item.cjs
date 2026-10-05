const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /const newItems = wo\.items\.map\(it => it\.id === itemId \? \{ \.\.\.it, state: 'Completed' \} : it\);/g,
  "const newItems = wo.items.map(it => it.id === itemId ? { ...it, state: 'Completed', dateCompleted: new Date().toISOString() } : it);"
);

code = code.replace(
  /status: allCompleted \? 'Completed' : wo\.status/g,
  "status: allCompleted ? 'Completed' : wo.status,\n          dateCompleted: allCompleted ? (wo.dateCompleted || new Date().toISOString()) : wo.dateCompleted"
);

code = code.replace(
  /const newItems = po\.items\.map\(it => it\.id === itemId \? \{ \.\.\.it, state: 'Completed' \} : it\);/g,
  "const newItems = po.items.map(it => it.id === itemId ? { ...it, state: 'Completed', dateCompleted: new Date().toISOString() } : it);"
);

code = code.replace(
  /status: allCompleted \? 'Finished' : po\.status/g,
  "status: allCompleted ? 'Finished' : po.status,\n          dateCompleted: allCompleted ? (po.dateCompleted || new Date().toISOString()) : po.dateCompleted"
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
