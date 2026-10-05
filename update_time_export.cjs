const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /timeElapsed: getTimeElapsed\(item \? item\.dateSent : wo\.dateReported\),/,
  "timeElapsed: getTimeElapsed(item ? item.dateSent : wo.dateReported, item ? item.dateCompleted : wo.dateCompleted),"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(item \? item\.dateSent : po\.dateReported\),/,
  "timeElapsed: getTimeElapsed(item ? item.dateSent : po.dateReported, item ? item.dateCompleted : po.dateCompleted),"
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
