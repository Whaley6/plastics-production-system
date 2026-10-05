const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                     {(viewingOrder.cratesQuantity || viewingOrder.looseQuantity) && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Current Completed Breakdown</span>
                         <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">
                           {[viewingOrder.cratesQuantity && \`\${viewingOrder.cratesQuantity} \${viewingOrder.unit || ''}\`.trim(), viewingOrder.looseQuantity && \`\${viewingOrder.looseQuantity} عدد\`].filter(Boolean).join(' + ')}
                         </bdi></span>
                       </div>
                     )}`;

const newStr = `                     {(viewingOrder.cratesQuantity || viewingOrder.looseQuantity) && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Current Completed Breakdown</span>
                         <span className="text-sm text-secondary font-medium block" dir="rtl">
                           {viewingOrder.cratesQuantity && <bdi>{viewingOrder.cratesQuantity} {viewingOrder.unit || ''}</bdi>}
                           {viewingOrder.cratesQuantity && viewingOrder.looseQuantity && ' + '}
                           {viewingOrder.looseQuantity && <bdi>{viewingOrder.looseQuantity} عدد</bdi>}
                         </span>
                       </div>
                     )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
