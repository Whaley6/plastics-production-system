const fs = require('fs');
let code = fs.readFileSync('src/hooks/useLocalStorage.ts', 'utf8');

const targetUseEffect = `  // Initial load
  useEffect(() => {
    isMounted.current = true;
    
    const fetchFromServer = async () => {
      try {
        const res = await fetch(\`/api/data/\${key}\`);
        if (res.ok) {
          const data = await res.json();
          window.localStorage.setItem(key, JSON.stringify(data));
          if (isMounted.current) {
            setStoredValue(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch from server', err);
      }
    };`;

const replacementUseEffect = `  const pendingSaves = useRef(0);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    
    const fetchFromServer = async () => {
      if (pendingSaves.current > 0) return;
      try {
        const res = await fetch(\`/api/data/\${key}\`);
        if (res.ok) {
          const data = await res.json();
          if (pendingSaves.current > 0) return;
          
          const newString = JSON.stringify(data);
          const currentString = window.localStorage.getItem(key);
          
          if (newString !== currentString) {
            window.localStorage.setItem(key, newString);
            if (isMounted.current) {
              setStoredValue(data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch from server', err);
      }
    };`;

let targetSetValue = `  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        
        // Save to server
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        fetch(\`/api/data/\${key}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valueToStore)
        }).then(() => {
          if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: [key] }));
          }
        }).catch(err => console.error("Failed to save to server", err));
        
        return valueToStore;
      });
    } catch (error: any) {
      console.log(error);
    }
  }, [key]);`;

let replacementSetValue = `  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        
        // Save to server
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        pendingSaves.current++;
        fetch(\`/api/data/\${key}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valueToStore)
        }).then(() => {
          pendingSaves.current--;
          if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: [key] }));
          }
        }).catch(err => {
          pendingSaves.current--;
          console.error("Failed to save to server", err);
        });
        
        return valueToStore;
      });
    } catch (error: any) {
      console.log(error);
    }
  }, [key]);`;

code = code.replace(targetUseEffect, replacementUseEffect);
code = code.replace(targetSetValue, replacementSetValue);

fs.writeFileSync('src/hooks/useLocalStorage.ts', code);
