const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

const regex = /const loadData = async.*?return defaultValue;\n      };/s;
const replacement = `const loadData = async (key: string, defaultValue: any[] = []) => {
    try {
      let data = await localforage.getItem(key);
      if (data === null) {
        const lsItem = localStorage.getItem(key);
        if (lsItem) {
          try { data = JSON.parse(lsItem); } catch { data = lsItem; }
        }
      }
      return Array.isArray(data) ? data : defaultValue;
    } catch {
      return defaultValue;
    }
  };`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/utils/dailyReport.ts', code);
