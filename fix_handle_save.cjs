const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /const handleSaveMO = \(doc: WorkOrder\) => \{/g,
  `const handleSaveMO = (doc: WorkOrder) => {
    if ((doc.status === 'Completed' || doc.status === 'Finished') && !doc.dateCompleted) {
      doc.dateCompleted = new Date().toISOString();
    } else if (doc.status !== 'Completed' && doc.status !== 'Finished') {
      doc.dateCompleted = undefined;
    }`
);

code = code.replace(
  /const handleSavePO = \(updatedPO: any\) => \{/g,
  `const handleSavePO = (updatedPO: any) => {
    if ((updatedPO.status === 'Completed' || updatedPO.status === 'Finished') && !updatedPO.dateCompleted) {
      updatedPO.dateCompleted = new Date().toISOString();
    } else if (updatedPO.status !== 'Completed' && updatedPO.status !== 'Finished') {
      updatedPO.dateCompleted = undefined;
    }`
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
