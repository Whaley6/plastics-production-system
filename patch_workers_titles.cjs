const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

code = code.replace(/jobTitle: 'Forklift Operator'/g, "jobTitle: 'مشغل'");
code = code.replace(/jobTitle: 'QA Inspector'/g, "jobTitle: 'موظف جودة'");
code = code.replace(/jobTitle: 'Machine Operator'/g, "jobTitle: 'مشغل'");

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
