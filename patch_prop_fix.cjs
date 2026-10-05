const fs = require('fs');
let code = fs.readFileSync('src/components/WorkerScheduleAndKPI.tsx', 'utf8');

const target1 = "export function WorkerScheduleAndKPI({ workers }: { workers: any[] }) {";
const replacement1 = "export function WorkerScheduleAndKPI({ workers, isReadOnly }: { workers: any[], isReadOnly?: boolean }) {";
code = code.replace(target1, replacement1);

fs.writeFileSync('src/components/WorkerScheduleAndKPI.tsx', code);
