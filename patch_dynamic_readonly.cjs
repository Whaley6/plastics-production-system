const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    if (user && currentRole && currentPage !== 'account') {`;

const replacement = `  useEffect(() => {
    if (isReadOnly) {
      const observer = new MutationObserver(() => {
        document.querySelectorAll('.global-readonly-module button:not(.allow-readonly)').forEach(btn => {
          if (
            btn.querySelector('.lucide-x') || 
            btn.querySelector('.lucide-search') || 
            btn.textContent?.includes('Cancel') || 
            btn.textContent?.includes('Export') ||
            btn.className.includes('border-b-2') ||
            btn.textContent?.includes('Close')
          ) {
            btn.classList.add('allow-readonly');
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (user && currentRole && currentPage !== 'account') {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
