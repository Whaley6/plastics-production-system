const fs = require('fs');
let code = fs.readFileSync('src/pages/Roles.tsx', 'utf8');

code = code.replace("{\n    {\n    id: 'worker',", "{\n    id: 'worker',");
fs.writeFileSync('src/pages/Roles.tsx', code);
