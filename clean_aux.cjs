const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

// The first fix script removed the form fields, let's also remove them from the tables and types to be clean.

content = content.replace(/replaceSpareParts\?: string;/g, '');
content = content.replace(/typeField\?: string;/g, '');
content = content.replace(/hours\?: string;/g, '');
content = content.replace(/extraOil\?: string;/g, '');
content = content.replace(/actionBy\?: string;/g, '');

content = content.replace(/const \[replaceSpareParts, setReplaceSpareParts\] = useState[^\n]+;/g, '');
content = content.replace(/const \[typeField, setTypeField\] = useState[^\n]+;/g, '');
content = content.replace(/const \[hours, setHours\] = useState[^\n]+;/g, '');
content = content.replace(/const \[extraOil, setExtraOil\] = useState[^\n]+;/g, '');
content = content.replace(/const \[actionBy, setActionBy\] = useState[^\n]+;/g, '');

// In handleSubmit
content = content.replace(/replaceSpareParts,/g, '');
content = content.replace(/typeField,/g, '');
content = content.replace(/hours,/g, '');
content = content.replace(/extraOil,/g, '');
content = content.replace(/actionBy,/g, '');

// In handleOpenModal (resetting state)
content = content.replace(/setReplaceSpareParts[^\n]+/g, '');
content = content.replace(/setTypeField[^\n]+/g, '');
content = content.replace(/setHours[^\n]+/g, '');
content = content.replace(/setExtraOil[^\n]+/g, '');
content = content.replace(/setActionBy[^\n]+/g, '');

// In columns definition
content = content.replace(/{ header: 'REPLACE \/ SPARE PARTS', key: 'replaceSpareParts', width: 30 },/g, '');
content = content.replace(/columns\.push\(\{ header: 'TYPE', key: 'typeField', width: 20 \}\);/g, '');
content = content.replace(/columns\.push\(\{ header: 'HOURS', key: 'hours', width: 15 \}\);/g, '');
content = content.replace(/columns\.push\(\{ header: 'EXTRA OIL \(Lt\)', key: 'extraOil', width: 15 \}\);/g, '');

content = content.replace(/{ header: 'TYPE', key: 'typeField', width: 20 },/g, '');
content = content.replace(/{ header: 'HOURS', key: 'hours', width: 15 },/g, '');
content = content.replace(/{ header: 'EXTRA OIL \(Lt\)', key: 'extraOil', width: 15 },/g, '');

// In unified columns
content = content.replace(/replaceSpareParts: wo\.replaceSpareParts \|\| '-',/g, '');
content = content.replace(/typeField: wo\.typeField \|\| '-',/g, '');
content = content.replace(/hours: wo\.hours \|\| '-',/g, '');
content = content.replace(/extraOil: wo\.extraOil \|\| '-',/g, '');
content = content.replace(/actionBy: wo\.actionBy \|\| '-',/g, '');

content = content.replace(/replaceSpareParts: wo\.replaceSpareParts,/g, '');
content = content.replace(/typeField: wo\.typeField,/g, '');
content = content.replace(/hours: wo\.hours,/g, '');
content = content.replace(/extraOil: wo\.extraOil,/g, '');
content = content.replace(/actionBy: wo\.actionBy,/g, '');

// Table headers (HTML)
content = content.replace(/<th className="px-4 py-3 font-semibold">Replace \/ Spare Parts<\/th>/g, '');
content = content.replace(/{activeCategory === 'GENERATORS' && \(\s*<>\s*<th className="px-4 py-3 font-semibold">Type<\/th>\s*<th className="px-4 py-3 font-semibold">Hours<\/th>\s*<th className="px-4 py-3 font-semibold">Extra Oil \(Lt\)<\/th>\s*<\/>\s*\)}/g, '');
content = content.replace(/{activeCategory === 'COMPRESSORS' && \(\s*<th className="px-4 py-3 font-semibold">Hours<\/th>\s*\)}/g, '');
content = content.replace(/<th className="px-4 py-3 font-semibold">Action By<\/th>/g, '');

// Table cells (HTML)
content = content.replace(/<td className="px-4 py-3 whitespace-nowrap text-secondary truncate max-w-\[200px\]" dir="auto">\s*{wo\.replaceSpareParts \|\| '-'}\s*<\/td>/g, '');
content = content.replace(/{activeCategory === 'GENERATORS' && \(\s*<>\s*<td className="px-4 py-3 whitespace-nowrap text-secondary truncate" dir="auto">{wo\.typeField \|\| '-'}<\/td>\s*<td className="px-4 py-3 whitespace-nowrap text-secondary font-mono">{wo\.hours \|\| '-'}<\/td>\s*<td className="px-4 py-3 whitespace-nowrap text-secondary font-mono">{wo\.extraOil \|\| '-'}<\/td>\s*<\/>\s*\)}/g, '');
content = content.replace(/{activeCategory === 'COMPRESSORS' && \(\s*<td className="px-4 py-3 whitespace-nowrap text-secondary font-mono">{wo\.hours \|\| '-'}<\/td>\s*\)}/g, '');
content = content.replace(/<td className="px-4 py-3 whitespace-nowrap text-secondary truncate max-w-\[150px\]" dir="auto">\s*{wo\.actionBy \|\| '-'}\s*<\/td>/g, '');

// Modal details (HTML)
content = content.replace(/<div className="grid gap-1">\s*<span className="text-xs font-semibold text-quaternary">Replace \/ Spare Parts<\/span>\s*<span className="text-sm text-secondary bg-surface-elevated\/50 p-3 rounded-md">{viewingOrder\.replaceSpareParts \|\| '-'}<\/span>\s*<\/div>/g, '');
content = content.replace(/<div className="grid gap-1">\s*<span className="text-xs font-semibold text-quaternary">Type<\/span>\s*<span className="text-sm text-secondary bg-surface-elevated\/50 px-3 py-2 rounded-md">{viewingOrder\.typeField \|\| '-'}<\/span>\s*<\/div>/g, '');
content = content.replace(/<div className="grid gap-1">\s*<span className="text-xs font-semibold text-quaternary">Hours<\/span>\s*<span className="text-sm font-mono text-secondary bg-surface-elevated\/50 px-3 py-2 rounded-md">{viewingOrder\.hours \|\| '-'}<\/span>\s*<\/div>/g, '');
content = content.replace(/<div className="grid gap-1">\s*<span className="text-xs font-semibold text-quaternary">Extra Oil \(Lt\)<\/span>\s*<span className="text-sm font-mono text-secondary bg-surface-elevated\/50 px-3 py-2 rounded-md">{viewingOrder\.extraOil \|\| '-'}<\/span>\s*<\/div>/g, '');
content = content.replace(/<div className="grid gap-1">\s*<span className="text-xs font-semibold text-quaternary">Action By<\/span>\s*<span className="text-sm text-secondary bg-surface-elevated\/50 px-3 py-2 rounded-md">{viewingOrder\.actionBy \|\| '-'}<\/span>\s*<\/div>/g, '');


fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
