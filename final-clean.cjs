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

      // specific fixes:
      let newContent = content
        .replace(/bg-slate-[0-9]+(?:\/[0-9]+)? dark:(bg-slate-[0-9]+(?:\/[0-9]+)? dark:)*bg-canvas(?:\/\d+)?/g, (match) => {
          let suffix = match.match(/\/\d+/g);
          return 'bg-canvas' + (suffix ? suffix[suffix.length-1] : '');
        })
        .replace(/bg-slate-[a-z0-9\/]+ dark:(bg-slate-[a-z0-9\/]+ dark:)*bg-surface(-[a-z]+)?(?:\/\d+)?/g, (match) => {
          // match example: bg-slate-100/20 dark:bg-slate-100 dark:bg-slate-100/20 dark:bg-surface/20
          // desired: bg-surface/20
          let pieces = match.split(' ');
          let last = pieces[pieces.length-1];
          return last.replace('dark:', '');
        })
        .replace(/text-tertiary dark:text-tertiary dark:text-quinary/g, 'text-quinary')
        .replace(/text-quaternary dark:text-quaternary(.*?)dark:text-white-fixed/g, 'text-white-fixed')
        .replace(/text-slate-[0-9]+(?:\/[0-9]+)? dark:(text-slate-[0-9]+(?:\/[0-9]+)? dark:)*text-(primary|secondary|muted|tertiary|quaternary|quinary|white-fixed)(?:\/\d+)?/g, (match) => {
          let pieces = match.split(' ');
          let last = pieces[pieces.length-1];
          return last.replace('dark:', '');
        })
        .replace(/border-slate-[0-9]+(?:\/[0-9]+)? dark:(border-[0-9a-z\/]+ dark:)*border-(divider(-[a-z]+)?|surface(-[a-z]+)?)(?:\/\d+)?/g, (match) => {
          let pieces = match.split(' ');
          let last = pieces[pieces.length-1];
          return last.replace('dark:', '');
        })
        .replace(/hover:bg-slate-[a-z0-9\/]+ dark:(hover:bg-[a-z0-9\/]+ dark:)*hover:bg-surface(-[a-z]+)?/g, (match) => {
          let pieces = match.split(' ');
          let last = pieces[pieces.length-1];
          return last.replace('dark:', '');
        })
        .replace(/text-[a-z]+ dark:text-[a-z]+/g, (match) => {
          if (match.includes('dark:text-quaternary')) return 'text-quaternary';
          return match;
        })
        // Remove ALL remaining dark: prefixes (since we use CSS variables globally now)
        .replace(/\s+dark:[a-zA-Z0-9\-\/]+\b/g, '');

      // Also clean multiple spaces
      newContent = newContent.replace(/  +/g, ' ');

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Cleaned ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
