const fs = require('fs');
let code = fs.readFileSync('src/pages/MachineDirectory.tsx', 'utf8');

if (!code.includes("import { defaultRoles }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

if (!code.includes("const isReadOnly =")) {
  code = code.replace(
    "const [machines, setMachines] = useLocalStorage<Machine[]>('production_machines_v11', INITIAL_MACHINES);",
    "const { user } = useAuth();\n  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];\n  const isReadOnly = currentRole?.permissions?.machines_readonly === true;\n\n  const [machines, setMachines] = useLocalStorage<Machine[]>('production_machines_v11', INITIAL_MACHINES);"
  );
}

const actionTarget = `<button onClick={() => setEditingMachine(machine)} className="p-2 text-tertiary hover:text-blue-400 transition-colors" title="Edit Machine">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(machine.id)} className="p-2 text-tertiary hover:text-red-400 transition-colors" title="Delete Machine">
                    <Trash2 className="w-4 h-4" />
                  </button>`;
const actionReplacement = `{!isReadOnly && (<><button onClick={() => setEditingMachine(machine)} className="p-2 text-tertiary hover:text-blue-400 transition-colors" title="Edit Machine">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(machine.id)} className="p-2 text-tertiary hover:text-red-400 transition-colors" title="Delete Machine">
                    <Trash2 className="w-4 h-4" />
                  </button></>)}`;
code = code.replace(actionTarget, actionReplacement);

const newBtnTarget = `<button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Machine
          </button>`;
const newBtnReplacement = `{!isReadOnly && (<button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Machine
          </button>)}`;
code = code.replace(newBtnTarget, newBtnReplacement);

fs.writeFileSync('src/pages/MachineDirectory.tsx', code);
