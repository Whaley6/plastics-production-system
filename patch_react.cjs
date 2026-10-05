const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("import React")) {
    code = code.replace("import { useState", "import React, { useState");
    fs.writeFileSync(file, code);
  }
}

fix('src/pages/Account.tsx');
fix('src/pages/Login.tsx');
