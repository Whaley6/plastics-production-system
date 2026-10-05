const fs = require('fs');
let code = fs.readFileSync('src/utils/dailyReport.ts', 'utf8');

const target = "export async function generateDailyReport() {";
const replacement = `export async function generateDailyReport() {
  const authStored = localStorage.getItem('auth_user');
  const user = authStored ? JSON.parse(authStored) : null;
  const rolesStored = localStorage.getItem('app_roles');
  const roles = rolesStored ? JSON.parse(rolesStored) : [];
  
  // We need to match default roles if empty or not found, but we can't easily import defaultRoles here without possibly causing a circular dep, so let's just do a best effort
  let currentRole = roles.find((r: any) => r.id === user?.role);
  if (!currentRole && user?.role === 'super-admin') {
    currentRole = { permissions: { workers: true, maintenance: true, cnc: true, auxiliary: true, production: true, complaints: true, machines: true, archive: true, settings: true } };
  } else if (!currentRole) {
    currentRole = { permissions: { workers: false, maintenance: false, cnc: false, auxiliary: false, production: true, complaints: false, machines: true, archive: false, settings: false } };
  }
`;

code = code.replace(target, replacement);

const prodTarget = "const productionOrders = await loadData('production_orders_v11', INITIAL_PRODUCTION_ORDERS);";
const prodReplacement = `if (currentRole.permissions.production !== false) {
  const productionOrders = await loadData('production_orders_v11', INITIAL_PRODUCTION_ORDERS);`;
code = code.replace(prodTarget, prodReplacement);
code = code.replace(`  // 2. CNC Mold Tickets`, `  }\n  // 2. CNC Mold Tickets`);

const cncTarget = "const cncTickets = await loadData('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);";
const cncReplacement = `if (currentRole.permissions.cnc !== false) {
  const cncTickets = await loadData('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);`;
code = code.replace(cncTarget, cncReplacement);
code = code.replace(`  // 3. Maintenance Orders (Machine + Auxiliary)`, `  }\n  // 3. Maintenance Orders (Machine + Auxiliary)`);

const maintTarget = "const maintenanceOrders = await loadData('maintenance_work_orders', INITIAL_MAINTENANCE_WORK_ORDERS);";
const maintReplacement = `if (currentRole.permissions.maintenance !== false) {
  const maintenanceOrders = await loadData('maintenance_work_orders', INITIAL_MAINTENANCE_WORK_ORDERS);`;
code = code.replace(maintTarget, maintReplacement);
code = code.replace(`  // 4. Procurement Orders (Machine Maintenance + Auxiliary)`, `  }\n  // 4. Procurement Orders (Machine Maintenance + Auxiliary)`);

const procTarget = "const maintenanceProc = await loadData('maintenance_procurement_orders', INITIAL_MAINTENANCE_PROCUREMENT_ORDERS);";
const procReplacement = `if (currentRole.permissions.maintenance !== false) {
  const maintenanceProc = await loadData('maintenance_procurement_orders', INITIAL_MAINTENANCE_PROCUREMENT_ORDERS);`;
code = code.replace(procTarget, procReplacement);
code = code.replace(`  // If no worksheets were added`, `  }\n  // If no worksheets were added`);

fs.writeFileSync('src/utils/dailyReport.ts', code);
