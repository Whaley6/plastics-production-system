const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');
content = content.replace(
  /         => \{\n  const \[docId, setDocId\] = useState\(initialOrder\?\.id \|\| `PO-\$\{Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)\}`\);/,
  `      </div>\n      <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 bg-canvas/50">\n        <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-surface-strong text-secondary rounded text-sm font-medium transition-colors cursor-pointer">Cancel</button>\n        <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors cursor-pointer">Save Entry</button>\n      </div>\n    </div>\n  );\n};\n\n// @ts-ignore\nconst ProcurementOrderEditor = ({ initialOrder, onSave, onCancel }: any) => {\n  const [docId, setDocId] = useState(initialOrder?.id || \`PO-\${Math.floor(1000 + Math.random() * 9000)}\`);`
);
fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
