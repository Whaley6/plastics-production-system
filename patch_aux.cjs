const fs = require('fs');
let code = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf8');

if (!code.includes("import { defaultRoles }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

if (!code.includes("const isReadOnly =")) {
  code = code.replace(
    "const [workOrders, setWorkOrders] = useLocalStorage<AuxWorkOrder[]>('aux_work_orders', []);",
    "const { user } = useAuth();\n  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];\n  const isReadOnly = currentRole?.permissions?.auxiliary_readonly === true;\n\n  const [workOrders, setWorkOrders] = useLocalStorage<AuxWorkOrder[]>('aux_work_orders', []);"
  );
}

const newBtnTarget1 = `<button onClick={() => setView('work-order-form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>`;
const newBtnReplacement1 = `{!isReadOnly && (<button onClick={() => setView('work-order-form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>)}`;
code = code.replace(newBtnTarget1, newBtnReplacement1);

const newBtnTarget2 = `<button onClick={() => setView('procurement-form')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>`;
const newBtnReplacement2 = `{!isReadOnly && (<button onClick={() => setView('procurement-form')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>)}`;
code = code.replace(newBtnTarget2, newBtnReplacement2);

const newBtnTarget3 = `<button onClick={() => setView('equipment-form')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Equipment
          </button>`;
const newBtnReplacement3 = `{!isReadOnly && (<button onClick={() => setView('equipment-form')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Equipment
          </button>)}`;
code = code.replace(newBtnTarget3, newBtnReplacement3);

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

const actionTarget3 = `<button onClick={() => handleEditEquipment(equip)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEquipment(equip.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>`;
const actionReplacement3 = `{!isReadOnly && (<><button onClick={() => handleEditEquipment(equip)} className="text-tertiary hover:text-blue-400 p-1 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEquipment(equip.id)} className="text-tertiary hover:text-red-400 p-1 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button></>)}`;
code = code.replace(actionTarget3, actionReplacement3);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', code);
