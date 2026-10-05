const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(
  /\.global-readonly-module button:not\(\[class\*="border-b-2"\]\):not\(\[class\*="lucide-x"\]\)/g,
  '.global-readonly-module button:not([class*="border-b-2"]):not(:has(svg.lucide-x)):not(:has(svg.lucide-search))'
);

fs.writeFileSync('src/index.css', code);
