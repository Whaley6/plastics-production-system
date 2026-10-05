const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /type WorkOrder = \{/,
  "type WorkOrder = {\n  dateCompleted?: string;"
);

code = code.replace(
  /type ProcurementOrder = \{/,
  "type ProcurementOrder = {\n  dateCompleted?: string;"
);

code = code.replace(
  /type WorkOrderItem = \{/,
  "type WorkOrderItem = {\n  dateCompleted?: string;"
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
