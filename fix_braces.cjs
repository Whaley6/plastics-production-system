const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

code = code.replace(
  "    }\n  }\n  };\n\n  // Filters",
  "    }\n  };\n\n  // Filters"
);

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
