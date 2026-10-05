const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  code = code.replace(
    /const getTimeElapsed = \(dateString\?: string, endDateString\?: string\) => \{/,
    "const getTimeElapsed = (dateString?: string, endDateString?: string, isFinished?: boolean) => {"
  );

  code = code.replace(
    /let diffMs = \(endDateString \? new Date\(endDateString\)\.getTime\(\) : Date\.now\(\)\) - date\.getTime\(\);/,
    "let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();"
  );
  
  code = code.replace(
    /timeElapsed: getTimeElapsed\(item \? item\.dateSent : wo\.dateReported, item \? item\.dateCompleted : wo\.dateCompleted\),/,
    "timeElapsed: getTimeElapsed(item ? item.dateSent : wo.dateReported, item ? item.dateCompleted : wo.dateCompleted, item ? item.state === 'Completed' : (wo.status === 'Completed' || wo.status === 'Finished')),"
  );
  
  code = code.replace(
    /timeElapsed: getTimeElapsed\(item \? item\.dateSent : po\.dateReported, item \? item\.dateCompleted : po\.dateCompleted\),/,
    "timeElapsed: getTimeElapsed(item ? item.dateSent : po.dateReported, item ? item.dateCompleted : po.dateCompleted, item ? item.state === 'Completed' : (po.status === 'Completed' || po.status === 'Finished')),"
  );

  fs.writeFileSync(filePath, code);
}

fixFile('src/pages/MaintenanceOrders.tsx');
fixFile('src/pages/AuxiliaryMaintenance.tsx');
