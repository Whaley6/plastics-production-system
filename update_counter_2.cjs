const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

code = code.replace(
  /    const updateTimer = \(\) => \{[\s\S]*?parts\.join\(' '\)\);[\s\S]*?    \};/g,
  `    const updateTimer = () => {
      let diffMs = (endDateString ? new Date(endDateString).getTime() : Date.now()) - date.getTime();
      if (diffMs < 0) diffMs = 0;
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const seconds = totalSeconds % 60;
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
      parts.push(\`\${String(seconds).padStart(2, '0')}s\`);
      setElapsed(parts.join(' '));
    };`
);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
