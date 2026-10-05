const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  " }; return ( <div className=\"flex h-screen w-full bg-canvas text-primary font-sans overflow-hidden transition-colors duration-200\">",
  " }; if (!user) return <Login />; return ( <div className=\"flex h-screen w-full bg-canvas text-primary font-sans overflow-hidden transition-colors duration-200\">"
);
fs.writeFileSync('src/App.tsx', code);
