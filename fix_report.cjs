const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

// Fix missing } for if (days > 0)
code = code.replace(
  "      parts.push(`${days}d`);\n        parts.push(`${String(hours).padStart(2, '0')}h`);",
  "      parts.push(`${days}d`);\n    }\n    parts.push(`${String(hours).padStart(2, '0')}h`);"
);

// We still have to close the function getTimeElapsed.
code = code.replace(
  "  export async function generateDailyReport() {",
  "}\n\nexport async function generateDailyReport() {"
);

fs.writeFileSync('src/utils/dailyReport.ts', code);
