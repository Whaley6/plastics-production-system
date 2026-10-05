const fs = require('fs');
let code = fs.readFileSync('src/pages/CncMoldTickets.tsx', 'utf8');

if (!code.includes("import { useAuth }")) {
  code = code.replace(
    "import { useLocalStorage } from '../hooks/useLocalStorage';",
    "import { useLocalStorage } from '../hooks/useLocalStorage';\nimport { useAuth } from '../hooks/useAuth';\nimport { defaultRoles } from './Roles';"
  );
}

if (!code.includes("const isReadOnly")) {
  code = code.replace(
    "const [tickets, setTickets] = useLocalStorage<CncTicket[]>('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);",
    "const { user } = useAuth();\n  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);\n  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];\n  const isReadOnly = currentRole?.permissions?.cnc_readonly === true;\n\n  const [tickets, setTickets] = useLocalStorage<CncTicket[]>('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);"
  );
}

// Remove New Ticket Button if read-only
code = code.replace(
  /<button\s+onClick=\{\(\) => handleOpenForm\(\)\}\s+className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"\s*>\s*<Plus className="w-4 h-4" \/>\s*New Ticket\s*<\/button>/,
  `{!isReadOnly && (<button onClick={() => handleOpenForm()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> New Ticket</button>)}`
);

// Disable or hide edit/delete buttons
code = code.replace(
  /<button\s+onClick=\{\(\) => handleOpenForm\(ticket\)\}\s+className="text-tertiary hover:text-blue-400 transition-colors"\s+title="Edit"\s*>\s*<Pencil className="w-4 h-4" \/>\s*<\/button>/g,
  `{!isReadOnly && (<button onClick={() => handleOpenForm(ticket)} className="text-tertiary hover:text-blue-400 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => handleDelete\(ticket.id\)\}\s+className="text-tertiary hover:text-red-400 transition-colors"\s+title="Delete"\s*>\s*<Trash2 className="w-4 h-4" \/>\s*<\/button>/g,
  `{!isReadOnly && (<button onClick={() => handleDelete(ticket.id)} className="text-tertiary hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>)}`
);

// We need to also block updates in Maintenance Orders, etc. but let's check daily report first.
fs.writeFileSync('src/pages/CncMoldTickets.tsx', code);
