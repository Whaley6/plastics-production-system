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
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // A regex that matches the opening <button tag, and replaces it with <button type="button" 
  // only if type="..." is not already present anywhere inside the opening tag.
  content = content.replace(/<button\b([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('type=')) return match;
    return `<button type="button"${attrs}>`;
  });
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    changed++;
  }
});
console.log(`Updated ${changed} files.`);
