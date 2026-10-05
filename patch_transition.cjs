const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<main className=\{`flex-1 flex flex-col overflow-hidden bg-canvas \$\{isReadOnly \? 'global-readonly-module' : ''\}`\}>\s*<div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto relative">\s*\{renderPage\(\)\}\s*<\/div>\s*<\/main>/g;

const replacement = `<main className={\`flex-1 flex flex-col overflow-hidden bg-canvas \${isReadOnly ? 'global-readonly-module' : ''}\`}>
 <AnimatePresence mode="wait">
 <motion.div
   key={currentPage}
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   exit={{ opacity: 0, y: -10 }}
   transition={{ duration: 0.15 }}
   className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto relative h-full w-full"
 >
 {renderPage()}
 </motion.div>
 </AnimatePresence>
 </main>`;

code = code.replace(regex, replacement);

if (!code.includes('AnimatePresence mode=')) {
  console.log("Still not replaced!");
}

if (!code.includes('import { AnimatePresence, motion } from \'motion/react\';')) {
  code = code.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { AnimatePresence, motion } from 'motion/react';");
}

fs.writeFileSync('src/App.tsx', code);
