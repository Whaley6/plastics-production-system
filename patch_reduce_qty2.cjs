const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                               const val = parseInt(input.value, 10);
                               if (!isNaN(val) && val > 0) {
                                  const newQty = Math.max(1, viewingOrder.quantity - val);
                                  const updatedOrder = { ...viewingOrder, quantity: newQty };
                                  setViewingOrder(updatedOrder);
                                  setOrders(prev => prev.map(o => o.id === viewingOrder.id ? updatedOrder : o));
                                  input.value = '';
                               }`;

const newStr = `                               const val = parseInt(input.value, 10);
                               if (!isNaN(val) && val > 0) {
                                  const method = viewingOrder.productionRateMethod || 'cycle';
                                  let deductedMs = 0;
                                  if (method === 'cycle') {
                                      const safeCycleTime = viewingOrder.cycleTime || 10;
                                      const safeCavities = viewingOrder.cavities || 1;
                                      deductedMs = (val / safeCavities) * safeCycleTime * 1000;
                                  } else {
                                      const safeHourlyRate = viewingOrder.hourlyRate || 1000;
                                      deductedMs = (val / safeHourlyRate) * 3600 * 1000;
                                  }
                                  const currentAccumulated = viewingOrder.accumulatedTimeMs || 0;
                                  const updatedOrder = { ...viewingOrder, accumulatedTimeMs: currentAccumulated - deductedMs };
                                  
                                  setViewingOrder(updatedOrder);
                                  setOrders(prev => prev.map(o => o.id === viewingOrder.id ? updatedOrder : o));
                                  input.value = '';
                               }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}
