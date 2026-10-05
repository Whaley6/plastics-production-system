const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                     {viewingOrder.unit && (
                       <div>
                         <span className="text-[10px] text-tertiary block mb-0.5 font-semibold">Unit</span>
                         <span className="text-sm text-secondary font-medium"><bdi dir="rtl" className="block">{viewingOrder.unit}</bdi></span>
                       </div>
                     )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, "");
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
