const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  "   } }; return ( <div",
  "   } }; if (!user) return <Login />; return ( <div"
);
fs.writeFileSync('src/App.tsx', code);
