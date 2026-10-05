import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { LogEntry, logAction } from '../utils/logger';
import { 
  Trash2, 
  RotateCcw, 
  Trash, 
  AlertCircle,
  Clock,
  Search,
  Users,
  Briefcase,
  Wrench,
  Package,
  MessageSquareWarning,
  Factory,
  Eye,
  X,
  FileJson,
  Calendar,
  Activity
} from 'lucide-react';

type TrashItem = {
  id: string;
  type: 'worker' | 'prod_order' | 'maint_order' | 'proc_order' | 'complaint' | 'machine';
  name: string;
  data: any;
  deletedAt: string;
};

export default function SystemArchive() {
  const [activeTab, setActiveTab] = useState<'Trash' | 'Logs'>('Trash');
  const { user } = useAuth();
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];
  const isReadOnly = currentRole?.permissions?.archive_readonly === true;
  const [trash, setTrash] = useLocalStorage<TrashItem[]>('trash_data', []);
  const [systemLogs, setSystemLogs] = useLocalStorage<LogEntry[]>('system_logs_data', []);
  
  const [workers, setWorkers] = useLocalStorage<any[]>('workers_data', []);
  const [productionOrders, setProductionOrders] = useLocalStorage<any[]>('production_orders_v11', []);
  const [workOrders, setWorkOrders] = useLocalStorage<any[]>('maintenance_work_orders', []);
  const [procurementOrders, setProcurementOrders] = useLocalStorage<any[]>('maintenance_procurement_orders', []);
  const [complaints, setComplaints] = useLocalStorage<any[]>('production_complaints', []);
  const [machines, setMachines] = useLocalStorage<any[]>('machines_data_v2', []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<TrashItem | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'worker': return <Users className="w-4 h-4 text-emerald-500" />;
      case 'prod_order': return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'maint_order': return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'proc_order': return <Package className="w-4 h-4 text-purple-500" />;
      case 'complaint': return <MessageSquareWarning className="w-4 h-4 text-red-500" />;
      case 'machine': return <Factory className="w-4 h-4 text-indigo-500" />;
      default: return <Trash2 className="w-4 h-4 text-tertiary" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'worker': return 'Worker';
      case 'prod_order': return 'Production Order';
      case 'maint_order': return 'Maintenance Order';
      case 'proc_order': return 'Procurement Order';
      case 'complaint': return 'Complaint';
      case 'machine': return 'Machine';
      default: return 'Unknown';
    }
  };

  const handleRestore = (item: TrashItem) => {
    const confirmRestore = confirm(`Restore ${item.name} (${item.id}) to its original location?`);
    if (!confirmRestore) return;

    switch (item.type) {
      case 'worker':
        setWorkers(prev => [...prev, item.data]);
        break;
      case 'prod_order':
        setProductionOrders(prev => [...prev, item.data]);
        break;
      case 'maint_order':
        setWorkOrders(prev => [...prev, item.data]);
        break;
      case 'proc_order':
        setProcurementOrders(prev => [...prev, item.data]);
        break;
      case 'complaint':
        setComplaints(prev => [...prev, item.data]);
        break;
      case 'machine':
        setMachines(prev => [...prev, item.data]);
        break;
    }

    setTrash(prev => prev.filter(t => t.id !== item.id || t.type !== item.type));
    logAction('Item Restored', `Restored ${item.name} (${item.id}) from Archive.`, 'info');
    setPreviewItem(null);
  };

  const handlePermanentDelete = (item: TrashItem) => {
    const confirmDelete = confirm(`Permanently delete ${item.name}? This cannot be undone.`);
    if (!confirmDelete) return;

    setTrash(prev => prev.filter(t => t.id !== item.id || t.type !== item.type));
    logAction('Item Permanently Deleted', `Permanently deleted ${item.name} (${item.id}).`, 'warning');
  };

  const getExpiryDays = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingDays = 30 - diffDays;
    return remainingDays > 0 ? remainingDays : 0;
  };

  const filteredTrash = trash.filter(item => {
    const sq = (searchQuery || '').toLowerCase();
    const name = (item?.name || '').toLowerCase();
    const id = (item?.id || '').toLowerCase();
    const type = (item?.type || '').toLowerCase();
    return name.includes(sq) || id.includes(sq) || type.includes(sq);
  }).sort((a, b) => new Date(b?.deletedAt || 0).getTime() - new Date(a?.deletedAt || 0).getTime());

  const filteredLogs = systemLogs.filter(log => {
    const sq = (searchQuery || '').toLowerCase();
    const action = (log?.action || '').toLowerCase();
    const details = (log?.details || '').toLowerCase();
    return action.includes(sq) || details.includes(sq);
  });

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-end border-b border-divider pb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Trash className="w-6 h-6 text-tertiary" /> System Archive
          </h2>
          <p className="mt-2 text-sm text-tertiary">
            System activity logs and deleted records.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-surface-elevated rounded-lg p-1 border border-divider">
            <button type="button"
              onClick={() => setActiveTab('Trash')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'Trash' ? 'bg-canvas text-primary shadow-sm border border-divider-subtle' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Recycle Bin
            </button>
            <button type="button"
              onClick={() => setActiveTab('Logs')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'Logs' ? 'bg-canvas text-primary shadow-sm border border-divider-subtle' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Activity Logs
            </button>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-canvas border border-divider rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-secondary placeholder:text-quinary"
            />
          </div>
        </div>
      </div>

      <div className="bg-canvas/50 rounded-lg shadow-sm border border-divider-subtle overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto bg-surface/30">
          {activeTab === 'Trash' ? (
            filteredTrash.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-tertiary px-6">
                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-divider-strong" />
                </div>
                <h3 className="text-lg font-medium text-primary">Trash is empty</h3>
                <p className="text-sm mt-1">Deleted items will appear here for 30 days.</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface/80 backdrop-blur-md z-10 shadow-sm">
                <tr className="border-b border-divider text-[11px] uppercase tracking-widest text-quaternary">
                  <th className="text-center px-6 py-4 font-semibold">Item Name / ID</th>
                  <th className="text-center px-6 py-4 font-semibold">Type</th>
                  <th className="text-center px-6 py-4 font-semibold">Deleted On</th>
                  <th className="text-center px-6 py-4 font-semibold">Expires In</th>
                  <th className="text-center px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-subtle">
                {filteredTrash.map((item, idx) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-surface/50 transition-colors group">
                    <td className="text-center px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center border border-divider-subtle">
                          {getIcon(item.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-primary">{item.name}</div>
                          <div className="text-[10px] text-tertiary font-normal shrink-0">{item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-6 py-4 whitespace-nowrap text-xs text-secondary">
                      {getTypeText(item.type)}
                    </td>
                    <td className="text-center px-6 py-4 whitespace-nowrap text-xs text-muted">
                      {new Date(item.deletedAt).toLocaleDateString()}
                    </td>
                    <td className="text-center px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-orange-500">
                        <Clock className="w-3 h-3" />
                        {getExpiryDays(item.deletedAt)} days
                      </div>
                    </td>
                    <td className="text-center px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex justify-end gap-2">
                        <button type="button" 
                          onClick={() => setPreviewItem(item)}
                          className="flex items-center gap-1 px-2 py-1 bg-surface-elevated hover:bg-blue-500/10 text-tertiary hover:text-blue-500 border border-surface-strong rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        <button type="button" 
                          onClick={() => handleRestore(item)}
                          className="flex items-center gap-1 px-2 py-1 bg-surface-elevated hover:bg-emerald-500/10 text-tertiary hover:text-emerald-500 border border-surface-strong rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button type="button" 
                          onClick={() => handlePermanentDelete(item)}
                          className="flex items-center gap-1 px-2 py-1 bg-surface-elevated hover:bg-red-500/10 text-tertiary hover:text-red-500 border border-surface-strong rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )
          ) : (
            filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-tertiary px-6">
                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-divider-strong" />
                </div>
                <h3 className="text-lg font-medium text-primary">No activity logs</h3>
                <p className="text-sm mt-1">Actions performed in the system will appear here.</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-surface/80 backdrop-blur-md z-10 shadow-sm">
                  <tr className="border-b border-divider text-[11px] uppercase tracking-widest text-quaternary">
                    <th className="text-center px-6 py-4 font-semibold">Timestamp</th>
                    <th className="text-center px-6 py-4 font-semibold">User</th>
                    <th className="text-center px-6 py-4 font-semibold">Action</th>
                    <th className="text-center px-6 py-4 font-semibold w-full">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider-subtle">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 transition-colors group">
                      <td className="text-center px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap text-xs text-secondary font-medium">
                        {log.user || 'System'}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            log.type === 'success' ? 'bg-emerald-500' :
                            log.type === 'warning' ? 'bg-amber-500' :
                            log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-sm font-medium text-primary">{log.action}</span>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4 text-xs text-secondary leading-relaxed">
                        {(() => {
                          const details = log.details;
                          const keywords = ['Changes: ', 'Added: ', 'Removed: ', 'Reason: ', 'Details: '];
                          const foundKeyword = keywords.find(k => details.includes(k));
                          
                          if (foundKeyword) {
                            const parts = details.split(foundKeyword);
                            const mainText = parts[0];
                            const dataText = parts.slice(1).join(foundKeyword);
                            
                            return (
                              <div className="space-y-2">
                                <div>{mainText.trim()}</div>
                                <div className="flex flex-wrap gap-2">
                                  {foundKeyword === 'Reason: ' || foundKeyword === 'Details: ' ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-elevated border border-divider-subtle rounded-lg text-[10px] shadow-sm">
                                      <span className="text-secondary font-bold font-mono">{foundKeyword.replace(': ', '')}</span>
                                      <span className="text-primary truncate">{dataText}</span>
                                    </div>
                                  ) : (
                                    dataText.split(', ').map((change, idx) => {
                                      const changeParts = change.split(': ');
                                      if (changeParts.length < 2) return <span key={idx} className="px-2 py-1 bg-surface-elevated rounded-lg text-[10px]">{change}</span>;
                                      
                                      const field = changeParts[0];
                                      const values = changeParts.slice(1).join(': ').split(' -> ');
                                      
                                      return (
                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-surface-elevated border border-divider-subtle rounded-lg text-[10px] shadow-sm max-w-full">
                                          <span className="text-secondary font-bold font-mono shrink-0">{field}</span>
                                          {values.length === 2 ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="text-red-400 line-through truncate max-w-[150px]" title={values[0]}>{values[0] || 'empty'}</span>
                                              <span className="text-quaternary text-[8px] shrink-0">▶</span>
                                              <span className="text-emerald-400 font-medium truncate max-w-[150px]" title={values[1]}>{values[1] || 'empty'}</span>
                                            </div>
                                          ) : (
                                            <span className="text-primary truncate max-w-[200px]" title={values[0]}>{values[0]}</span>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          return details;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
        
        {activeTab === 'Trash' && (
          <div className="bg-canvas border-t border-divider px-6 py-4 flex items-center gap-3 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-[11px] text-tertiary">
              Items in the trash are automatically deleted forever after 30 days of being moved here.
            </p>
          </div>
        )}
      </div>

      {previewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-divider rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/30 shrink-0">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center border border-divider-subtle">
                  {getIcon(previewItem.type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">{previewItem.name}</h3>
                  <div className="text-xs text-tertiary font-mono">{getTypeText(previewItem.type)} • {previewItem.id}</div>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-2 hover:bg-surface-elevated rounded-full transition-colors text-tertiary hover:text-secondary focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-surface-elevated/10">
              {previewItem.type === 'worker' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-divider shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20 shrink-0">
                      <Users className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-primary leading-tight">{previewItem.data.name}</h4>
                      <p className="text-sm text-tertiary">{previewItem.data.jobTitle || previewItem.data.position} • Shift {previewItem.data.shift}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-surface-elevated rounded-lg text-[10px] font-bold uppercase text-quaternary border border-divider-subtle">ID: {previewItem.data.id}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${previewItem.data.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {previewItem.data.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-2 tracking-widest">Contact & Schedule</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Mobile</span>
                          <span className="text-secondary font-medium">{previewItem.data.mobile || previewItem.data.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Start Date</span>
                          <span className="text-secondary font-medium">{previewItem.data.startDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-2 tracking-widest">Stats & PPE</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Warnings</span>
                          <span className="text-orange-500 font-bold">{previewItem.data.alerts || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Absences</span>
                          <span className="text-blue-500 font-bold">{previewItem.data.absences || 0}</span>
                        </div>
                        {previewItem.data.ppe && (
                          <div className="flex justify-between text-xs border-t border-divider pt-1 mt-1">
                            <span className="text-tertiary">PPE Size</span>
                            <span className="text-secondary font-medium">{previewItem.data.ppe.shirt || '-'}/{previewItem.data.ppe.shoes || '-'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {previewItem.data.customData && Object.keys(previewItem.data.customData).length > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-3 tracking-widest">Additional Information</div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {Object.entries(previewItem.data.customData).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex justify-between border-b border-divider/30 pb-1 text-xs">
                            <span className="text-tertiary">{k}</span>
                            <span className="text-primary font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewItem.data.actionHistory && previewItem.data.actionHistory.length > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Complete Action History</div>
                      <div className="space-y-4">
                        {previewItem.data.actionHistory.map((action: any, i: number) => (
                          <div key={i} className="relative pl-4 border-l-2 border-divider pb-2">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-divider shadow-sm" />
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                                action.type.includes('Warning') ? 'bg-orange-500/10 text-orange-500' : 
                                action.type.includes('Termination') ? 'bg-red-500/10 text-red-500' :
                                'bg-blue-500/10 text-blue-500'
                              }`}>
                                {action.type}
                              </span>
                              <span className="text-[10px] text-quaternary font-mono">{action.date}</span>
                            </div>
                            <p className="text-xs text-secondary leading-relaxed mb-2">{action.reason}</p>
                            {action.photo && (
                              <img 
                                src={action.photo} 
                                alt="Action evidence" 
                                className="w-32 h-32 object-cover rounded-lg border border-divider-subtle mt-2 shadow-sm" 
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewItem.type === 'prod_order' && (
                <div className="space-y-6">
                  <div className="bg-surface p-6 rounded-2xl border border-divider shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-2xl font-black text-primary tracking-tight leading-none mb-1">{previewItem.data.itemName}</h4>
                          <p className="text-xs text-tertiary">Production Order • <span className="font-mono">{previewItem.data.id}</span></p>
                        </div>
                        <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                          previewItem.data.status === 'Completed' ? 'bg-emerald-500 text-white' :
                          previewItem.data.status === 'In Progress' ? 'bg-blue-500 text-white' :
                          previewItem.data.status === 'Cancelled' ? 'bg-red-500 text-white' : 'bg-surface-elevated text-tertiary'
                        }`}>
                          {previewItem.data.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-canvas/50 p-4 rounded-xl border border-divider-subtle text-center">
                          <div className="text-[10px] font-bold text-quaternary uppercase mb-1 tracking-wider">Plan</div>
                          <div className="text-xl font-bold text-primary">{previewItem.data.quantity} <span className="text-xs text-tertiary font-normal">{previewItem.data.unit}</span></div>
                        </div>
                        <div className="bg-canvas/50 p-4 rounded-xl border border-divider-subtle text-center">
                          <div className="text-[10px] font-bold text-quaternary uppercase mb-1 tracking-wider">Produced</div>
                          <div className="text-xl font-bold text-blue-500">{previewItem.data.completedQuantity || 0}</div>
                        </div>
                        <div className="bg-canvas/50 p-4 rounded-xl border border-divider-subtle text-center">
                          <div className="text-[10px] font-bold text-quaternary uppercase mb-1 tracking-wider">Remaining</div>
                          <div className="text-xl font-bold text-secondary">{(previewItem.data.quantity || 0) - (previewItem.data.completedQuantity || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider space-y-3">
                      <h5 className="text-[10px] font-bold text-quaternary uppercase tracking-widest pb-2 border-b border-divider">Order Specifications</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Material</span>
                          <span className="text-secondary font-medium">{previewItem.data.granulesType}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Colorant</span>
                          <span className="text-secondary font-medium">{previewItem.data.colorant || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Weight</span>
                          <span className="text-secondary font-medium">{previewItem.data.weight || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Client</span>
                          <span className="text-secondary font-medium">{previewItem.data.client || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider space-y-3">
                      <h5 className="text-[10px] font-bold text-quaternary uppercase tracking-widest pb-2 border-b border-divider">Production Details</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Machine</span>
                          <span className="text-blue-500 font-bold">{previewItem.data.assignedMachine || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Supervisor</span>
                          <span className="text-secondary font-medium">{previewItem.data.supervisor}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Deadline</span>
                          <span className="text-red-500 font-bold">{previewItem.data.endDate || previewItem.data.deadline}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tertiary">Priority</span>
                          <span className="px-2 py-0.5 bg-surface-elevated rounded-lg text-[10px] font-bold uppercase">{previewItem.data.priority || 'Medium'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-divider space-y-3">
                    <h5 className="text-[10px] font-bold text-quaternary uppercase tracking-widest">Packaging & Notes</h5>
                    <div className="p-3 bg-canvas/40 rounded-lg border border-divider-subtle">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Packaging Instructions</div>
                      <p className="text-xs text-secondary">{previewItem.data.packagingDetails}</p>
                    </div>
                    {previewItem.data.notes && (
                      <div className="p-3 bg-canvas/40 rounded-lg border border-divider-subtle">
                        <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Administrative Notes</div>
                        <p className="text-xs text-secondary">{previewItem.data.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {previewItem.type === 'maint_order' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black text-primary uppercase tracking-tight leading-none">{previewItem.data.taskName}</h4>
                      <p className="text-sm text-tertiary mt-1">Maintenance Order • #{previewItem.data.id}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                      previewItem.data.priority === 'Critical' ? 'bg-red-500 text-white' :
                      previewItem.data.priority === 'High' ? 'bg-orange-500 text-white' : 'bg-surface-elevated text-quaternary'
                    }`}>
                      {previewItem.data.priority} Priority
                    </div>
                  </div>

                  <div className="bg-surface p-5 rounded-xl border border-divider shadow-sm">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 border-b border-divider pb-2">Problem Statement</div>
                    <p className="text-sm text-secondary italic leading-relaxed py-2">
                      "{previewItem.data.issue || previewItem.data.description}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Asset Information</div>
                        <div className="text-sm font-bold text-primary">{previewItem.data.machineName}</div>
                        <div className="text-[10px] text-tertiary font-mono">{previewItem.data.machineId}</div>
                      </div>
                      <div className="pt-2 border-t border-divider/50">
                        <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Date Reported</div>
                        <div className="text-sm text-secondary">{previewItem.data.dateReported}</div>
                      </div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Assigned Personnel</div>
                        <div className="text-sm font-bold text-primary">{previewItem.data.assignedTo || 'Unassigned'}</div>
                        <div className="text-[10px] text-tertiary uppercase tracking-wider mt-0.5">Technician</div>
                      </div>
                      <div className="pt-2 border-t border-divider/50">
                        <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Current Status</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${previewItem.data.status === 'Completed' ? 'bg-emerald-500' : 'bg-orange-500 pulse-soft'}`} />
                          <span className="text-sm font-bold text-primary">{previewItem.data.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {previewItem.data.images && previewItem.data.images.length > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Maintenance Evidence (Images)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {previewItem.data.images.map((img: string, idx: number) => (
                          <img key={idx} src={img} alt={`Broken part ${idx + 1}`} className="rounded-xl border border-divider w-full h-40 object-cover shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewItem.type === 'proc_order' && (
                <div className="space-y-6">
                  <div className="bg-surface p-6 rounded-2xl border border-divider shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-2xl font-black text-primary tracking-tight leading-none mb-1">{previewItem.data.partName}</h4>
                          <p className="text-xs text-tertiary">Procurement Request • #{previewItem.data.id}</p>
                        </div>
                        <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                          previewItem.data.status === 'Delivered' ? 'bg-emerald-500 text-white' :
                          previewItem.data.status === 'Requested' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {previewItem.data.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-canvas/50 p-4 rounded-xl border border-divider-subtle">
                          <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Total Cost</div>
                          <div className="text-xl font-bold text-primary">${previewItem.data.cost?.toLocaleString()}</div>
                        </div>
                        <div className="bg-canvas/50 p-4 rounded-xl border border-divider-subtle">
                          <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Quantity</div>
                          <div className="text-xl font-bold text-primary">{previewItem.data.quantity} <span className="text-xs text-tertiary font-normal">units</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-2 tracking-widest">Supplier Info</div>
                      <div className="text-sm font-bold text-primary">{previewItem.data.supplier}</div>
                      <div className="text-[10px] text-tertiary mt-1">Primary Vendor</div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-2 tracking-widest">Timeline</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-tertiary" />
                        <span className="text-secondary font-medium">Expected {previewItem.data.expectedDelivery}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm">
                    <div className="text-[10px] font-bold text-quaternary uppercase mb-2 tracking-widest">Asset Context</div>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Factory className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary">{previewItem.data.machineName}</div>
                        <div className="text-[10px] text-tertiary">Target Machine • Ref #{previewItem.data.workOrderId || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewItem.type === 'complaint' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-divider pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 shrink-0">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-primary tracking-tight leading-none mb-1">{previewItem.data.title}</h4>
                      <p className="text-xs text-tertiary font-mono">Incident #{previewItem.data.id} • Filed on {previewItem.data.dateReported}</p>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                      previewItem.data.severity === 'High' ? 'bg-red-600 text-white' :
                      previewItem.data.severity === 'Medium' ? 'bg-orange-500 text-white' : 'bg-surface-elevated text-quinary'
                    }`}>
                      {previewItem.data.severity} Risk
                    </div>
                  </div>

                  <div className="bg-surface p-5 rounded-2xl border border-divider shadow-sm">
                    <div className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3">Incident Statement</div>
                    <p className="text-sm text-secondary leading-relaxed p-4 bg-canvas/30 rounded-xl border border-divider-subtle border-dashed italic">
                      "{previewItem.data.description}"
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Reporter</div>
                      <div className="text-sm font-bold text-primary truncate">{previewItem.data.reporter}</div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Area</div>
                      <div className="text-sm font-bold text-primary truncate">{previewItem.data.area || 'Factory Floor'}</div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Status</div>
                      <div className="text-sm font-bold text-blue-500 truncate">{previewItem.data.status}</div>
                    </div>
                  </div>

                  {previewItem.data.involvedWorkers && previewItem.data.involvedWorkers.length > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-divider">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-3 tracking-widest">Personnel Involved</div>
                      <div className="grid grid-cols-2 gap-2">
                        {previewItem.data.involvedWorkers.map((w: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-canvas/30 rounded-lg border border-divider-subtle">
                            <Users className="w-3.5 h-3.5 text-quaternary" />
                            <span className="text-xs font-medium text-secondary">{typeof w === 'string' ? w : w.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewItem.data.images && previewItem.data.images.length > 0 && (
                    <div className="bg-surface p-4 rounded-xl border border-divider">
                      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Attached Evidence</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {previewItem.data.images.map((img: string, idx: number) => (
                          <img key={idx} src={img} alt={`Evidence ${idx + 1}`} className="rounded-lg border border-divider w-full h-32 object-cover hover:scale-105 transition-transform" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewItem.type === 'machine' && (
                <div className="space-y-6">
                  <div className="bg-surface p-6 rounded-2xl border border-divider shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full -mr-20 -mt-20" />
                    <div className="relative flex items-center gap-6">
                      <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/20 shrink-0">
                        <Factory className="w-12 h-12 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-primary tracking-tight leading-none mb-1">{previewItem.data.name}</h4>
                        <p className="text-sm text-tertiary">Mold: <span className="text-secondary font-bold">{previewItem.data.mold || 'N/A'}</span></p>
                        <div className="flex gap-2 mt-3">
                          <span className="px-3 py-1 bg-surface-elevated rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-quaternary border border-divider-subtle">Machine Asset</span>
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest ${previewItem.data.status === 'Running' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {previewItem.data.status || 'Active'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm text-center">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Material</div>
                      <div className="text-sm font-bold text-primary truncate" title={previewItem.data.usedMaterial}>{previewItem.data.usedMaterial || '-'}</div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm text-center">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Filler</div>
                      <div className="text-sm font-bold text-primary truncate" title={previewItem.data.filler}>{previewItem.data.filler || '-'}</div>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-divider shadow-sm text-center">
                      <div className="text-[10px] font-bold text-quaternary uppercase mb-1">Location</div>
                      <div className="text-sm font-bold text-primary truncate">{previewItem.data.location || 'Section A'}</div>
                    </div>
                  </div>

                  <div className="bg-surface p-5 rounded-2xl border border-divider shadow-sm space-y-4">
                    <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-divider pb-2">Packaging Specifications</h5>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Plastic Bag Qty</span>
                        <span className="text-secondary font-bold">{previewItem.data.quantityInPlasticBag || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Carton Qty</span>
                        <span className="text-secondary font-bold">{previewItem.data.quantityInCarton || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Nylon (No Crate)</span>
                        <span className="text-secondary font-medium">{previewItem.data.usedNylonWithoutCrate || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Nylon (With Crate)</span>
                        <span className="text-secondary font-medium">{previewItem.data.usedNylonWithCrate || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Used Crate</span>
                        <span className="text-secondary font-medium italic">{previewItem.data.usedCrate || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary">Handle Type</span>
                        <span className="text-secondary font-medium">{previewItem.data.usedHandle || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-divider flex justify-between gap-3 bg-surface-elevated/30 shrink-0">
              <button type="button" 
                onClick={() => handlePermanentDelete(previewItem)}
                className="px-4 py-2 border border-red-600/20 bg-red-600/5 text-red-500 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white-fixed transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Forever
              </button>
              <button type="button" 
                onClick={() => handleRestore(previewItem)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restore Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
