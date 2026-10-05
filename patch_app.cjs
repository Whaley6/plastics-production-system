const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { useLocalStorage } from './hooks/useLocalStorage';",
  "import { useLocalStorage } from './hooks/useLocalStorage';\nimport { useClientStorage } from './hooks/useClientStorage';"
);

code = code.replace(
  "const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'workers');",
  "const [currentPage, setCurrentPage] = useClientStorage<Page>('currentPage', 'workers');"
);

code = code.replace(
  "const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('isDarkMode', true);",
  "const [isDarkMode, setIsDarkMode] = useClientStorage<boolean>('isDarkMode', true);"
);

code = code.replace(
  "const [textScale, setTextScale] = useLocalStorage<number>('textScale', 1);",
  "const [textScale, setTextScale] = useClientStorage<number>('textScale', 1);"
);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
