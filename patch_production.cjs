const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

if (!code.includes("import { defaultRoles }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

if (!code.includes("const isReadOnly =")) {
  code = code.replace(
    "const [orders, setOrders] = useLocalStorage<ProductionOrder[]>('production_orders_v11', INITIAL_ORDERS);",
    "const { user } = useAuth();\n  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];\n  const isReadOnly = currentRole?.permissions?.production_readonly === true;\n\n  const [orders, setOrders] = useLocalStorage<ProductionOrder[]>('production_orders_v11', INITIAL_ORDERS);"
  );
}

const newBtnTarget = `<button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>`;
const newBtnReplacement = `{!isReadOnly && (<button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>)}`;
code = code.replace(newBtnTarget, newBtnReplacement);

const actionTarget = `<button onClick={() => handleEdit(order)} className="p-2 text-tertiary hover:text-blue-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(order.id)} className="p-2 text-tertiary hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>`;
const actionReplacement = `{!isReadOnly && (<><button onClick={() => handleEdit(order)} className="p-2 text-tertiary hover:text-blue-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(order.id)} className="p-2 text-tertiary hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button></>)}`;
code = code.replace(actionTarget, actionReplacement);

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
