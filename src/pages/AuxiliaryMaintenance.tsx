import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { logAction } from '../utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { 
  Wrench, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  MoreVertical, Pencil, Trash2,
  Package,
  Calendar,
  X
} from 'lucide-react';

type WorkOrderItem = {
  dateCompleted?: string;
  id: string;
  name?: string;
  description: string;
  quantity: string;
  dateSent: string;
  state: string;
  images: string[];
  priority: string;
  lastChecked?: string;
};

type WorkOrder = {
  dateCompleted?: string;
  id: string;
  category?: string;
  
  // Base fields
  dateReported?: string;
  
  workDetails?: string;
  
  
  // Additional specialized fields
  machineSerialNo?: string; // For Dryers, Compressors, RO, UPS
         // For Generators
             // For Generators, Compressors
          // For Generators
  
  // Legacy fields (kept for backward compatibility or if needed)
  taskName?: string;
  issue?: string;
  priority?: string;
  status: string;
  reportedBy?: string;
  requestedBy?: string;
  assignedTo?: string;
  images?: string[];
  requestForms?: string[];
  machineId?: string;
  machineName?: string;
  items?: WorkOrderItem[];
};

type ProcurementOrder = {
  dateCompleted?: string;
  id: string;
  category?: string;
  taskName?: string;
  workOrderId?: string;
  machineId?: string;
  machineName?: string;
  status: string;
  requestForms?: string[];
  lastChecked?: string;
  requestedBy?: string;
  assignedTo?: string;
  dateReported?: string;
  items?: WorkOrderItem[];
};

const initialWorkOrders: WorkOrder[] = [];

const initialProcurementOrders: ProcurementOrder[] = [];

