const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const targetStr = `<div className="px-6 py-4 bg-surface-elevated border border-divider-subtle rounded-lg">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-tertiary mb-1">Live Estimated Remaining Time / Progress Tracker</div>
                  <ProductionProgressBar order={viewingOrder} />
               </div>`;

const newStr = `<div className="px-6 py-4 bg-surface-elevated border border-divider-subtle rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-[9px] uppercase font-bold tracking-wider text-tertiary">Live Estimated Remaining Time / Progress Tracker</div>
                    
                    {/* Reduce QTY Section */}
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
                                  const newQty = Math.max(1, viewingOrder.quantity - val);
                                  const updatedOrder = { ...viewingOrder, quantity: newQty };
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
                    )}
                  </div>
                  <ProductionProgressBar order={viewingOrder} />
               </div>`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
