const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `                    {/* Update Remaining QTY Section */}
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

const newStr = `                    {/* Update Progress Section */}
                    {!isViewer && (
                      <div className="flex items-end gap-3 mt-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-tertiary mb-1">Crates / Bags Quantity</label>
                          <input 
                            type="number" 
                            id="progressCratesInput"
                            className="w-36 px-3 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-secondary outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-tertiary mb-1">Loose Items Quantity</label>
                          <input 
                            type="number" 
                            id="progressLooseInput"
                            className="w-36 px-3 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-secondary outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            placeholder="مثال: 130"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const cratesInput = document.getElementById('progressCratesInput') as HTMLInputElement;
                            const looseInput = document.getElementById('progressLooseInput') as HTMLInputElement;
                            
                            if (!cratesInput?.value && !looseInput?.value) return;

                            const cratesVal = parseInt(cratesInput?.value || '0', 10) || 0;
                            const looseVal = parseInt(looseInput?.value || '0', 10) || 0;
                            
                            const packMatch = viewingOrder.packagingDetails?.match(/[\\d.]+/);
                            const packNum = packMatch ? parseFloat(packMatch[0]) : 0;
                            
                            const producedQty = (packNum * cratesVal) + looseVal;
                            
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
                            
                            const updatedOrder = { 
                              ...viewingOrder, 
                              accumulatedTimeMs: newAccumulated,
                              cratesQuantity: cratesInput?.value ? cratesVal.toString() : viewingOrder.cratesQuantity,
                              looseQuantity: looseInput?.value ? looseVal.toString() : viewingOrder.looseQuantity 
                            };
                            
                            setViewingOrder(updatedOrder);
                            setOrders(prev => prev.map(o => o.id === viewingOrder.id ? updatedOrder : o));
                            if (cratesInput) cratesInput.value = '';
                            if (looseInput) looseInput.value = '';
                          }}
                          className="px-4 py-1.5 h-[30px] mb-0.5 bg-surface-elevated border border-divider rounded-lg text-xs font-bold text-primary hover:bg-surface transition-colors cursor-pointer"
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
