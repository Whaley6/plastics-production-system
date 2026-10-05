const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

// 1. Remove Replace / Spare parts grid structure and just leave date
content = content.replace(
  /<div className="grid grid-cols-2 gap-4">\s*<div className="space-y-1">\s*<label className="text-xs font-semibold text-secondary">Date<\/label>[\s\S]*?<\/div>\s*<\/div>/,
  '<div className="space-y-1">\n            <label className="text-xs font-semibold text-secondary">Date</label>\n            <input type="date" value={dateReported} onChange={e => setDateReported(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]" />\n          </div>'
);

// 2. Remove Type, Hours, Extra Oil, Action By fields from form
content = content.replace(
  /{activeCategory === 'GENERATORS' && \([\s\S]*?}\)/,
  ''
);

content = content.replace(
  /{activeCategory === 'COMPRESSORS' && \([\s\S]*?}\)/,
  ''
);

// 3. Keep DRYERS, RO, UPS Machine Serial No if not boxed, but I should probably just leave it alone or remove it if the user wants it gone. Wait, the user boxed "Type, Hours, Extra Oil (Lt)" and "Action By".
// Let's remove Action By
content = content.replace(
  /<div className="space-y-1">\s*<label className="text-xs font-semibold text-secondary">Action By<\/label>[\s\S]*?<\/div>/,
  ''
);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
