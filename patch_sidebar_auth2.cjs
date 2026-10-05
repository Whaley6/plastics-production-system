const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const target = `Account</button>`;
const replacement = `Account</button>
                    <button onClick={() => { logout(); window.location.reload(); }} className="w-full px-4 py-2.5 text-[11px] font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-colors border-t border-divider/50">Sign Out</button>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Sidebar.tsx', code);
