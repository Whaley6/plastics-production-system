const fs = require('fs');
let code = fs.readFileSync('src/utils/logger.ts', 'utf8');

if (!code.includes('user?: string;')) {
    code = code.replace(
        "type: 'info' | 'warning' | 'error' | 'success';",
        "type: 'info' | 'warning' | 'error' | 'success';\n  user?: string;"
    );
}

if (!code.includes('const authUserStr')) {
    code = code.replace(
        "const newLog: LogEntry = {",
        `const authUserStr = window.localStorage.getItem('auth_user');
    let username = 'System';
    if (authUserStr) {
      try {
        const user = JSON.parse(authUserStr);
        username = user.username || 'System';
      } catch (e) {}
    }
    const newLog: LogEntry = {
      user: username,`
    );
}

fs.writeFileSync('src/utils/logger.ts', code);
console.log('Patched logger');
