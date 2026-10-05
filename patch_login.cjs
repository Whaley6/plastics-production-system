const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');
code = code.replace("window.location.reload(); // Reload to start app properly", "");
fs.writeFileSync('src/pages/Login.tsx', code);
