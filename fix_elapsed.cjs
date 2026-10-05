const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /const getTimeElapsed = \(dateString\?: string\) => \{/,
  "const getTimeElapsed = (dateString?: string, endDateString?: string) => {"
);

code = code.replace(
  /let diffMs = Date\.now\(\) - date\.getTime\(\);/,
  "let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();"
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
