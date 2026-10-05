const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    if (isDarkMode) {`;

const replacement = `  useEffect(() => {
    if (!isReadOnly) return;
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' && target.getAttribute('type') !== 'search' && !target.getAttribute('placeholder')?.toLowerCase().includes('search') && !target.getAttribute('placeholder')?.includes('بحث')) ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        (target.tagName === 'BUTTON' && !target.className.includes('border-b-2') && !target.className.includes('allow-readonly') && !target.querySelector('.lucide-x') && !target.querySelector('.lucide-search'))
      ) {
        target.blur();
      }
    };

    const handleSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [isReadOnly]);

  useEffect(() => {
    if (isDarkMode) {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
