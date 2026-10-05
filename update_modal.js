const fs = require('fs');

let content = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

// Replace {isCreatingOrder && ( with {(isCreatingOrder || editingOrder) && (
content = content.replace('{isCreatingOrder && (', '{(isCreatingOrder || editingOrder) && (\n{(() => {\n  const isEditing = !!editingOrder;\n  const isMaintenance = activeTab === \'Maintenance\';\n  return (');

// Close the self-executing function
content = content.replace('      )}\n    </div>', '      );\n})()}\n    </div>');

// Replace handlers
content = content.replace(/onClick=\{.. \=\> setIsCreatingOrder\(false\)\}/g, 'onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}');

// Replace title text
content = content.replace('{activeTab === \'Maintenance\' ? (', '{isMaintenance ? (');
content = content.replace('<><Wrench className="w-5 h-5 text-blue-400" /> New Work Order</>', '<><Wrench className="w-5 h-5 text-blue-400" /> {isEditing ? "Edit Maintenance Order" : "New Maintenance Order"}</>');
content = content.replace('<><Package className="w-5 h-5 text-blue-400" /> New Part Request</>', '<><Package className="w-5 h-5 text-blue-400" /> {isEditing ? "Edit Part Request" : "New Part Request"}</>');

// Replace Form values - Maintenance 
// select machine
content = content.replace('className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue={isEditing && isMaintenance ? (editingOrder as WorkOrder).machineId : ""}');

// select issue
content = content.replace('placeholder="Describe the issue..."\n                    ></textarea>',
  'placeholder="Describe the issue..."\n                      defaultValue={isEditing && isMaintenance ? (editingOrder as WorkOrder).issue : ""}\n                    ></textarea>');

// select priority
content = content.replace('className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue={isEditing && isMaintenance ? (editingOrder as WorkOrder).priority : "Low"}');

// select assign
content = content.replace('className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue={isEditing && isMaintenance ? ((editingOrder as WorkOrder).assignedTo || "") : ""}');

// Replace Form values - Procurement
// part name
content = content.replace('placeholder="e.g. Hydraulic Seals Kit"',
  'placeholder="e.g. Hydraulic Seals Kit" defaultValue={isEditing && !isMaintenance ? (editingOrder as ProcurementOrder).partName : ""}');

// related WO
content = content.replace('className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'className="w-full px-3 py-2 bg-canvas border border-surface-elevated rounded-md text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue={isEditing && !isMaintenance ? ((editingOrder as ProcurementOrder).workOrderId || "") : ""}');

// quantity
content = content.replace('placeholder="1"',
  'placeholder="1" defaultValue={isEditing && !isMaintenance ? (editingOrder as ProcurementOrder).quantity : ""}');

// supplier
content = content.replace('placeholder="e.g. Industrial Motors Co"',
  'placeholder="e.g. Industrial Motors Co" defaultValue={isEditing && !isMaintenance ? (editingOrder as ProcurementOrder).supplier : ""}');

// cost
content = content.replace('placeholder="0.00"',
  'placeholder="0.00" defaultValue={isEditing && !isMaintenance ? (editingOrder as ProcurementOrder).cost : ""}');

// replace Submit button
content = content.replace('{activeTab === \'Maintenance\' ? \'Create Work Order\' : \'Submit Request\'}',
  '{isEditing ? "Save Changes" : (isMaintenance ? "Create Maintenance Order" : "Submit Request")}');
  
// fix activeTab
content = content.replace(/{activeTab === 'Maintenance' \? \(/g, '{isMaintenance ? (');

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', content);
