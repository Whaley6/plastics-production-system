const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                    {/* Reduce QTY Section */}
                    {!isViewer && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="Qty to deduct"
                          id="reduceQtyInput"
                          className="w-24 px-2 py-1 bg-canvas border border-divider rounded text-xs text-secondary outline-none focus:border-blue-500"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('reduceQtyInput') as HTMLInputElement;
                            if (input && input.value) {
                               const val = parseInt(input.value, 10);
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
                               }
                            }
                          }}
                          className="px-2 py-1 bg-surface border border-divider rounded text-[10px] font-bold text-tertiary hover:text-primary transition-colors cursor-pointer"
                        >
                          REDUCE
                        </button>
                      </div>
                    )}`;

const newStr = `                    {/* Update Remaining QTY Section */}
                    {!isViewer && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="Remaining Qty"
                          id="reduceQtyInput"
                          className="w-24 px-2 py-1 bg-canvas border border-divider rounded text-xs text-secondary outline-none focus:border-blue-500"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('reduceQtyInput') as HTMLInputElement;
                            if (input && input.value) {
                               const remainingQty = parseInt(input.value, 10);
                               if (!isNaN(remainingQty) && remainingQty >= 0) {
                                  const producedQty = Math.max(0, viewingOrder.quantity - remainingQty);
                                  const method = viewingOrder.productionRateMethod || 'cycle';
                                  let totalRequiredMs = 0;
                                  if (method === 'cycle') {
                                      const safeCycleTime = viewingOrder.cycleTime || 10;
                                      const safeCavities = viewingOrder.cavities || 1;
                                      totalRequiredMs = (producedQty / safeCavities) * safeCycleTime * 1000;
                                  } else {
                                      const safeHourlyRate = viewingOrder.hourlyRate || 1000;
                                      totalRequiredMs = (producedQty / safeHourlyRate) * 3600 * 1000;
                                  }
                                  
                                  let currentElapsedSinceStart = 0;
                                  if (viewingOrder.status === 'In Progress' && viewingOrder.actualStartTime) {
                                      currentElapsedSinceStart = Math.max(0, Date.now() - new Date(viewingOrder.actualStartTime).getTime());
                                  }
                                  
                                  const newAccumulated = totalRequiredMs - currentElapsedSinceStart;
                                  const updatedOrder = { ...viewingOrder, accumulatedTimeMs: newAccumulated };
                                  
                                  setViewingOrder(updatedOrder);
                                  setOrders(prev => prev.map(o => o.id === viewingOrder.id ? updatedOrder : o));
                                  input.value = '';
                               }
                            }
                          }}
                          className="px-2 py-1 bg-surface border border-divider rounded text-[10px] font-bold text-tertiary hover:text-primary transition-colors cursor-pointer"
                        >
                          UPDATE
                        </button>
                      </div>
                    )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
  console.log('Patched correctly');
} else {
  console.log('Target string not found');
}
