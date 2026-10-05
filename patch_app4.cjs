const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /return \(\s*<div className="flex h-screen w-full bg-canvas/g,
  "if (!user) return <Login />;\n\n return ( <div className=\"flex h-screen w-full bg-canvas"
);
fs.writeFileSync('src/App.tsx', code);
