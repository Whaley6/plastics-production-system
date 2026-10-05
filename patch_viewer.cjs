const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                     <div>
                       <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Packaging Format Details</span>
                       <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">{viewingOrder.packagingDetails}</bdi></span>
                     </div>

                   </div>`;

const newStr = `                     <div>
                       <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Packaging Format Details</span>
                       <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">{viewingOrder.packagingDetails}</bdi></span>
                     </div>
                     {viewingOrder.unit && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Unit</span>
                         <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">{viewingOrder.unit}</bdi></span>
                       </div>
                     )}
                     {(viewingOrder.cratesQuantity || viewingOrder.looseQuantity) && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Current Completed Breakdown</span>
                         <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">
                           {[viewingOrder.cratesQuantity && \`\${viewingOrder.cratesQuantity} كيس\`, viewingOrder.looseQuantity && \`\${viewingOrder.looseQuantity} عدد\`].filter(Boolean).join(' + ')}
                         </bdi></span>
                       </div>
                     )}
                   </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
