const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

const target = `<WorkerScheduleAndKPI workers={workers} />`;
const replacement = `<WorkerScheduleAndKPI workers={workers} isReadOnly={isReadOnly} />`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
  console.log("Success passing prop");
} else {
  console.log("Failed to find prop target");
}
