const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

// The columns we want to keep are Date, Equipment Name, and Work / Details
content = content.replace(
  /<td className="px-4 py-3 text-sm text-primary font-medium">\s*\{wo\.replaceSpareParts \|\| '-'\}\s*<\/td>/g,
  ''
);
content = content.replace(
  /\{activeCategory === 'GENERATORS' && \(\s*<>\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.typeField \|\| '-'\}<\/td>\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.hours \|\| '-'\}<\/td>\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.extraOil \|\| '-'\}<\/td>\s*<\/>\s*\)\}/g,
  ''
);
content = content.replace(
  /\{activeCategory === 'COMPRESSORS' && \(\s*<>\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.hours \|\| '-'\}<\/td>\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.machineSerialNo \|\| '-'\}<\/td>\s*<\/>\s*\)\}/g,
  ''
);
content = content.replace(
  /\{\(activeCategory === 'DRYERS' \|\| activeCategory === 'RO' \|\| activeCategory === 'UPS'\) && \(\s*<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\{wo\.machineSerialNo \|\| '-'\}<\/td>\s*\)\}/g,
  ''
);
content = content.replace(
  /<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">\s*\{wo\.assignedTo \? \([\s\S]*?\) : \([\s\S]*?\}\s*<\/td>/g,
  ''
);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
