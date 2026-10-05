const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /<TimeElapsedCounter dateString=\{item \? item\.dateSent : wo\.dateReported\} \/>/,
  "<TimeElapsedCounter dateString={item ? item.dateSent : wo.dateReported} endDateString={item ? item.dateCompleted : wo.dateCompleted} />"
);

code = code.replace(
  /<TimeElapsedCounter dateString=\{item \? item\.dateSent : po\.dateReported\} \/>/,
  "<TimeElapsedCounter dateString={item ? item.dateSent : po.dateReported} endDateString={item ? item.dateCompleted : po.dateCompleted} />"
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
