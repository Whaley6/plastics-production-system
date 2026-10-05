const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

code = code.replace(
  "const [setupMoldName, setSetupMoldName] = useState('');",
  "const [setupMoldName, setSetupMoldName] = useState('');\n  const [setupMolds, setSetupMolds] = useState<string[]>(['']);"
);

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
