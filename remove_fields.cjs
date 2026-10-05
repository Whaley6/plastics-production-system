const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

// ProcurementOrder Type
code = code.replace(/  supplier: string;\n/g, '');
code = code.replace(/  expectedDelivery: string;\n/g, '');

// Initial Procurement Orders
code = code.replace(/, supplier: 'Industrial Motors Co', status: 'Active', expectedDelivery: '2026-04-29'/g, ", status: 'Active'");
code = code.replace(/, supplier: 'Seals Direct', status: 'Finished', expectedDelivery: '2026-04-25'/g, ", status: 'Finished'");
code = code.replace(/, supplier: 'Precision Bearings LLC', status: 'Active', expectedDelivery: '2026-05-02'/g, ", status: 'Active'");

// ProcurementOrderEditor State
code = code.replace(/  const \[supplier, setSupplier\].*\n/g, '');
code = code.replace(/  const \[expectedDelivery, setExpectedDelivery\].*\n/g, '');

// ProcurementOrderEditor Save object
code = code.replace(/      supplier,\n/g, '');
code = code.replace(/      expectedDelivery,\n/g, '');

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
console.log("Basic fields removed");
