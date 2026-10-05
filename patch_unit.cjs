const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                           {[viewingOrder.cratesQuantity && \`\${viewingOrder.cratesQuantity} كيس\`, viewingOrder.looseQuantity && \`\${viewingOrder.looseQuantity} عدد\`].filter(Boolean).join(' + ')}`;

const newStr = `                           {[viewingOrder.cratesQuantity && \`\${viewingOrder.cratesQuantity} \${viewingOrder.unit || ''}\`.trim(), viewingOrder.looseQuantity && \`\${viewingOrder.looseQuantity} عدد\`].filter(Boolean).join(' + ')}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
