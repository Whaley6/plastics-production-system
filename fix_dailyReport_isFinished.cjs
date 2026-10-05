const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

code = code.replace(
  /function getTimeElapsed\(dateString\?: string, endDateString\?: string\) \{/,
  "function getTimeElapsed(dateString?: string, endDateString?: string, isFinished?: boolean) {"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(mo\.dateReported, mo\.dateCompleted\)/,
  "timeElapsed: getTimeElapsed(mo.dateReported, mo.dateCompleted, mo.status === 'Completed' || mo.status === 'Finished' || mo.status === 'Resolved')"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(po\.dateReported \|\| po\.dateRequested, po\.dateCompleted\)/,
  "timeElapsed: getTimeElapsed(po.dateReported || po.dateRequested, po.dateCompleted, po.status === 'Completed' || po.status === 'Finished' || po.status === 'Delivered')"
);

fs.writeFileSync('src/utils/dailyReport.ts', code);
