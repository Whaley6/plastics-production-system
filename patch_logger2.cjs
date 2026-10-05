const fs = require('fs');
let code = fs.readFileSync('src/utils/logger.ts', 'utf8');

const saveTarget = `    // Save to server
    await fetch(\`/api/data/\${LOGS_KEY}\`, {`;

const saveReplacement = `    window.localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    // Save to server
    await fetch(\`/api/data/\${LOGS_KEY}\`, {`;

if (code.includes(saveTarget)) {
  code = code.replace(saveTarget, saveReplacement);
  fs.writeFileSync('src/utils/logger.ts', code);
}
