const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');
code = code.replace(/jobTitle: 'Packager'/g, "jobTitle: 'عامل تعبئة و تغليف'");
fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
