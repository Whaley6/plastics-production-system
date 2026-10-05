const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /const TimeElapsedCounter = \(\{ dateString \}: \{ dateString\?: string \}\) => \{/,
  "const TimeElapsedCounter = ({ dateString, endDateString }: { dateString?: string, endDateString?: string }) => {"
);

code = code.replace(
  /const updateTimer = \(\) => \{[\s\S]*?setElapsed\(\`\$\{days\}d \$\{hours\}h \$\{minutes\}m \$\{seconds\}s\`\);/,
  `const updateTimer = () => {
      let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();
      if (diffMs < 0) diffMs = 0;
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = String(Math.floor((totalSeconds % (3600 * 24)) / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setElapsed(\`\${days > 0 ? \`\${days}d \` : ''}\${hours}h \${minutes}m \${seconds}s\`);`
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
