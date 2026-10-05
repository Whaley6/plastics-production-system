const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr1 = `                     {(viewingOrder.cratesQuantity || viewingOrder.looseQuantity) && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Current Completed Breakdown</span>
                         <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">
                           {[viewingOrder.cratesQuantity && \`\${viewingOrder.cratesQuantity} كيس\`, viewingOrder.looseQuantity && \`\${viewingOrder.looseQuantity} عدد\`].filter(Boolean).join(' + ')}
                         </bdi></span>
                       </div>
                     )}`;

const targetStr2 = `                            const updatedOrder = { 
                              ...viewingOrder, 
                              accumulatedTimeMs: newAccumulated
                              // Intentionally omitting cratesQuantity and looseQuantity updates
                              // to avoid overriding the "Current Completed Breakdown" (green square)
                            };`;
const newStr2 = `                            const updatedOrder = { 
                              ...viewingOrder, 
                              accumulatedTimeMs: newAccumulated
                            };`;

if (code.includes(targetStr1)) {
  code = code.replace(targetStr1, '');
  console.log('Removed target 1');
} else {
  console.log('Target 1 not found');
}

if (code.includes(targetStr2)) {
  code = code.replace(targetStr2, newStr2);
  console.log('Replaced target 2');
} else {
  console.log('Target 2 not found');
}

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
