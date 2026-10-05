const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');
code = code.replace(/export async function generateDailyReport\(\) \{\n  try \{/g, 'export async function generateDailyReport() {');
code = code.replace(/  } catch \(err\) \{\n    console.error\("Daily report error:", err\);\n    alert\("Error generating report: " \+ err.message\);\n  \}\n\}/g, '');
fs.writeFileSync('src/utils/dailyReport.ts', code);
