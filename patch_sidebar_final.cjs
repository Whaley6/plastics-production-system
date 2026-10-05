const fs = require('fs');

const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// We will make sure there are absolutely no <a> tags, and every button has type="button"
// I will also fix the onBlur issue by using an onBlur that checks relatedTarget, or simply a useEffect hook if it's easier, but relatedTarget is easiest.

content = content.replace(
  'onBlur={() => setTimeout(() => setIsSettingsOpen(false), 200)}',
  'onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setIsSettingsOpen(false), 200); }}'
);

// Ensuring all buttons are <button type="button"
content = content.replace(/<button(?!\s+type=")/g, '<button type="button"');

fs.writeFileSync(file, content);
console.log('Patched Sidebar.tsx');
