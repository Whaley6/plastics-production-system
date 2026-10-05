const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let found = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  const regex = /<button\b([^>]*)>/g;
  while ((match = regex.exec(content)) !== null) {
    if (!match[1].includes('type=')) {
      console.log(`Missing type in ${file}: ${match[0]}`);
      found = true;
    }
  }
});
if (!found) console.log("All buttons have a type attribute!");
