const fs = require('fs');
let code = fs.readFileSync('src/pages/Account.tsx', 'utf8');
code = code.replace(
  "import { Role } from './Roles';",
  "import { Role, defaultRoles } from './Roles';"
);
code = code.replace(
  "const allRoles = [{ id: 'super-admin', name: 'Super Administrator' }, { id: 'employee', name: 'Employee' }, ...roles];",
  "const allRoles = roles.length > 0 ? roles : defaultRoles;"
);
code = code.replace(
  "const [newRole, setNewRole] = useState('employee');",
  "const [newRole, setNewRole] = useState('worker');"
);
fs.writeFileSync('src/pages/Account.tsx', code);
