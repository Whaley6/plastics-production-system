const fs = require('fs');
let code = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf8');

code = code.replace(
  /const getTimeElapsed = \(dateString\?: string\) => \{/,
  "const getTimeElapsed = (dateString?: string, endDateString?: string) => {"
);

code = code.replace(
  /let diffMs = Date\.now\(\) - date\.getTime\(\);/,
  "let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();"
);

code = code.replace(
  /type WorkOrder = \{/,
  "type WorkOrder = {\n  dateCompleted?: string;"
);

code = code.replace(
  /type ProcurementOrder = \{/,
  "type ProcurementOrder = {\n  dateCompleted?: string;"
);

code = code.replace(
  /type WorkOrderItem = \{/,
  "type WorkOrderItem = {\n  dateCompleted?: string;"
);

code = code.replace(
  /const TimeElapsedCounter = \(\{ dateString \}: \{ dateString\?: string \}\) => \{/,
  "const TimeElapsedCounter = ({ dateString, endDateString }: { dateString?: string, endDateString?: string }) => {"
);

code = code.replace(
  /    const updateTimer = \(\) => \{[\s\S]*?parts\.join\(' '\)\);[\s\S]*?    \};/g,
  `    const updateTimer = () => {
      let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();
      if (diffMs < 0) diffMs = 0;
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const seconds = totalSeconds % 60;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const minutes = totalMinutes % 60;
      const totalHours = Math.floor(totalMinutes / 60);
      const hours = totalHours % 24;
      const days = Math.floor(totalHours / 24);

      let parts = [];
      if (days > 0) {
        parts.push(\`\${days}d\`);
      }
      parts.push(\`\${String(hours).padStart(2, '0')}h\`);
      parts.push(\`\${String(minutes).padStart(2, '0')}m\`);
      parts.push(\`\${String(seconds).padStart(2, '0')}s\`);
      setElapsed(parts.join(' '));
    };`
);

code = code.replace(
  /    updateTimer\(\);\n    const interval = setInterval\(updateTimer, 1000\);\n    return \(\) => clearInterval\(interval\);/g,
  `    updateTimer();
    if (!endDateString) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    return () => {};`
);

code = code.replace(
  /<TimeElapsedCounter dateString=\{item \? item\.dateSent : wo\.dateReported\} \/>/,
  "<TimeElapsedCounter dateString={item ? item.dateSent : wo.dateReported} endDateString={item ? item.dateCompleted : wo.dateCompleted} />"
);

code = code.replace(
  /<TimeElapsedCounter dateString=\{item \? item\.dateSent : po\.dateReported\} \/>/,
  "<TimeElapsedCounter dateString={item ? item.dateSent : po.dateReported} endDateString={item ? item.dateCompleted : po.dateCompleted} />"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(item \? item\.dateSent : wo\.dateReported\),/,
  "timeElapsed: getTimeElapsed(item ? item.dateSent : wo.dateReported, item ? item.dateCompleted : wo.dateCompleted),"
);

code = code.replace(
  /timeElapsed: getTimeElapsed\(item \? item\.dateSent : po\.dateReported\),/,
  "timeElapsed: getTimeElapsed(item ? item.dateSent : po.dateReported, item ? item.dateCompleted : po.dateCompleted),"
);

code = code.replace(
  /const newItems = wo\.items\.map\(it => it\.id === itemId \? \{ \.\.\.it, state: 'Completed' \} : it\);/g,
  "const newItems = wo.items.map(it => it.id === itemId ? { ...it, state: 'Completed', dateCompleted: new Date().toISOString() } : it);"
);

code = code.replace(
  /status: allCompleted \? 'Completed' : wo\.status/g,
  "status: allCompleted ? 'Completed' : wo.status,\n          dateCompleted: allCompleted ? (wo.dateCompleted || new Date().toISOString()) : wo.dateCompleted"
);

code = code.replace(
  /const newItems = po\.items\.map\(it => it\.id === itemId \? \{ \.\.\.it, state: 'Completed' \} : it\);/g,
  "const newItems = po.items.map(it => it.id === itemId ? { ...it, state: 'Completed', dateCompleted: new Date().toISOString() } : it);"
);

code = code.replace(
  /status: allCompleted \? 'Finished' : po\.status/g,
  "status: allCompleted ? 'Finished' : po.status,\n          dateCompleted: allCompleted ? (po.dateCompleted || new Date().toISOString()) : po.dateCompleted"
);

code = code.replace(
  /const handleSaveMO = \(doc: WorkOrder\) => \{/g,
  `const handleSaveMO = (doc: WorkOrder) => {
    if ((doc.status === 'Completed' || doc.status === 'Finished') && !doc.dateCompleted) {
      doc.dateCompleted = new Date().toISOString();
    } else if (doc.status !== 'Completed' && doc.status !== 'Finished') {
      doc.dateCompleted = undefined;
    }`
);

code = code.replace(
  /const handleSavePO = \(updatedPO: any\) => \{/g,
  `const handleSavePO = (updatedPO: any) => {
    if ((updatedPO.status === 'Completed' || updatedPO.status === 'Finished') && !updatedPO.dateCompleted) {
      updatedPO.dateCompleted = new Date().toISOString();
    } else if (updatedPO.status !== 'Completed' && updatedPO.status !== 'Finished') {
      updatedPO.dateCompleted = undefined;
    }`
);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', code);
