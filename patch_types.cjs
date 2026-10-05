const fs = require('fs');
let code = fs.readFileSync('vite-env.d.ts', 'utf8');

if (!code.includes('__APP_VERSION__')) {
  code += '\n\ndeclare const __APP_VERSION__: string;\n';
  fs.writeFileSync('vite-env.d.ts', code);
}
