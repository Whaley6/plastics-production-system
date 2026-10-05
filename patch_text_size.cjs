const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("const [textScale, setTextScale] = useLocalStorage<number>('textScale', 5);", "const [textScale, setTextScale] = useLocalStorage<number>('textScale', 1);");
fs.writeFileSync('src/App.tsx', code);
