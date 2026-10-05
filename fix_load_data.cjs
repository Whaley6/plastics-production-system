const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

const regex = /  const loadData = async \(key: string, defaultValue: any\[\] = \[\]\) => \{[\s\S]*?  \};/;
const replacement = `  const loadData = async (key: string, defaultValue: any[] = []) => {
    try {
      const res = await fetch("/api/data/" + key);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('Failed to load from server', e);
    }
    try {
      const lsItem = localStorage.getItem(key);
      if (lsItem) {
        const data = JSON.parse(lsItem);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('Failed to parse localStorage', e);
    }
    try {
      let data = await localforage.getItem(key);
      if (Array.isArray(data)) return data;
    } catch (e) {}
    return defaultValue;
  };`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/utils/dailyReport.ts', code);
