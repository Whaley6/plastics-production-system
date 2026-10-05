const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  code = code.replace(
    /    let diffMs = \(endDateString \? new Date\(endDateString\)\.getTime\(\) : Date\.now\(\)\) - date\.getTime\(\);/g,
    `    let diffMs = 0;
    if (endDateString) {
      diffMs = new Date(endDateString).getTime() - date.getTime();
    } else if (isFinished) {
      return 'Finished';
    } else {
      diffMs = Date.now() - date.getTime();
    }`
  );

  fs.writeFileSync(filePath, code);
}

fixFile('src/pages/MaintenanceOrders.tsx');
fixFile('src/pages/AuxiliaryMaintenance.tsx');
