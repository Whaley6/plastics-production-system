const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

// Replace the title
content = content.replace(
  /<h2 className="text-2xl font-bold tracking-tight text-primary">Auxiliary Equipment<\/h2>/g,
  '<h2 className="text-2xl font-bold tracking-tight text-primary">Utilities Equipment</h2>'
);
content = content.replace(
  /Track the fixes and changes for auxiliary equipment./g,
  'Track the fixes and changes for utilities equipment.'
);

// Add the Actions header
content = content.replace(
  /<th className="px-4 py-3 font-semibold">Work \/ Details<\/th>\s*<\/tr>/,
  '<th className="px-4 py-3 font-semibold">Work / Details</th>\n                  <th className="px-4 py-3 font-semibold text-right">Actions</th>\n                </tr>'
);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
