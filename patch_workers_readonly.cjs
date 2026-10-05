const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

if (!code.includes("const isReadOnly = ")) {
  code = code.replace(
    "const canViewAll = activeRole && activeRole.permissions && activeRole.permissions.workers_view_all !== undefined ? activeRole.permissions.workers_view_all : true;",
    "const canViewAll = activeRole && activeRole.permissions && activeRole.permissions.workers_view_all !== undefined ? activeRole.permissions.workers_view_all : true;\n  const isReadOnly = activeRole?.permissions?.workers_readonly === true;"
  );
}

// Ensure isReadOnly is checked in add/edit/delete operations
code = code.replace(
  /<button\s+onClick=\{\(\) => setIsAdding\(true\)\}\s+className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"\s*>\s*<Plus className="w-4 h-4" \/>\s*New Worker\s*<\/button>/g,
  `{!isReadOnly && (<button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> New Worker</button>)}`
);

// We should also disable edit buttons
code = code.replace(
  /<button onClick=\{\(\) => handleEdit\(worker\)\} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600\/20 text-blue-400 rounded-lg hover:bg-blue-600\/30 transition-colors">/g,
  `{!isReadOnly && (<button onClick={() => handleEdit(worker)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors">)}`
);

code = code.replace(
  /<button onClick=\{\(\) => handleDelete\(worker\)\} className="p-2 text-red-400 bg-red-400\/10 rounded-lg hover:bg-red-400\/20 transition-colors" title="Delete Worker">/g,
  `{!isReadOnly && (<button onClick={() => handleDelete(worker)} className="p-2 text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors" title="Delete Worker">)}`
);

// For missing closing tags we need to be careful with regex replacement
fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
