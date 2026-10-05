const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

code = code.replace(
  "    ws.getRow(1).font = { bold: true };\n    // Generate and download",
  "    ws.getRow(1).font = { bold: true };\n  }\n\n  // Generate and download"
);

if (!code.endsWith("}")) {
  code += "\n}\n";
}

fs.writeFileSync('src/utils/dailyReport.ts', code);
