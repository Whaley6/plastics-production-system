const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const target = `export default function ProductionOrders() {
  const isViewer = false;`;

const replacement = `export default function ProductionOrders() {
  const { user } = useAuth();
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];
  const isReadOnly = currentRole?.permissions?.production_readonly === true;
  const isViewer = isReadOnly;`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
