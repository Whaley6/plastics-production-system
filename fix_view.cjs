const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

const replacement = `
      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setViewingOrder(null)}></div>
          <div className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/50">
              <h3 className="text-lg font-bold text-primary-muted flex items-center gap-2">
                {viewingOrder.id.startsWith('MO-') ? (
                  <><Wrench className="w-5 h-5 text-blue-400" /> Maintenance Order Details</>
                ) : (
                  <><Package className="w-5 h-5 text-blue-400" /> Procurement Order Details</>
                )}
              </h3>
              <button 
                onClick={() => setViewingOrder(null)}
                className="text-quaternary hover:text-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid gap-1">
                <span className="text-xs font-semibold text-quaternary">Document Number</span>
                <span className="font-medium text-primary">{viewingOrder.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {viewingOrder.taskName && (
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Task Name</span>
                    <span className="font-medium text-secondary">{viewingOrder.taskName}</span>
                  </div>
                )}
                {viewingOrder.status && (
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Status</span>
                    <div className={\`flex items-center gap-1.5 text-sm font-medium \${getStatusColor(viewingOrder.status)}\`}>
                      {getStatusIcon(viewingOrder.status)} {viewingOrder.status}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">{viewingOrder.requestedBy ? 'Requested By' : 'Reported By'}</span>
                  <span className="text-sm text-secondary">{viewingOrder.requestedBy || viewingOrder.reportedBy || '-'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Assigned To</span>
                  <span className="text-sm text-secondary">{viewingOrder.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Date Reported</span>
                  <span className="text-sm text-secondary">{viewingOrder.dateReported}</span>
                </div>
              </div>

              {viewingOrder.id.startsWith('PO-') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Supplier</span>
                    <span className="text-sm text-secondary">{viewingOrder.supplier}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Expected Delivery</span>
                    <span className="text-sm text-secondary">{viewingOrder.expectedDelivery}</span>
                  </div>
                </div>
              )}

              {viewingOrder.issue && (
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Issue Description</span>
                  <span className="text-sm text-secondary bg-surface-elevated/50 p-3 rounded-md">{viewingOrder.issue}</span>
                </div>
              )}

              {viewingOrder.items && viewingOrder.items.length > 0 && (
                <div className="grid gap-2 pt-2">
                  <span className="text-xs font-semibold text-quaternary">Order Items</span>
                  <div className="space-y-3">
                    {viewingOrder.items.map((item, idx) => (
                      <div key={item.id} className="p-3 border border-surface-elevated rounded-md bg-canvas/30 space-y-2">
                        <div className="flex justify-between items-center">
                          <h5 className="text-sm font-bold text-primary">{item.name || \`Item \${idx + 1}\`}</h5>
                          <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border \${getStatusColor(item.state)}\`}>
                            {item.state}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-secondary">{item.description}</p>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="grid gap-1">
                            <span className="text-[10px] text-quaternary font-semibold">Quantity</span>
                            <span className="text-xs text-primary">{item.quantity}</span>
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[10px] text-quaternary font-semibold">Date Sent</span>
                            <span className="text-xs text-primary">{item.dateSent}</span>
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[10px] text-quaternary font-semibold">Priority</span>
                            <span className="text-xs text-primary">{item.priority}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-divider-subtle">
                          <span className="text-[10px] text-quaternary">
                            Last checked: <span className="font-medium text-secondary">{item.lastChecked ? formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true }) : 'Never'}</span>
                          </span>
                          <button 
                            onClick={() => handleCheckItem(viewingOrder.id, item.id)}
                            className="text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Mark as Checked
                          </button>
                        </div>
                        {item.images && item.images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {item.images.map((img, i) => (
                              <img key={i} src={img} alt={\`Item attached \${i + 1}\`} className="rounded border border-divider-subtle w-full h-16 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(img)} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {('requestForms' in viewingOrder && viewingOrder.requestForms && viewingOrder.requestForms.length > 0) && (
                <div className="grid gap-2 pt-2">
                  <span className="text-xs font-semibold text-quaternary">{viewingOrder.id.startsWith('PO-') ? 'Attached Quotes/Invoices' : 'Request Forms'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingOrder.requestForms.map((fileData, idx) => {
                      const isPdf = fileData.startsWith('data:application/pdf');
                      if (isPdf) {
                        return (
                          <div key={idx} className="flex items-center justify-center p-4 rounded border border-divider-subtle bg-surface/50 h-32 text-blue-400">
                            <a href={fileData} download={\`Attachment_\${idx + 1}.pdf\`} className="flex flex-col items-center gap-2 hover:text-blue-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                              <span className="text-xs font-bold underline">Download PDF</span>
                            </a>
                          </div>
                        );
                      }
                      return <img key={idx} src={fileData} alt={\`Attachment \${idx + 1}\`} className="rounded border border-divider-subtle w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(fileData)} />;
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-divider flex justify-between gap-3 bg-canvas/50">
              <button 
                onClick={() => {
                  if (viewingOrder.id.startsWith('MO-')) handleDeleteWorkOrder(viewingOrder.id);
                  else handleDeleteProcurementOrder(viewingOrder.id);
                }}
                className="px-4 py-2 bg-red-600/10 border border-red-600/20 text-red-500 rounded text-sm font-medium hover:bg-red-600 hover:text-white-fixed transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete {viewingOrder.id.startsWith('MO-') ? 'Order' : 'Request'}
              </button>
              <button 
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-surface-strong text-secondary rounded text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

const startIndex = code.indexOf('{/* View Order Modal */}');
const endIndex = code.indexOf('{/* Image Zoom Modal */}');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/pages/MaintenanceOrders.tsx', code);
  console.log("Successfully replaced View Order Modal");
} else {
  console.log("Could not find boundaries.");
}
