const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

code = code.replace(
  /    ws\.getRow\(1\)\.font = \{ bold: true \};\n.*?const buffer/s,
  "    ws.getRow(1).font = { bold: true };\n  }\n\n  // Generate and download\n  const buffer"
);

fs.writeFileSync('src/utils/dailyReport.ts', code);
