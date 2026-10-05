const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductionOrders.tsx', 'utf8');

const target = `<td className="px-3 py-2.5 font-semibold text-primary">{m.moldName}</td>`;

const replacement = `<td className="px-3 py-2.5 font-semibold text-primary">
                            {m.molds && m.molds.length > 1 ? (
                              <select 
                                value={m.moldName}
                                onChange={(e) => {
                                  setMachines(prev => prev.map(mach => mach.id === m.id ? { ...mach, moldName: e.target.value } : mach));
                                  logAction('Active Mold Changed', \`Changed active mold for \${m.name} to \${e.target.value}\`, 'info');
                                }}
                                className="bg-surface border border-divider rounded px-2 py-1 text-xs outline-none text-primary"
                              >
                                {m.molds.map(mold => (
                                  <option key={mold} value={mold}>{mold}</option>
                                ))}
                              </select>
                            ) : (
                              m.moldName
                            )}
                          </td>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/ProductionOrders.tsx', code);
