const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // text-slate-400 became text-slate-600 dark:text-slate-400
      // which then became text-slate-400 dark:text-slate-600 dark:text-slate-400
      content = content.replace(/text-slate-400 dark:text-slate-600 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
      
      // If there were any hover:text-slate-400 they became hover:text-slate-400 dark:text-slate-600 dark:text-slate-400
      content = content.replace(/hover:text-slate-400 dark:text-slate-600 dark:text-slate-400/g, 'hover:text-slate-600 dark:hover:text-slate-400');
      
      // Let's also fix text-slate-500 became text-slate-500 dark:text-slate-500
      // text-slate-300 became text-slate-700 dark:text-slate-300
      // Then if there was text-slate-700 originally, wait I didn't replace text-slate-700. Yes I did:
      // [/bg-slate-700/g, 'bg-slate-200 dark:bg-slate-700'] could affect text-slate-700? No, regex was /bg-slate-700/.

      // Let's check text-slate-800 ... not replaced.
      
      // Let's fix text-white replaced with text-slate-50 dark:text-white
      // then text-slate-50 became text-slate-900 dark:text-slate-50
      // so it became "text-slate-900 dark:text-slate-50 dark:text-white"
      content = content.replace(/text-slate-900 dark:text-slate-50 dark:text-white/g, 'text-slate-900 dark:text-white');
      
      // Let's check hover properties
      // hover:bg-slate-800 became hover:bg-slate-100 dark:hover:bg-slate-800? 
      // Wait, replacement was /bg-slate-800/g -> 'bg-slate-100 dark:bg-slate-800'
      // So hover:bg-slate-800 became hover:bg-slate-100 dark:bg-slate-800 (missing hover on the dark class!!!!)
      // Ah! I broke hover states. And cursor/focus states!
      
      fs.writeFileSync(fullPath, content);
      
    }
  }
}

processDir(path.join(__dirname, 'src'));
