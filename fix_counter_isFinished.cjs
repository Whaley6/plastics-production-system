const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  code = code.replace(
    /const TimeElapsedCounter = \(\{ dateString, endDateString \}: \{ dateString\?: string, endDateString\?: string \}\) => \{/,
    "const TimeElapsedCounter = ({ dateString, endDateString, isFinished }: { dateString?: string, endDateString?: string, isFinished?: boolean }) => {"
  );

  code = code.replace(
    /    if \(\!endDateString\) \{/g,
    "    if (!endDateString && !isFinished) {"
  );

  code = code.replace(
    /}, \[dateString, endDateString\]\);/g,
    "}, [dateString, endDateString, isFinished]);"
  );

  code = code.replace(
    /<TimeElapsedCounter dateString=\{item \? item\.dateSent : wo\.dateReported\} endDateString=\{item \? item\.dateCompleted : wo\.dateCompleted\} \/>/,
    "<TimeElapsedCounter dateString={item ? item.dateSent : wo.dateReported} endDateString={item ? item.dateCompleted : wo.dateCompleted} isFinished={item ? item.state === 'Completed' : (wo.status === 'Completed' || wo.status === 'Finished')} />"
  );

  code = code.replace(
    /<TimeElapsedCounter dateString=\{item \? item\.dateSent : po\.dateReported\} endDateString=\{item \? item\.dateCompleted : po\.dateCompleted\} \/>/,
    "<TimeElapsedCounter dateString={item ? item.dateSent : po.dateReported} endDateString={item ? item.dateCompleted : po.dateCompleted} isFinished={item ? item.state === 'Completed' : (po.status === 'Completed' || po.status === 'Finished')} />"
  );

  // Update mock data
  code = code.replace(
    /status: 'Completed', reportedBy: 'R\. Davis', assignedTo: 'M\. Johnson', dateReported: '2026-04-24' \}/,
    "status: 'Completed', reportedBy: 'R. Davis', assignedTo: 'M. Johnson', dateReported: '2026-04-24', dateCompleted: '2026-04-25T10:30:00Z' }"
  );

  code = code.replace(
    /state: 'Completed', images: \[\], priority: 'Medium' \}\] \}/,
    "state: 'Completed', images: [], priority: 'Medium', dateCompleted: '2026-04-25T14:20:00Z' }] }"
  );

  fs.writeFileSync(filePath, code);
}

fixFile('src/pages/MaintenanceOrders.tsx');
fixFile('src/pages/AuxiliaryMaintenance.tsx');
