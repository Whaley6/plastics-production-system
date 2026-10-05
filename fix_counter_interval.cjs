const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /    updateTimer\(\);\n    const interval = setInterval\(updateTimer, 1000\);\n    return \(\) => clearInterval\(interval\);/g,
  `    updateTimer();
    if (!endDateString) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    return () => {};`
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
