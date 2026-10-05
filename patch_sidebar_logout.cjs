const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
code = code.replace("logout(); window.location.reload();", "logout();");
fs.writeFileSync('src/components/Sidebar.tsx', code);
