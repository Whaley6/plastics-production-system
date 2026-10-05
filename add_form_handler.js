const fs = require('fs');

let content = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

// Replace the modal root block to use form
content = content.replace(
  '<div className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">',
  '<form onSubmit={handleSubmit} className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">'
);

// Close form
content = content.replace(
  '            </div>\n          </div>\n            );\n          })()}\n        </div>',
  '            </div>\n          </form>\n            );\n          })()}\n        </div>'
);

// Make submit button type="submit" and remove onClick
content = content.replace(
  '              <button \n                onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}\n                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white-fixed rounded text-sm font-medium transition-colors cursor-pointer"\n              >',
  '              <button \n                type="submit"\n                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white-fixed rounded text-sm font-medium transition-colors cursor-pointer"\n              >'
);

// Add name attributes
content = content.replace('<select \n                      defaultValue={isEditing ? wo?.machineId : ""}', '<select \n                      name="machineId" required\n                      defaultValue={isEditing ? wo?.machineId : ""}');
content = content.replace('placeholder="Describe the issue..."\n                      defaultValue={isEditing ? wo?.issue : ""}', 'placeholder="Describe the issue..."\n                      name="issue" required\n                      defaultValue={isEditing ? wo?.issue : ""}');
content = content.replace('<select \n                        defaultValue={isEditing ? wo?.priority : "Low"}', '<select \n                        name="priority" required\n                        defaultValue={isEditing ? wo?.priority : "Low"}');
content = content.replace('<select \n                        defaultValue={isEditing ? wo?.assignedTo || "" : ""}', '<select \n                        name="assignedTo"\n                        defaultValue={isEditing ? wo?.assignedTo || "" : ""}');
content = content.replace('<select \n                        defaultValue={isEditing ? wo?.status : "Open"}', '<select \n                        name="status"\n                        defaultValue={isEditing ? wo?.status : "Open"}');
content = content.replace('type="date"\n                        defaultValue={isEditing ? wo?.dateReported', 'type="date" name="dateReported" required\n                        defaultValue={isEditing ? wo?.dateReported');

content = content.replace('placeholder="e.g. Hydraulic Seals Kit" \n                      defaultValue={isEditing ? po?.partName : ""}', 'placeholder="e.g. Hydraulic Seals Kit" \n                      name="partName" required\n                      defaultValue={isEditing ? po?.partName : ""}');
content = content.replace('<select \n                        defaultValue={isEditing ? po?.workOrderId || "" : ""}', '<select \n                        name="workOrderId"\n                        defaultValue={isEditing ? po?.workOrderId || "" : ""}');
content = content.replace('placeholder="1" \n                        defaultValue={isEditing ? po?.quantity : ""}', 'placeholder="1" \n                        name="quantity" required\n                        defaultValue={isEditing ? po?.quantity : ""}');
content = content.replace('placeholder="e.g. Industrial Motors Co" \n                      defaultValue={isEditing ? po?.supplier : ""}', 'placeholder="e.g. Industrial Motors Co" \n                      name="supplier" required\n                      defaultValue={isEditing ? po?.supplier : ""}');
content = content.replace('placeholder="0.00" \n                      defaultValue={isEditing ? po?.cost : ""}', 'placeholder="0.00" \n                      name="cost" required\n                      defaultValue={isEditing ? po?.cost : ""}');
content = content.replace('<select \n                        defaultValue={isEditing ? po?.status : "Requested"}', '<select \n                        name="status"\n                        defaultValue={isEditing ? po?.status : "Requested"}');
content = content.replace('type="date"\n                        defaultValue={isEditing ? po?.expectedDelivery : ""}', 'type="date" name="expectedDelivery" required\n                        defaultValue={isEditing ? po?.expectedDelivery : ""}');

// Add handleSubmit to top of component
const handleFn = `
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isMaintenance = activeTab === 'Maintenance';
    
    if (isMaintenance) {
      if (editingOrder) {
        setWorkOrders(workOrders.map(wo => wo.id === editingOrder.id ? {
          ...wo,
          machineId: formData.get('machineId') as string,
          issue: formData.get('issue') as string,
          priority: formData.get('priority') as string,
          status: formData.get('status') as string,
          assignedTo: formData.get('assignedTo') as string || undefined,
          dateReported: formData.get('dateReported') as string,
        } : wo));
      } else {
        const selectedMachine = document.querySelector('select[name="machineId"] option:checked')?.textContent;
        const machineName = selectedMachine ? selectedMachine.split(' - ')[1] : '';
        setWorkOrders([{
          id: \`MO-\${Math.floor(1000 + Math.random() * 9000)}\`,
          machineId: formData.get('machineId') as string,
          machineName: machineName,
          issue: formData.get('issue') as string,
          priority: formData.get('priority') as string,
          status: formData.get('status') as string,
          reportedBy: 'Current User', // Mock
          assignedTo: formData.get('assignedTo') as string || undefined,
          dateReported: formData.get('dateReported') as string,
        }, ...workOrders]);
      }
    } else {
      if (editingOrder) {
        setProcurementOrders(procurementOrders.map(po => po.id === editingOrder.id ? {
          ...po,
          partName: formData.get('partName') as string,
          workOrderId: formData.get('workOrderId') as string || undefined,
          quantity: Number(formData.get('quantity')),
          supplier: formData.get('supplier') as string,
          cost: Number(formData.get('cost')),
          status: formData.get('status') as string,
          expectedDelivery: formData.get('expectedDelivery') as string,
        } : po));
      } else {
        setProcurementOrders([{
          id: \`PO-\${Math.floor(1000 + Math.random() * 9000)}\`,
          partName: formData.get('partName') as string,
          workOrderId: formData.get('workOrderId') as string || undefined,
          machineName: '', // Mocked for simplicity
          quantity: Number(formData.get('quantity')),
          supplier: formData.get('supplier') as string,
          cost: Number(formData.get('cost')),
          status: formData.get('status') as string,
          expectedDelivery: formData.get('expectedDelivery') as string,
        }, ...procurementOrders]);
      }
    }
    
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };
`;

content = content.replace('  const getPriorityColor = (priority: string) => {', handleFn + '\n  const getPriorityColor = (priority: string) => {');

fs.writeFileSync('src/pages/MaintenanceOrders.tsx', content);
