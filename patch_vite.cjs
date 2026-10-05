const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

if (!code.includes('__APP_VERSION__')) {
  code = code.replace(
    /define:\s*\{/,
    "define: {\n      '__APP_VERSION__': JSON.stringify(new Date().toLocaleString()),"
  );
  fs.writeFileSync('vite.config.ts', code);
}
