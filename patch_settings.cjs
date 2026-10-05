const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!code.includes('__APP_VERSION__')) {
  // Add Info icon
  code = code.replace(
    /import \{ Moon, Sun, Monitor, Type, Plus, Minus, Users, Trash2 \} from 'lucide-react';/,
    "import { Moon, Sun, Monitor, Type, Plus, Minus, Users, Trash2, Info } from 'lucide-react';"
  );

  const section = `          <div className="bg-surface border border-divider rounded-xl p-5">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" /> System Information
            </h3>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-primary">App Version</p>
                <p className="text-xs text-tertiary mt-1">Current build version of the application.</p>
              </div>
              <div className="text-sm font-medium text-secondary bg-surface-elevated px-3 py-1.5 rounded-lg border border-divider">
                {/* @ts-ignore */}
                {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Development'}
              </div>
            </div>
          </div>
        </div>`;

  code = code.replace(
    /        <\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/,
    section + "\n      </div>\n    </div>\n  );\n}"
  );

  fs.writeFileSync('src/pages/Settings.tsx', code);
}
