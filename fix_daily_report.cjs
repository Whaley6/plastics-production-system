const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

code = code.replace(
  /function getTimeElapsed\(dateString\?: string\) \{/,
  "function getTimeElapsed(dateString?: string, endDateString?: string) {"
);

code = code.replace(
  /let diffMs = Date\.now\(\) - date\.getTime\(\);/,
  "let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(mo\.dateReported\)/,
  "timeElapsed: getTimeElapsed(mo.dateReported, mo.dateCompleted)"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(po\.dateReported \|\| po\.dateRequested\)/,
  "timeElapsed: getTimeElapsed(po.dateReported || po.dateRequested, po.dateCompleted)"
);

fs.writeFileSync('src/utils/dailyReport.ts', code);
