const fs = require('fs');
const path = require('path');

const replacements = [
  [/bg-slate-50\/50 dark:bg-slate-900\/50/g, 'bg-slate-900/50'],
  [/bg-slate-50\/80 dark:bg-slate-900\/80/g, 'bg-slate-900/80'],
  [/bg-slate-50\/60 dark:bg-slate-900\/60/g, 'bg-slate-900/60'],
  [/bg-slate-50\/90 dark:bg-slate-900\/90/g, 'bg-slate-900/90'],
  [/bg-slate-50 dark:bg-slate-900/g, 'bg-slate-900'],
  
  [/bg-slate-100\/20 dark:bg-slate-800\/20/g, 'bg-slate-800/20'],
  [/bg-slate-100\/30 dark:bg-slate-800\/30/g, 'bg-slate-800/30'],
  [/bg-slate-100\/40 dark:bg-slate-800\/40/g, 'bg-slate-800/40'],
  [/bg-slate-100\/50 dark:bg-slate-800\/50/g, 'bg-slate-800/50'],
  [/bg-slate-100 dark:bg-slate-800/g, 'bg-slate-800'],
  
  [/bg-slate-200\/50 dark:bg-slate-700\/50/g, 'bg-slate-700/50'],
  [/bg-slate-200 dark:bg-slate-700/g, 'bg-slate-700'],

  [/text-slate-400 dark:text-slate-600 dark:text-slate-400/g, 'text-slate-400'], 

  [/text-slate-500 dark:text-slate-500/g, 'text-slate-500'],
  
  [/text-slate-900 dark:text-slate-50/g, 'text-slate-50'],
  [/text-slate-800 dark:text-slate-200/g, 'text-slate-200'],
  [/text-slate-700 dark:text-slate-300/g, 'text-slate-300'],
  [/text-slate-600 dark:text-slate-400/g, 'text-slate-600'],

  [/border-slate-300\/50 dark:border-slate-700\/50/g, 'border-slate-700/50'],
  [/border-slate-300 dark:border-slate-700/g, 'border-slate-700'],
  
  [/border-slate-200 dark:border-white\/10/g, 'border-white/10'],
  [/border-slate-200 dark:border-white\/5/g, 'border-white/5'],
  [/border-slate-200 dark:border-white\/20/g, 'border-white/20'],
  
  [/text-slate-500\/40 dark:text-white\/40/g, 'text-white/40'],
  [/text-slate-50 dark:text-white/g, 'text-white'],
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content;
      replacements.forEach(([regex, replacement]) => {
        newContent = newContent.replace(regex, replacement);
      });
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Reverted ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
