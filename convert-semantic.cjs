const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds
  [/bg-slate-900/g, 'bg-canvas'],
  [/bg-slate-800/g, 'bg-surface'],
  [/bg-slate-700/g, 'bg-surface-elevated'],
  [/bg-slate-600/g, 'bg-surface-strong'],
  [/bg-slate-500/g, 'bg-surface-stronger'],
  
  // Text
  [/text-slate-50\b/g, 'text-primary'],
  [/text-slate-100\b/g, 'text-primary-muted'],
  [/text-slate-200\b/g, 'text-secondary'],
  [/text-slate-300\b/g, 'text-muted'],
  [/text-slate-400\b/g, 'text-tertiary'],
  [/text-slate-500\b/g, 'text-quaternary'],
  [/text-slate-600\b/g, 'text-quinary'],
  [/text-white/g, 'text-white-fixed'],
  
  // Borders
  [/border-white\/10/g, 'border-divider'],
  [/border-white\/5/g, 'border-divider-subtle'],
  [/border-white\/20/g, 'border-divider-strong'],
  [/border-slate-700/g, 'border-surface-elevated'],
  [/border-slate-600/g, 'border-surface-strong'],
  [/border-slate-800/g, 'border-surface'],
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
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
