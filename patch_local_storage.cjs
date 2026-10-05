const fs = require('fs');
let code = fs.readFileSync('src/hooks/useLocalStorage.ts', 'utf8');

const target = `export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isMounted = useRef(true);`;

const replacement = `export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  const isMounted = useRef(true);`;

code = code.replace(target, replacement);

const fetchTarget = `        if (res.ok) {
          const data = await res.json();
          if (isMounted.current) {
            setStoredValue(data);
          }
        }`;

const fetchReplacement = `        if (res.ok) {
          const data = await res.json();
          window.localStorage.setItem(key, JSON.stringify(data));
          if (isMounted.current) {
            setStoredValue(data);
          }
        }`;

code = code.replace(fetchTarget, fetchReplacement);

const saveTarget = `        fetch(\`/api/data/\${key}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valueToStore)
        }).then(() => {`;

const saveReplacement = `        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        fetch(\`/api/data/\${key}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(valueToStore)
        }).then(() => {`;

code = code.replace(saveTarget, saveReplacement);

fs.writeFileSync('src/hooks/useLocalStorage.ts', code);
