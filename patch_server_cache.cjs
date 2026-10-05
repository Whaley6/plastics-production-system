const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  app.get("/api/data/:key", (req, res) => {',
  `  app.get("/api/data/:key", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');`
);

fs.writeFileSync(file, content);
console.log('Patched server.ts');