const handleImageUploadAsync = async (files: File[]): Promise<string[]> => {
  const validFiles = files.filter(f => f.size > 0);
  if (validFiles.length === 0) return [];
  return Promise.all(validFiles.map(file => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
};

const EQUIPMENT_NAMES: Record<string, string[]> = {
  DRYERS: [
    'DRYER DALGAKIRAN DK 140',
    'DRYER MIKROPOR MKE 1388'
  ],
  GENERATORS: [
    'GENERATOR CAT 1000 KVA -1',
    'GENERATOR CAT 2000 KVA -2',
    'GENERATOR CAT 2000 KVA -3',
    'GENERATOR PRIME 50 KVA'
  ],
  COMPRESSORS: [
    'COMPRESSOR INGERSOLL RAND -1',
    'COMPRESSOR INGERSOLL RAND -2',
    'COMPRESSOR INGERSOLL RAND -3',
    'COMPRESSOR ATLAS COPCO GA90VSD-4',
    'COMPRESSOR INGERSOLL RAND 132 KW -5',
    'COMPRESSOR ATLAS COPCO GA110VSD'
  ],
  CHILLERS: [
    'YORK 10 FAN 1',
    'YORK 12 FAN 2'
  ],
  RO: [
    'RO WATER'
  ],
  UPS: [
    'UPS 1',
    'UPS 2',
    'UPS 3',
    'UPS 4',
    'UPS 5'
  ]
};

const MaintenanceOrderEditor = ({ initialOrder, activeCategory, onSave, onCancel }: { initialOrder: WorkOrder | null, activeCategory: string, onSave: (doc: WorkOrder) => void, onCancel: () => void }) => {
  const [docId, setDocId] = useState(initialOrder?.id || `MO-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // New generalized fields
  const [dateReported, setDateReported] = useState(initialOrder?.dateReported || new Date().toISOString().split('T')[0]);
  
  const [workDetails, setWorkDetails] = useState(initialOrder?.workDetails || '');
  
  
  // Specific fields
  const [machineName, setMachineName] = useState(initialOrder?.machineName || (EQUIPMENT_NAMES[activeCategory] ? EQUIPMENT_NAMES[activeCategory][0] : ''));
  const [machineSerialNo, setMachineSerialNo] = useState(initialOrder?.machineSerialNo || '');
  
  
  

  const handleSave = () => {
    onSave({
      ...initialOrder,
      id: docId,
      status: 'Active',
      category: activeCategory,
      dateReported,
      
      workDetails,
      
      machineName,
      machineSerialNo
    });
  };

  return (
    <div className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/50">
        <h3 className="text-lg font-bold text-primary-muted flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" /> {initialOrder ? "Edit Entry" : "New Entry"}
        </h3>
        <button type="button" onClick={onCancel} className="text-quaternary hover:text-muted transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto space-y-4">
        
        {EQUIPMENT_NAMES[activeCategory] && EQUIPMENT_NAMES[activeCategory].length > 0 ? (
          <div className="space-y-1 block">
            <label className="text-xs font-semibold text-secondary">Equipment Name</label>
            <select value={machineName} onChange={e => setMachineName(e.target.value)} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              {EQUIPMENT_NAMES[activeCategory].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1 block">
            <label className="text-xs font-semibold text-secondary">Task / Subject Name</label>
            <input type="text" value={machineName} onChange={e => setMachineName(e.target.value)} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="E.g., Phone call, General checkup..." />
          </div>
        )}

        <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Date</label>
            <input type="date" value={dateReported} onChange={e => setDateReported(e.target.value)} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]" />
          </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-secondary">Work / Details</label>
          <textarea value={workDetails} onChange={e => setWorkDetails(e.target.value)} rows={3} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" />
        </div>

      </div>
      <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 bg-canvas/50">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-surface-strong text-secondary rounded-lg text-sm font-medium transition-colors cursor-pointer">Cancel</button>
        <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Save Entry</button>
      </div>
    </div>
  );
};

// @ts-ignore
const ProcurementOrderEditor = ({ initialOrder, onSave, onCancel, workOrders = [] }: any) => {
  const [docId, setDocId] = useState(initialOrder?.id || `PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [status, setStatus] = useState(initialOrder?.status || 'Active');
  const [requestedBy, setRequestedBy] = useState(initialOrder?.requestedBy || '');
  const [assignedTo, setAssignedTo] = useState(initialOrder?.assignedTo || '');
  const [dateReported, setDateReported] = useState(initialOrder?.dateReported || new Date().toISOString().split('T')[0]);
  const [workOrderId, setWorkOrderId] = useState(initialOrder?.workOrderId || '');
  
  const [items, setItems] = useState<WorkOrderItem[]>(initialOrder?.items || (initialOrder ? [] : [{ id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: '', description: '', quantity: '1', dateSent: new Date().toISOString().split('T')[0], state: 'Pending', images: [], priority: 'Low' }]));
  const [isDraggingForm, setIsDraggingForm] = useState(false);
  const [requestForms, setRequestForms] = useState<string[]>(initialOrder?.requestForms || []);

  const handleRequestFormsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target.files as unknown as File[]) || []);
    const base64s = await handleImageUploadAsync(files);
    if (base64s.length > 0) {
      setRequestForms([...requestForms, ...base64s]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingForm(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingForm(false);
  };

  const handleDropForm = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingForm(false);
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    const base64s = await handleImageUploadAsync(files);
    if (base64s.length > 0) {
      setRequestForms([...requestForms, ...base64s]);
    }
  };

  const removeRequestForm = (index: number) => {
    setRequestForms(requestForms.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems([...items, { id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: '', description: '', quantity: '1', dateSent: new Date().toISOString().split('T')[0], state: 'Pending', images: [], priority: 'Low' }]);
  };

  const updateItem = (id: string, field: keyof WorkOrderItem, value: any) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value, lastChecked: new Date().toISOString() } : it));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleItemImages = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target.files as unknown as File[]) || []);
    const base64s = await handleImageUploadAsync(files);
    if (base64s.length > 0) {
      setItems(items.map(it => it.id === id ? { ...it, images: [...it.images, ...base64s] } : it));
    }
  };

  const removeItemImage = (itemId: string, imageIndex: number) => {
    setItems(items.map(it => it.id === itemId ? { ...it, images: it.images.filter((_, i) => i !== imageIndex) } : it));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const relatedWO = workOrders.find(wo => wo.id === workOrderId);
    onSave({
      id: docId,
      taskName: items.length > 0 ? items[0].name : 'Procurement Request',
      workOrderId: workOrderId || undefined,
      machineName: relatedWO ? relatedWO.machineName : '',
      status,
      requestedBy,
      assignedTo,
      dateReported,
      items,
      requestForms
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/50">
        <h3 className="text-lg font-bold text-primary-muted flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" /> {initialOrder ? "Edit Part Request" : "New Part Request"}
        </h3>
        <button type="button" onClick={onCancel} className="text-quaternary hover:text-muted transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Document Number (ID)</label>
            <input type="text" value={docId} onChange={e => setDocId(e.target.value)} required className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Related MO (Optional)</label>
            <select value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option value="">None</option>
              {workOrders.map((w) => (
                 <option key={w.id} value={w.id}>{w.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Requested By</label>
            <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} required className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Assigned To</label>
            <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Date</label>
            <input type="date" value={dateReported} onChange={e => setDateReported(e.target.value)} required className="w-full px-4 py-2 bg-canvas border border-divider rounded-lg text-sm text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]" />
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-primary">Order Items</h4>
            <button type="button" onClick={handleAddItem} className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="p-3 border border-surface-elevated rounded-lg bg-canvas/30 space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="text-xs font-semibold text-quaternary uppercase tracking-wider">Item {idx + 1}</h5>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-quaternary hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-3 mb-3">
                  <div className="col-span-12 md:col-span-8 space-y-1">
                    <label className="text-[10px] text-muted">Item Name</label>
                    <input type="text" value={item.name || ''} onChange={e => updateItem(item.id, 'name', e.target.value)} required className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Conveyor Drive Motor" />
                  </div>
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <label className="text-[10px] text-muted">State</label>
                    <select value={item.state} onChange={e => updateItem(item.id, 'state', e.target.value)} className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-8 space-y-1">
                    <label className="text-[10px] text-muted">Description</label>
                    <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <label className="text-[10px] text-muted">Quantity</label>
                    <input type="text" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} required className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-6 md:col-span-4 space-y-1">
                    <label className="text-[10px] text-muted">Date Sent</label>
                    <input type="date" value={item.dateSent} onChange={e => updateItem(item.id, 'dateSent', e.target.value)} className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]" />
                  </div>
                  <div className="col-span-6 md:col-span-4 space-y-1">
                    <label className="text-[10px] text-muted">Priority</label>
                    <select value={item.priority} onChange={e => updateItem(item.id, 'priority', e.target.value)} className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <label className="text-[10px] text-muted flex justify-between">Images</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center justify-center px-2 py-1 bg-surface-elevated hover:bg-surface-strong border border-divider-subtle rounded-lg cursor-pointer transition-colors text-[10px] text-secondary font-medium w-full">
                        Choose Files
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleItemImages(item.id, e)} />
                      </label>
                      <span className="text-[10px] text-quaternary text-nowrap">{item.images.length === 0 ? 'No file chosen' : `${item.images.length} file${item.images.length>1?'s':''}`}</span>
                    </div>
                  </div>
                </div>
                {item.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-divider-subtle">
                    {item.images.map((img, i) => (
                      <div key={i} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-divider">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeItemImage(item.id, i)} className="absolute inset-0 bg-red-500/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
      <div className="px-6 py-4 border-t border-divider flex flex-wrap lg:flex-nowrap justify-between gap-3 bg-canvas/50">
        <div className="w-full lg:w-auto">
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropForm}
            className={`flex flex-col items-center justify-center gap-1.5 px-6 py-4 bg-surface hover:bg-surface-elevated border-2 border-dashed ${isDraggingForm ? 'border-blue-500 bg-blue-500/10' : 'border-surface-strong'} text-blue-400 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full text-center`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Drag & drop Quotes/Invoices here</span>
            </div>
            <span className="text-[10px] text-muted font-normal">or click to browse (PDF/Images)</span>
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleRequestFormsUpload} />
          </label>
          {requestForms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {requestForms.map((form, idx) => (
                <div key={idx} className="relative group w-10 h-10 rounded-lg border border-divider overflow-hidden">
                  {form.startsWith('data:application/pdf') ? (
                    <div className="w-full h-full flex items-center justify-center bg-surface-elevated text-blue-400 text-[10px] font-bold">PDF</div>
                  ) : (
                    <img src={form} alt={`Form ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button type="button" onClick={() => removeRequestForm(idx)} className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 items-end self-end w-full lg:w-auto justify-center">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-surface-strong text-secondary rounded-lg text-sm font-medium transition-colors cursor-pointer">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white-fixed rounded-lg text-sm font-medium transition-colors cursor-pointer">
            {initialOrder ? "Save Changes" : "Create PO"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default function AuxiliaryMaintenance() {
  const isViewer = false;
  const [activeCategory, setActiveCategory] = useState<'GENERATORS' | 'COMPRESSORS' | 'DRYERS' | 'CHILLERS' | 'RO' | 'UPS' | 'OTHER'>('GENERATORS');
  const [workOrders, setWorkOrders] = useLocalStorage<WorkOrder[]>('aux_work_orders', initialWorkOrders);
  const [procurementOrders, setProcurementOrders] = useLocalStorage<ProcurementOrder[]>('aux_procurement_orders', initialProcurementOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | ProcurementOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | ProcurementOrder | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [moViewStatus, setMoViewStatus] = useState<'Active' | 'Finished'>('Active');

  const [trash, setTrash] = useLocalStorage<any[]>('trash_data', []);

  const handleDeleteWorkOrder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const order = workOrders.find(wo => wo.id === id);
    if (!order) return;

    if (confirm(`Move maintenance order ${id} to trash?`)) {
      const trashItem = {
        id: order.id,
        type: 'maint_order',
        name: order.taskName,
        data: order,
        deletedAt: new Date().toISOString()
      };
      setTrash(prev => [...prev, trashItem]);
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      logAction('Work Order Deleted', `Maintenance order ${order.id} was moved to trash. Removed: taskName: ${order.taskName}, issue: ${order.issue}, priority: ${order.priority}, status: ${order.status}`, 'warning');
      if (viewingOrder?.id === id) setViewingOrder(null);
    }
  };

  const handleDeleteProcurementOrder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const order = procurementOrders.find(po => po.id === id);
    if (!order) return;

    if (confirm(`Move procurement order ${id} to trash?`)) {
      const trashItem = {
        id: order.id,
        type: 'proc_order',
        name: order.taskName || 'Procurement Order',
        data: order,
        deletedAt: new Date().toISOString()
      };
      setTrash(prev => [...prev, trashItem]);
      setProcurementOrders(prev => prev.filter(po => po.id !== id));
      logAction('Procurement Order Deleted', `Procurement order ${order.id} was moved to trash. Removed: taskName: ${order.taskName}, status: ${order.status}`, 'warning');
      if (viewingOrder?.id === id) setViewingOrder(null);
    }
  };

  const handleCheckItem = (moId: string, itemId: string) => {
    const newDate = new Date().toISOString();
    setWorkOrders(workOrders.map((wo) => {
      if (wo.id === moId && wo.items) {
        return {
          ...wo,
          items: wo.items.map(it => it.id === itemId ? { ...it, lastChecked: newDate } : it)
        };
      }
      return wo;
    }));
    
    if (viewingOrder && viewingOrder.id === moId && 'items' in viewingOrder) {
      setViewingOrder({
        ...viewingOrder,
        items: viewingOrder.items?.map((it: any) => it.id === itemId ? { ...it, lastChecked: newDate } : it)
      } as WorkOrder);
    }
  };

  const handleCheckPO = (poId: string) => {
    const newDate = new Date().toISOString();
    setProcurementOrders(procurementOrders.map(po => {
      if (po.id === poId) {
        return { ...po, lastChecked: newDate };
      }
      return po;
    }));
    
    if (viewingOrder && viewingOrder.id === poId) {
      setViewingOrder({
        ...viewingOrder,
        lastChecked: newDate
      } as ProcurementOrder);
    }
  };

  const handleSaveMO = (doc: WorkOrder) => {
    if ((doc.status === 'Completed' || doc.status === 'Finished') && !doc.dateCompleted) {
      doc.dateCompleted = new Date().toISOString();
    } else if (doc.status !== 'Completed' && doc.status !== 'Finished') {
      doc.dateCompleted = undefined;
    }
    const docWithCategory = { ...doc, category: doc.category || activeCategory };
    if (editingOrder) {
      logAction('Work Order Updated', `Maintenance order ${docWithCategory.id} was updated.`, 'info');
      setWorkOrders(workOrders.map(wo => wo.id === editingOrder.id ? docWithCategory : wo));
    } else {
      logAction('Work Order Created', `Maintenance order ${docWithCategory.id} was created.`, 'success');
      setWorkOrders([docWithCategory, ...workOrders]);
    }
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };

  const handleSavePO = (updatedPO: any) => {
    if ((updatedPO.status === 'Completed' || updatedPO.status === 'Finished') && !updatedPO.dateCompleted) {
      updatedPO.dateCompleted = new Date().toISOString();
    } else if (updatedPO.status !== 'Completed' && updatedPO.status !== 'Finished') {
      updatedPO.dateCompleted = undefined;
    }
    const poWithCategory = { ...updatedPO, category: updatedPO.category || activeCategory };
    if (editingOrder) {
      const changes = Object.keys(poWithCategory).filter(k => {
        const oldVal = (editingOrder as any)[k];
        const newVal = poWithCategory[k];
        if (typeof oldVal === 'object' || typeof newVal === 'object') return false;
        return oldVal !== newVal;
      });
      const changeDetails = changes.map(k => `${k}: ${(editingOrder as any)[k]} -> ${poWithCategory[k]}`).join(', ');
      logAction('Procurement Order Updated', `Procurement order ${editingOrder.id} was updated.${changeDetails ? ` Changes: ${changeDetails}` : ''}`, 'info');
      setProcurementOrders(procurementOrders.map(po => po.id === editingOrder.id ? poWithCategory as ProcurementOrder : po));
    } else {
      const detailsArray = Object.entries(poWithCategory).filter(([k,v]) => v !== undefined && k !== 'id').map(([k,v]) => `${k}: ${v}`).join(', ');
      logAction('Procurement Order Created', `Procurement order ${poWithCategory.id} was created. Added: ${detailsArray}`, 'success');
      setProcurementOrders([poWithCategory as ProcurementOrder, ...procurementOrders]);
    }
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-muted bg-surface-elevated border-surface-strong';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered': return 'text-emerald-500';
      case 'In Progress':
      case 'In Transit': return 'text-blue-500';
      case 'Waiting for Parts':
      case 'Ordered': return 'text-amber-500';
      case 'Requested':
      case 'Open': return 'text-red-500';
      default: return 'text-muted';
    }
  };

  
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(activeCategory);

    const columns = [
      { header: 'CATEGORY', key: 'category', width: 20 },
      { header: 'EQUIPMENT / SUBJECT NAME', key: 'machineName', width: 40 },
      { header: 'DATE', key: 'dateReported', width: 15 },
      { header: 'WORK / DETAILS', key: 'workDetails', width: 60 }
    ];

    worksheet.columns = columns;

    // Add big title row in row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'UTILITIES EQUIPMENT REPORT';
    titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002060' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      const text = cell.value?.toString().toUpperCase() || '';
      let argbStr = 'FF00B050';
      if (text.includes('WORK')) argbStr = 'FF00B0F0';

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbStr } };
    });

    const currentOrders = workOrders.filter(wo => (wo.category || 'GENERATORS') === activeCategory);
    const sortedOrders = [...currentOrders].sort((a, b) => {
      const dateA = a.dateReported || '';
      const dateB = b.dateReported || '';
      return dateB.localeCompare(dateA);
    });

    sortedOrders.forEach(wo => {
      const newRow = worksheet.addRow({
        category: wo.category || 'GENERATORS',
        machineName: wo.machineName || '-',
        dateReported: wo.dateReported || '-',
        workDetails: wo.workDetails || '-'
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCategory}_Utilities_Equipment_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const handleExportAll = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Utilities Equipment');

    const columns = [
      { header: 'CATEGORY', key: 'category', width: 20 },
      { header: 'EQUIPMENT / SUBJECT NAME', key: 'machineName', width: 40 },
      { header: 'DATE', key: 'dateReported', width: 15 },
      { header: 'WORK / DETAILS', key: 'workDetails', width: 60 }
    ];

    worksheet.columns = columns;

    // Add big title row in row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'UTILITIES EQUIPMENT REPORT';
    titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002060' } // Dark blue from image
    };

    // Header row is now row 2
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      const text = cell.value?.toString().toUpperCase() || '';
      let argbStr = 'FF00B050'; // Default Green for CATEGORY, EQUIPMENT, DATE
      if (text.includes('WORK')) {
        argbStr = 'FF00B0F0'; // Light Blue for WORK / DETAILS
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argbStr }
      };
    });

    // Populate all sorted by category, then date
    const categoryOrder = ['GENERATORS', 'COMPRESSORS', 'DRYERS', 'CHILLERS', 'RO', 'UPS', 'OTHER'];
    const sortedOrders = [...workOrders].sort((a, b) => {
      const catA = a.category || 'GENERATORS';
      const catB = b.category || 'GENERATORS';
      const catIdxA = categoryOrder.indexOf(catA);
      const catIdxB = categoryOrder.indexOf(catB);
      if (catIdxA !== catIdxB) return catIdxA - catIdxB;
      
      const dateA = a.dateReported || '';
      const dateB = b.dateReported || '';
      return dateB.localeCompare(dateA); // Newest first
    });

    sortedOrders.forEach(wo => {
      const newRow = worksheet.addRow({
        category: wo.category || 'GENERATORS',
        machineName: wo.machineName || '-',
        dateReported: wo.dateReported || '-',
        workDetails: wo.workDetails || '-'
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Utilities_Equipment_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-end border-b border-divider pb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Utilities Equipment</h2>
          <p className="mt-1 text-sm text-tertiary">
            Track the fixes and changes for utilities equipment.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-elevated disabled:opacity-50 rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors shadow-sm cursor-pointer" title="Export current tab with dedicated worksheets for each equipment model">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Export Tab Sheets
          </button>
          <button type="button" onClick={handleExportAll} className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-elevated disabled:opacity-50 rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors shadow-sm cursor-pointer" title="Export all categories in a single sheet including category and equipment columns">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Export All (One Sheet)
          </button>
          {!isViewer && (
            <button type="button" 
              onClick={() => setIsCreatingOrder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-lg text-xs font-medium text-white-fixed hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 
              New Entry
            </button>
          )}
        </div>
      </div>

      <div className="bg-canvas/50 rounded-lg shadow-sm border border-divider-subtle overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center border-b border-divider-subtle px-4 bg-surface/20 shrink-0 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {(['GENERATORS', 'COMPRESSORS', 'DRYERS', 'CHILLERS', 'RO', 'UPS', 'OTHER'] as const).map((cat) => (
              <button type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeCategory === cat
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <div className="relative w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
              <input 
                type="text" 
                placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-canvas border border-divider rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-secondary placeholder:text-quinary"
            />
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface/30">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface/80 backdrop-blur-md z-10 shadow-sm">
                <tr className="border-b border-divider text-[11px] uppercase tracking-widest text-quaternary">
                  <th className="text-center px-6 py-4 font-semibold">Date</th>
                  <th className="text-center px-6 py-4 font-semibold">Equipment Name</th>
                  
                  <th className="text-center px-6 py-4 font-semibold">Work / Details</th>
                  <th className="text-center px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {workOrders
                  .filter(wo => (wo.category || 'GENERATORS') === activeCategory)
                  .filter(wo => (wo.machineName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (wo.workDetails || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((wo) => (
                  <tr key={wo.id} className="hover:bg-surface/50 transition-colors group cursor-pointer" onClick={() => setViewingOrder(wo)}>
                    <td className="text-center px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {wo.dateReported ? wo.dateReported : '-'}
                    </td>
                    <td className="text-center px-6 py-4 text-sm text-primary font-semibold truncate max-w-[150px]">
                      {wo.machineName || '-'}
                    </td>
                    
                    <td className="text-center px-6 py-4 text-sm text-muted max-w-xs truncate">
                      {wo.workDetails || '-'}
                    </td>
                    
                    
                    
                    

                    
                    <td className="text-center px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center gap-1">
                        <button type="button" 
                          onClick={(e) => { e.stopPropagation(); setEditingOrder(wo); }}
                          className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-elevated"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" 
                          onClick={(e) => handleDeleteWorkOrder(wo.id, e)}
                          className="text-tertiary hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* New/Edit Order Modal */}
      {(isCreatingOrder || editingOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}></div>
          <MaintenanceOrderEditor initialOrder={(editingOrder as WorkOrder) || null} activeCategory={activeCategory} onSave={handleSaveMO} onCancel={() => { setIsCreatingOrder(false); setEditingOrder(null); }} />
        </div>
      )}

      
      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setViewingOrder(null)}></div>
          <div className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/50">
              <h3 className="text-lg font-bold text-primary-muted flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" /> Maintenance Entry Details
              </h3>
              <button type="button" 
                onClick={() => setViewingOrder(null)}
                className="text-quaternary hover:text-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-4 gap-4 flex-wrap">
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Date Reported</span>
                  <span className="text-sm text-secondary">{viewingOrder.dateReported || '-'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Equipment Name</span>
                  <span className="text-sm text-primary font-medium">{viewingOrder.machineName || '-'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Action By</span>
                  <span className="text-sm text-secondary">{viewingOrder.actionBy || viewingOrder.assignedTo || '-'}</span>
                </div>
                {viewingOrder.category && (
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Category</span>
                    <span className="text-sm text-secondary">{viewingOrder.category}</span>
                  </div>
                )}
              </div>

              

              <div className="grid gap-1">
                <span className="text-xs font-semibold text-quaternary">Work / Details</span>
                <span className="text-sm text-secondary bg-surface-elevated/50 p-3 rounded-lg min-h-[4rem] whitespace-pre-wrap">{viewingOrder.workDetails || '-'}</span>
              </div>

              {(viewingOrder.category === 'GENERATORS') && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Type</span>
                    <span className="text-sm text-secondary font-medium">{viewingOrder.typeField || '-'}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Hours</span>
                    <span className="text-sm text-secondary font-medium">{viewingOrder.hours || '-'}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Extra Oil (Lt)</span>
                    <span className="text-sm text-secondary font-medium">{viewingOrder.extraOil || '-'}</span>
                  </div>
                </div>
              )}

              {(viewingOrder.category === 'COMPRESSORS') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Hours</span>
                    <span className="text-sm text-secondary font-medium">{viewingOrder.hours || '-'}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold text-quaternary">Machine Serial No</span>
                    <span className="text-sm text-secondary font-medium">{viewingOrder.machineSerialNo || '-'}</span>
                  </div>
                </div>
              )}

              {(viewingOrder.category === 'DRYERS' || viewingOrder.category === 'CHILLERS' || viewingOrder.category === 'RO' || viewingOrder.category === 'UPS') && (
                <div className="grid gap-1">
                  <span className="text-xs font-semibold text-quaternary">Machine Serial No</span>
                  <span className="text-sm text-secondary font-medium">{viewingOrder.machineSerialNo || '-'}</span>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-divider flex justify-between gap-3 bg-canvas/50">
              <button type="button" 
                onClick={() => handleDeleteWorkOrder(viewingOrder.id)}
                className="px-4 py-2 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white-fixed transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Entry
              </button>
              <button type="button" 
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-surface-strong text-secondary rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
{/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-canvas/90 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" 
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute -top-12 right-0 md:-right-12 text-secondary hover:text-primary bg-surface/50 hover:bg-surface p-2 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={5}
              centerOnInit
            >
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%', maxHeight: '90vh' }}>
                <img src={zoomedImage} alt="Zoomed View" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
