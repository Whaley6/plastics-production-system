const fs = require('fs');
let content = fs.readFileSync('src/utils/dailyReport.ts', 'utf-8');

content = content.replace(
  /t\.state !== 'Fixed Properly'/g,
  "(t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)')"
);

fs.writeFileSync('src/utils/dailyReport.ts', content);
