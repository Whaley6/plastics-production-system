const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

if (!code.includes("import { defaultRoles }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

if (!code.includes("const isReadOnly =")) {
  code = code.replace(
    "const [workOrders, setWorkOrders] = useLocalStorage<WorkOrder[]>('maintenance_work_orders', INITIAL_WORK_ORDERS);",
    "const { user } = useAuth();\n  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];\n  const isReadOnly = currentRole?.permissions?.maintenance_readonly === true;\n\n  const [workOrders, setWorkOrders] = useLocalStorage<WorkOrder[]>('maintenance_work_orders', INITIAL_WORK_ORDERS);"
  );
}

const newTarget1 = `<button onClick={() => setView('work-order-form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>`;
const newReplacement1 = `{!isReadOnly && (<button onClick={() => setView('work-order-form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>)}`;
code = code.replace(newTarget1, newReplacement1);

const newTarget2 = `<button onClick={() => setView('procurement-form')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>`;
const newReplacement2 = `{!isReadOnly && (<button onClick={() => setView('procurement-form')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>)}`;
code = code.replace(newTarget2, newReplacement2);

const newTarget3 = `<button onClick={() => setView('machine-form')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Machine
          </button>`;
const newReplacement3 = `{!isReadOnly && (<button onClick={() => setView('machine-form')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Machine
          </button>)}`;
code = code.replace(newTarget3, newReplacement3);

// Hide edit/delete actions inside lists if readonly
const actionTarget1 = `<button onClick={() => handleEditWorkOrder(order)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteWorkOrder(order.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>`;
const actionReplacement1 = `{!isReadOnly && (<><button onClick={() => handleEditWorkOrder(order)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteWorkOrder(order.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button></>)}`;
code = code.replace(actionTarget1, actionReplacement1);

const actionTarget2 = `<button onClick={() => handleEditProcurementOrder(order)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteProcurementOrder(order.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>`;
const actionReplacement2 = `{!isReadOnly && (<><button onClick={() => handleEditProcurementOrder(order)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteProcurementOrder(order.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button></>)}`;
code = code.replace(actionTarget2, actionReplacement2);

const actionTarget3 = `<button onClick={() => handleEditMachine(machine)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteMachine(machine.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>`;
const actionReplacement3 = `{!isReadOnly && (<><button onClick={() => handleEditMachine(machine)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteMachine(machine.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button></>)}`;
code = code.replace(actionTarget3, actionReplacement3);

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
