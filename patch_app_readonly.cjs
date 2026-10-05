const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'workers');`;

const replacement = `const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'workers');

  // Check if current page is read-only
  const isReadOnly = currentRole?.id !== 'super-admin' && (currentRole?.permissions as any)?.[currentPage + '_readonly'] === true;`;

code = code.replace(target, replacement);

const targetMain = `<main className="flex-1 flex flex-col overflow-hidden bg-canvas">`;
const replacementMain = `<main className={\`flex-1 flex flex-col overflow-hidden bg-canvas \${isReadOnly ? 'global-readonly-module' : ''}\`}>`;

code = code.replace(targetMain, replacementMain);

fs.writeFileSync('src/App.tsx', code);
