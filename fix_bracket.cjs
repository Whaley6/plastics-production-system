const fs = require('fs');
const file = 'src/pages/ProductionOrders.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "  }\n  };\n\n  // Filters",
  "  };\n\n  // Filters"
);
fs.writeFileSync(file, content);
console.log('Fixed');
