const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

// The original file is a mess. I'll just write the entire getTimeElapsed function properly.
const regex = /function getTimeElapsed.*?export async function generateDailyReport\(\) \{/s;
const replacement = `function getTimeElapsed(dateString?: string) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    let diffMs = Date.now() - date.getTime();
    if (diffMs < 0) diffMs = 0;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);
    let parts = [];
    if (days > 0) {
      parts.push(\`\${days}d\`);
    }
    parts.push(\`\${String(hours).padStart(2, '0')}h\`);
    parts.push(\`\${String(minutes).padStart(2, '0')}m\`);
    return parts.join(' ');
  } catch {
    return '-';
  }
}

export async function generateDailyReport() {`;

code = code.replace(regex, replacement);

// And we still have stray "}" or "catch" in the file from my previous sed attempt. Let's clean them.
// Let's just fix the end of the file.
const endRegex = /  \} catch \(err\) \{[\s\S]*$/;
code = code.replace(endRegex, '');
fs.writeFileSync('src/utils/dailyReport.ts', code);
