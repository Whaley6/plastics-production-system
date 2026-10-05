const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Strip all "dark:..." classes
  content = content.replace(/\bdark:[a-zA-Z0-9\-\/]+\b/g, '');

  content = content.split('\n').map(line => {
    // Replace multiple spaces with a single space to clean up left-overs from dark: removal
    line = line.replace(/ +/g, ' ');

    // Normalize bad bg/text chains that got expanded.
    // E.g. "bg-slate-50/50 bg-slate-50 bg-slate-50/50 bg-canvas/50" -> "bg-canvas/50"
    let newStr = line.replace(/bg-slate-[0-9]+(?:-[a-z0-9]+)?(?:\/[0-9]+)?( bg-slate-[0-9]+(?:\/[0-9]+)?)*( bg-canvas| bg-surface(?:-elevated|-strong)?(?:\/[0-9]+)?)/g, '$2');
    newStr = newStr.replace(/bg-slate-[0-9]+(?:\/[0-9]+)? /g, '');
    
    return newStr;
  }).join('\n');
  
  // Actually, wait, replacing like that is error prone.
  fs.writeFileSync(filePath, content);
}
// Let's hold off on this execution.
