const fs = require('fs');
let code = fs.readFileSync('src/pages/Account.tsx', 'utf8');
const target = `  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };`;
const replacement = `  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsersList(data);
      } else {
        console.error("Failed to fetch users:", data);
        setUsersList([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsersList([]);
    }
  };`;
code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Account.tsx', code);
