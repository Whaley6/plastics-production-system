import React, { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Role, defaultRoles } from './Roles';
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
  Pencil, 
  Trash2,
  Package, 
  Calendar,
  X,
  Download,
  AlertTriangle,
  Eye,
  FileText,
  Upload,
  Check,
  CheckCheck,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export type WorkOrderItem = {
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

export type WorkOrder = {
  dateCompleted?: string;
  id: string;
  taskName?: string;
  issue?: string;
  priority?: string;
  status: string;
  reportedBy?: string;
  requestedBy?: string;
  assignedTo?: string;
  dateReported?: string;
  images?: string[];
  requestForms?: string[];
  machineId?: string;
  machineName?: string;
  items?: WorkOrderItem[];
};

export type ProcurementOrder = {
  dateCompleted?: string;
  id: string;
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

export const INITIAL_MAINTENANCE_WORK_ORDERS: WorkOrder[] = [
  { id: 'MO-1042', taskName: 'Fix Lathe Spindle', machineId: 'M-01', machineName: 'CNC Lathe Alpha', issue: 'Spindle vibration exceeds tolerance', priority: 'High', status: 'In Progress', reportedBy: 'J. Smith', assignedTo: 'M. Johnson', dateReported: '2026-04-26' },
  { id: 'WO-1043', taskName: 'Calibrate Welder', machineId: 'M-03', machineName: 'Robotic Welder 2', issue: 'Calibration error on axis C', priority: 'Medium', status: 'Open', reportedBy: 'T. Clark', dateReported: '2026-04-27' },
  { id: 'WO-1044', taskName: 'Repair Jammed Conveyor', machineId: 'M-05', machineName: 'Packaging Line A', issue: 'Conveyor belt jamming periodically', priority: 'Critical', status: 'Waiting for Parts', reportedBy: 'S. Lee', assignedTo: 'D. Miller', dateReported: '2026-04-25' },
  { id: 'WO-1045', taskName: 'Fix Fluid Leak', machineId: 'M-08', machineName: 'Injection Molder', issue: 'Hydraulic fluid leak', priority: 'High', status: 'Completed', reportedBy: 'R. Davis', assignedTo: 'M. Johnson', dateReported: '2026-04-24', dateCompleted: '2026-04-25T10:30:00Z' },
];

export const INITIAL_MAINTENANCE_PROCUREMENT_ORDERS: ProcurementOrder[] = [
  { id: 'PO-9021', taskName: 'Conveyor Drive Motor', workOrderId: 'WO-1044', machineName: 'Packaging Line A', status: 'Active', requestedBy: 'S. Lee', assignedTo: 'D. Miller', dateReported: '2026-04-25', items: [{ id: 'item-1', name: 'Conveyor Drive Motor', description: '', quantity: '1', dateSent: '2026-04-25', state: 'Pending', images: [], priority: 'High' }] },
  { id: 'PO-9022', taskName: 'Hydraulic Seals Kit', workOrderId: 'WO-1045', machineName: 'Injection Molder', status: 'Finished', requestedBy: 'R. Davis', assignedTo: 'M. Johnson', dateReported: '2026-04-24', items: [{ id: 'item-2', name: 'Hydraulic Seals Kit', description: '', quantity: '3', dateSent: '2026-04-24', state: 'Completed', images: [], priority: 'Medium', dateCompleted: '2026-04-25T14:20:00Z' }] },
  { id: 'PO-9023', taskName: 'Spindle Bearing ASM', workOrderId: 'MO-1042', machineName: 'CNC Lathe Alpha', status: 'Active', requestedBy: 'J. Smith', assignedTo: 'M. Johnson', dateReported: '2026-04-26', items: [{ id: 'item-3', name: 'Spindle Bearing ASM', description: '', quantity: '2', dateSent: '2026-04-26', state: 'Pending', images: [], priority: 'High' }] },
];

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

// Stopwatch / Elapsed Counter
const TimeElapsedCounter = ({ dateString, endDateString, isFinished }: { dateString?: string, endDateString?: string, isFinished?: boolean }) => {
  const [elapsed, setElapsed] = useState('-');

  useEffect(() => {
    if (!dateString) {
      setElapsed('-');
      return;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      setElapsed('-');
      return;
    }

    const updateTimer = () => {
      let diffMs = 0;
      if (endDateString) {
        diffMs = new Date(endDateString).getTime() - date.getTime();
      } else if (isFinished) {
        setElapsed('Finished');
        return;
      } else {
        diffMs = Date.now() - date.getTime();
      }
      if (diffMs < 0) diffMs = 0;
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const seconds = totalSeconds % 60;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const minutes = totalMinutes % 60;
      const totalHours = Math.floor(totalMinutes / 60);
      const hours = totalHours % 24;
      const days = Math.floor(totalHours / 24);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${String(hours).padStart(2, '0')}h`);
      parts.push(`${String(minutes).padStart(2, '0')}m`);
      parts.push(`${String(seconds).padStart(2, '0')}s`);
      setElapsed(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [dateString, endDateString, isFinished]);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono tracking-wider tabular-nums px-2.5 py-1 rounded-lg bg-surface-elevated/70 border border-divider-subtle text-secondary text-xs">
      <Clock className="w-3 h-3 text-tertiary" />
      {elapsed}
    </span>
  );
};

// Form Editor for Maintenance Work Order
const MaintenanceOrderEditor = ({ 
  initialOrder, 
  machinesList,
  onSave, 
  onCancel 
}: { 
  initialOrder: WorkOrder | null, 
  machinesList: any[],
  onSave: (doc: WorkOrder) => void, 
  onCancel: () => void 
}) => {
  const [docId, setDocId] = useState(initialOrder?.id || `MO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [taskName, setTaskName] = useState(initialOrder?.taskName || '');
  const [machineName, setMachineName] = useState(initialOrder?.machineName || '');
  const [issue, setIssue] = useState(initialOrder?.issue || '');
  const [priority, setPriority] = useState(initialOrder?.priority || 'Medium');
  const [status, setStatus] = useState(initialOrder?.status || 'Active');
  const [requestedBy, setRequestedBy] = useState(initialOrder?.requestedBy || initialOrder?.reportedBy || '');
  const [assignedTo, setAssignedTo] = useState(initialOrder?.assignedTo || '');
  const [dateReported, setDateReported] = useState(initialOrder?.dateReported || new Date().toISOString());
  const [items, setItems] = useState<WorkOrderItem[]>(initialOrder?.items || (initialOrder ? [] : [{ 
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
    name: '', 
    description: '', 
    quantity: '1', 
    dateSent: new Date().toISOString(), 
    state: 'Pending', 
    images: [], 
    priority: 'Medium' 
  }]));
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
    setItems([...items, { 
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
      name: '', 
      description: '', 
      quantity: '1', 
      dateSent: new Date().toISOString().split('T')[0], 
      state: 'Pending', 
      images: [], 
      priority: 'Medium' 
    }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...initialOrder,
      id: docId.trim(),
      taskName: taskName.trim() || (items.length > 0 ? items[0].name : 'Maintenance Intervention'),
      machineName: machineName.trim(),
      issue: issue.trim(),
      priority,
      status,
      requestedBy: requestedBy.trim(),
      assignedTo: assignedTo.trim(),
      dateReported,
      items,
      requestForms
    });
  };

  return (
    <div className="relative bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">
              {initialOrder ? "Edit Maintenance Order" : "New Maintenance Work Order"}
            </h3>
            <p className="text-xs text-tertiary">Log breakdown details, dispatch technician, and add parts items</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-elevated cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
        
        {/* Core Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)} 
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition"
            >
              <option value="Active">Active (In Progress)</option>
              <option value="Open">Open</option>
              <option value="Waiting for Parts">Waiting for Parts</option>
              <option value="Finished">Finished / Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Priority</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value)} 
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition font-medium"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Breakdown</option>
            </select>
          </div>
        </div>

        {/* Task Name & Machine Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Task / Intervention Name</label>
            <input 
              type="text" 
              value={taskName} 
              onChange={e => setTaskName(e.target.value)} 
              placeholder="e.g. Replace Lathe Spindle Bearing"
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Affected Machine</label>
            <div className="relative">
              <input 
                type="text" 
                list="machines-list-suggestions"
                value={machineName} 
                onChange={e => setMachineName(e.target.value)} 
                placeholder="e.g. Injection Molder #04"
                className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60" 
              />
              <datalist id="machines-list-suggestions">
                {machinesList.map((m: any, i: number) => (
                  <option key={i} value={m.name || m.code || `Machine ${i+1}`} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div>
          <label className="block text-xs font-semibold text-secondary mb-1.5">Fault Description & Diagnostic Notes</label>
          <textarea 
            rows={2}
            value={issue} 
            onChange={e => setIssue(e.target.value)} 
            placeholder="Describe the breakdown, error code, symptoms, or preventive maintenance checklist..."
            className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60 resize-none" 
          />
        </div>

        {/* Personnel & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Reported By</label>
            <input 
              type="text" 
              value={requestedBy} 
              onChange={e => setRequestedBy(e.target.value)} 
              placeholder="Operator / Reporter"
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Date Reported</label>
            <input 
              type="date" 
              value={dateReported ? dateReported.split('T')[0] : ''} 
              onChange={e => {
                const selectedDate = e.target.value;
                if (!selectedDate) return;
                const now = new Date();
                const [year, month, day] = selectedDate.split('-').map(Number);
                const updatedDate = new Date(now);
                updatedDate.setFullYear(year, month - 1, day);
                setDateReported(updatedDate.toISOString());
              }} 
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition dark:[color-scheme:dark]" 
            />
          </div>
        </div>

        {/* Dynamic Items & Action Checklist */}
        <div className="pt-2 border-t border-divider/60">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Repair Items & Checklist Tasks
              </h4>
              <p className="text-[11px] text-tertiary">Track specific parts, procedures, or stages</p>
            </div>
            <button 
              type="button" 
              onClick={handleAddItem} 
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="p-3.5 border border-divider rounded-xl bg-canvas/40 space-y-3 relative group">
                <div className="flex justify-between items-center pb-2 border-b border-divider/40">
                  <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">
                    Item #{idx + 1}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => removeItem(item.id)} 
                    className="text-tertiary hover:text-rose-400 p-1 rounded-lg transition cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-7">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Item / Task Name</label>
                    <input 
                      type="text" 
                      value={item.name || ''} 
                      onChange={e => updateItem(item.id, 'name', e.target.value)} 
                      placeholder="e.g. Inspect Drive Belt & Pulley" 
                      className="w-full px-2.5 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition" 
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">State</label>
                    <select 
                      value={item.state} 
                      onChange={e => updateItem(item.id, 'state', e.target.value)} 
                      className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition font-medium"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Qty</label>
                    <input 
                      type="text" 
                      value={item.quantity} 
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)} 
                      className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition text-center font-medium" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-8">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Technical Notes / Specs</label>
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value)} 
                      placeholder="e.g. Check tension and inspect for tooth shear" 
                      className="w-full px-2.5 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition" 
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Attached Photos</label>
                    <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-surface hover:bg-surface-elevated border border-divider rounded-lg cursor-pointer transition text-[11px] text-secondary font-medium w-full">
                      <Upload className="w-3 h-3 text-blue-400" />
                      <span>{item.images.length === 0 ? 'Upload Photos' : `${item.images.length} photo${item.images.length>1?'s':''}`}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleItemImages(item.id, e)} />
                    </label>
                  </div>
                </div>

                {item.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.images.map((img, i) => (
                      <div key={i} className="relative group/img w-12 h-12 rounded-lg overflow-hidden border border-divider shadow-xs">
                        <img src={img} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removeItemImage(item.id, i)} 
                          className="absolute inset-0 bg-red-600/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-xs text-tertiary text-center py-5 bg-surface-elevated/40 rounded-xl border border-dashed border-divider">
                No individual checklist items added yet. Click &quot;Add Item&quot; above.
              </div>
            )}
          </div>
        </div>

        {/* Request Forms & Work Order Attachments */}
        <div className="pt-2 border-t border-divider/60">
          <label className="block text-xs font-semibold text-secondary mb-2">
            Work Order Documents & Sign-off Forms
          </label>
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropForm}
            className={`flex flex-col items-center justify-center gap-2 px-6 py-5 bg-canvas/60 hover:bg-surface-elevated border-2 border-dashed ${
              isDraggingForm ? 'border-blue-500 bg-blue-500/10' : 'border-divider'
            } text-tertiary hover:text-primary rounded-xl transition cursor-pointer text-center`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">Drag & drop service forms or diagnostic reports here</p>
              <p className="text-[11px] text-tertiary mt-0.5">Supports PDF documents and high-res images</p>
            </div>
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleRequestFormsUpload} />
          </label>

          {requestForms.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-3">
              {requestForms.map((form, idx) => (
                <div key={idx} className="relative group w-14 h-14 rounded-xl border border-divider overflow-hidden bg-surface shadow-xs">
                  {form.startsWith('data:application/pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-400">
                      <FileText className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <img src={form} alt={`Form ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button 
                    type="button" 
                    onClick={() => removeRequestForm(idx)} 
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-divider/60">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-4 py-2 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialOrder ? "Save Changes" : "Create Work Order"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// Form Editor for Procurement Order
const ProcurementOrderEditor = ({ 
  initialOrder, 
  workOrders, 
  onSave, 
  onCancel 
}: { 
  initialOrder: ProcurementOrder | null, 
  workOrders: WorkOrder[], 
  onSave: (doc: any) => void, 
  onCancel: () => void 
}) => {
  const [docId, setDocId] = useState(initialOrder?.id || `PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [taskName, setTaskName] = useState(initialOrder?.taskName || '');
  const [status, setStatus] = useState(initialOrder?.status || 'Active');
  const [requestedBy, setRequestedBy] = useState(initialOrder?.requestedBy || '');
  const [assignedTo, setAssignedTo] = useState(initialOrder?.assignedTo || '');
  const [dateReported, setDateReported] = useState(initialOrder?.dateReported || new Date().toISOString());
  const [workOrderId, setWorkOrderId] = useState(initialOrder?.workOrderId || '');
  const [items, setItems] = useState<WorkOrderItem[]>(initialOrder?.items || (initialOrder ? [] : [{ 
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
    name: '', 
    description: '', 
    quantity: '1', 
    dateSent: new Date().toISOString(), 
    state: 'Pending', 
    images: [], 
    priority: 'Medium' 
  }]));
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
    setItems([...items, { 
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
      name: '', 
      description: '', 
      quantity: '1', 
      dateSent: new Date().toISOString(), 
      state: 'Pending', 
      images: [], 
      priority: 'Medium' 
    }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const relatedWO = workOrders.find(wo => wo.id === workOrderId);
    const resolvedTitle = (items.length > 0 && items[0].name?.trim())
      ? items[0].name.trim()
      : (taskName.trim() || initialOrder?.taskName || 'Parts Requisition');

    onSave({
      id: docId.trim(),
      taskName: resolvedTitle,
      workOrderId: workOrderId || initialOrder?.workOrderId || undefined,
      machineName: initialOrder?.machineName || (relatedWO ? relatedWO.machineName : ''),
      status,
      requestedBy: requestedBy.trim(),
      assignedTo: assignedTo.trim(),
      dateReported,
      items,
      requestForms
    });
  };

  return (
    <div className="relative bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">
              {initialOrder ? "Edit Part Procurement" : "New Procurement Requisition"}
            </h3>
            <p className="text-xs text-tertiary">Track spare parts purchasing, vendor quotes, and order status</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-elevated cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)} 
              required 
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition font-medium"
            >
              <option value="Active">Active (Pending/Ordered)</option>
              <option value="Ordered">Ordered from Vendor</option>
              <option value="In Transit">In Transit</option>
              <option value="Finished">Finished / Received</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Requested By</label>
            <input 
              type="text" 
              value={requestedBy} 
              onChange={e => setRequestedBy(e.target.value)} 
              placeholder="Technician Name"
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Date Requested</label>
            <input 
              type="date" 
              value={dateReported ? dateReported.split('T')[0] : ''} 
              onChange={e => {
                const selectedDate = e.target.value;
                if (!selectedDate) return;
                const now = new Date();
                const [year, month, day] = selectedDate.split('-').map(Number);
                const updatedDate = new Date(now);
                updatedDate.setFullYear(year, month - 1, day);
                setDateReported(updatedDate.toISOString());
              }} 
              required 
              className="w-full px-3.5 py-2 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition dark:[color-scheme:dark]" 
            />
          </div>
        </div>

        {/* Items List */}
        <div className="pt-2 border-t border-divider/60">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                Requested Spare Parts
              </h4>
              <p className="text-[11px] text-tertiary">Part description, quantity required, and urgency</p>
            </div>
            <button 
              type="button" 
              onClick={handleAddItem} 
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Part
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="p-3.5 border border-divider rounded-xl bg-canvas/40 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-divider/40">
                  <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">
                    Part #{idx + 1}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => removeItem(item.id)} 
                    className="text-tertiary hover:text-rose-400 p-1 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-7">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Part Name / SKU</label>
                    <input 
                      type="text" 
                      value={item.name || ''} 
                      onChange={e => updateItem(item.id, 'name', e.target.value)} 
                      required 
                      placeholder="e.g. Servo Motor Drive SM-200"
                      className="w-full px-2.5 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition" 
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">State</label>
                    <select 
                      value={item.state} 
                      onChange={e => updateItem(item.id, 'state', e.target.value)} 
                      className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition font-medium"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Delivered / Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Qty</label>
                    <input 
                      type="text" 
                      value={item.quantity} 
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)} 
                      required 
                      className="w-full px-2 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition text-center font-medium" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-8">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Supplier / Part Number Specs</label>
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value)} 
                      placeholder="e.g. OEM Festo Pneumatic Valve 24V"
                      className="w-full px-2.5 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:border-blue-500 outline-none transition" 
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-secondary mb-1">Part Spec Images</label>
                    <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-surface hover:bg-surface-elevated border border-divider rounded-lg cursor-pointer transition text-[11px] text-secondary font-medium w-full">
                      <Upload className="w-3 h-3 text-blue-400" />
                      <span>{item.images.length === 0 ? 'Upload Photos' : `${item.images.length} photo${item.images.length>1?'s':''}`}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleItemImages(item.id, e)} />
                    </label>
                  </div>
                </div>

                {item.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.images.map((img, i) => (
                      <div key={i} className="relative group/img w-12 h-12 rounded-lg overflow-hidden border border-divider shadow-xs">
                        <img src={img} alt={`Part ${i + 1}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removeItemImage(item.id, i)} 
                          className="absolute inset-0 bg-red-600/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quotations & Invoices Upload */}
        <div className="pt-2 border-t border-divider/60">
          <label className="block text-xs font-semibold text-secondary mb-2">
            Supplier Quotes, Purchase Orders & Invoices
          </label>
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropForm}
            className={`flex flex-col items-center justify-center gap-2 px-6 py-5 bg-canvas/60 hover:bg-surface-elevated border-2 border-dashed ${
              isDraggingForm ? 'border-blue-500 bg-blue-500/10' : 'border-divider'
            } text-tertiary hover:text-primary rounded-xl transition cursor-pointer text-center`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">Drag & drop vendor quotes or receipt PDFs here</p>
              <p className="text-[11px] text-tertiary mt-0.5">Supports PDF documents and high-resolution images</p>
            </div>
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleRequestFormsUpload} />
          </label>

          {requestForms.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-3">
              {requestForms.map((form, idx) => (
                <div key={idx} className="relative group w-14 h-14 rounded-xl border border-divider overflow-hidden bg-surface shadow-xs">
                  {form.startsWith('data:application/pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-400">
                      <FileText className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <img src={form} alt={`Form ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button 
                    type="button" 
                    onClick={() => removeRequestForm(idx)} 
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-divider/60">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-4 py-2 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialOrder ? "Save Changes" : "Create Procurement Order"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default function MaintenanceOrders() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<'Maintenance' | 'Procurement'>('Maintenance');
  const [workOrders, setWorkOrders] = useLocalStorage<WorkOrder[]>('maintenance_work_orders', INITIAL_MAINTENANCE_WORK_ORDERS);
  const [procurementOrders, setProcurementOrders] = useLocalStorage<ProcurementOrder[]>('maintenance_procurement_orders', INITIAL_MAINTENANCE_PROCUREMENT_ORDERS);
  const [machinesList] = useLocalStorage<any[]>('machines_data_v2', []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [moViewStatus, setMoViewStatus] = useState<'Active' | 'Finished'>('Active');
  
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | ProcurementOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | ProcurementOrder | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [, setTrash] = useLocalStorage<any[]>('trash_data', []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const activeMO = workOrders.filter(wo => wo.status !== 'Completed' && wo.status !== 'Finished').length;
    const criticalBreakdowns = workOrders.filter(wo => (wo.priority === 'Critical' || wo.priority === 'High') && wo.status !== 'Completed' && wo.status !== 'Finished').length;
    const activePO = procurementOrders.filter(po => po.status === 'Active' || po.status === 'Ordered' || po.status === 'Requested').length;
    const completedTotal = workOrders.filter(wo => wo.status === 'Completed' || wo.status === 'Finished').length +
                           procurementOrders.filter(po => po.status === 'Completed' || po.status === 'Finished').length;
    return { activeMO, criticalBreakdowns, activePO, completedTotal };
  }, [workOrders, procurementOrders]);

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
      logAction('Work Order Deleted', `Maintenance order ${order.id} was moved to trash.`, 'warning');
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
      logAction('Procurement Order Deleted', `Procurement order ${order.id} was moved to trash.`, 'warning');
      if (viewingOrder?.id === id) setViewingOrder(null);
    }
  };

  const handleCheckItem = (moId: string, itemId: string) => {
    const newDate = new Date().toISOString();
    const wo = workOrders.find(w => w.id === moId);
    const item = wo?.items?.find(it => it.id === itemId);
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

    sendNotification({
      title: 'Checklist Item Checked',
      message: `${user?.username || 'An account'} checked "${item?.name || item?.description || 'item'}" on ${wo?.machineName || wo?.id || 'work order'}.`,
      type: 'item_checked',
      priority: 'normal',
      targetUsername: 'all',
      link: 'maintenance',
      metadata: { orderId: moId, checkItemName: item?.name || item?.description, machineId: wo?.machineName }
    });
  };

  const handleCompleteItem = (moId: string, itemId: string) => {
    const wo = workOrders.find(w => w.id === moId);
    const item = wo?.items?.find(it => it.id === itemId);
    setWorkOrders(workOrders.map((wo) => {
      if (wo.id === moId && wo.items) {
        const newItems = wo.items.map(it => it.id === itemId ? { ...it, state: 'Completed', dateCompleted: new Date().toISOString() } : it);
        const allCompleted = newItems.every(it => it.state === 'Completed');
        return {
          ...wo,
          items: newItems,
          status: allCompleted ? 'Completed' : wo.status,
          dateCompleted: allCompleted ? (wo.dateCompleted || new Date().toISOString()) : wo.dateCompleted
        };
      }
      return wo;
    }));
    
    if (viewingOrder && viewingOrder.id === moId && 'items' in viewingOrder) {
      setViewingOrder(null);
    }
    
    logAction('Item Completed', `Item ${itemId} in Maintenance Order ${moId} marked as completed.`, 'success');
    sendNotification({
      title: 'Maintenance Item Completed',
      message: `"${item?.name || item?.description || 'item'}" on ${wo?.machineName || wo?.id || 'work order'} was marked completed.`,
      type: 'item_checked',
      priority: 'normal',
      targetUsername: 'all',
      link: 'maintenance',
      metadata: { orderId: moId, checkItemName: item?.name || item?.description, machineId: wo?.machineName }
    });
  };

  const handleSaveMO = (doc: WorkOrder) => {
    if ((doc.status === 'Completed' || doc.status === 'Finished') && !doc.dateCompleted) {
      doc.dateCompleted = new Date().toISOString();
    } else if (doc.status !== 'Completed' && doc.status !== 'Finished') {
      doc.dateCompleted = undefined;
    }
    if (editingOrder) {
      logAction('Work Order Updated', `Maintenance order ${doc.id} was updated.`, 'info');
      setWorkOrders(workOrders.map(wo => wo.id === editingOrder.id ? doc : wo));
      sendNotification({
        title: 'Maintenance Order Updated',
        message: `Maintenance order ${doc.id} (${doc.machineName}) was updated (Status: ${doc.status}).`,
        type: 'order_updated',
        priority: 'normal',
        targetUsername: 'all',
        link: 'maintenance',
        metadata: { orderId: doc.id, machineId: doc.machineName }
      });
    } else {
      logAction('Work Order Created', `Maintenance order ${doc.id} was created.`, 'success');
      setWorkOrders([doc, ...workOrders]);
      sendNotification({
        title: 'New Maintenance Order Added',
        message: `${doc.taskName || 'Maintenance Order'} created for ${doc.machineName} (${doc.priority} Priority).`,
        type: 'order_created',
        priority: doc.priority === 'Critical' ? 'urgent' : doc.priority === 'High' ? 'high' : 'normal',
        targetUsername: 'all',
        link: 'maintenance',
        metadata: { orderId: doc.id, machineId: doc.machineName }
      });
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
    if (editingOrder) {
      logAction('Procurement Order Updated', `Procurement order ${editingOrder.id} was updated.`, 'info');
      setProcurementOrders(procurementOrders.map(po => po.id === editingOrder.id ? updatedPO as ProcurementOrder : po));
      sendNotification({
        title: 'Procurement Order Updated',
        message: `Procurement order ${editingOrder.id} was updated (Status: ${updatedPO.status}).`,
        type: 'order_updated',
        priority: 'normal',
        targetUsername: 'all',
        link: 'maintenance',
        metadata: { orderId: editingOrder.id }
      });
    } else {
      logAction('Procurement Order Created', `Procurement order ${updatedPO.id} was created.`, 'success');
      setProcurementOrders([updatedPO as ProcurementOrder, ...procurementOrders]);
      sendNotification({
        title: 'New Procurement Request Added',
        message: `Parts request for ${updatedPO.taskName || 'item'} (${updatedPO.priority || 'Normal'} Priority).`,
        type: 'order_created',
        priority: updatedPO.priority === 'Critical' ? 'urgent' : updatedPO.priority === 'High' ? 'high' : 'normal',
        targetUsername: 'all',
        link: 'maintenance',
        metadata: { orderId: updatedPO.id }
      });
    }
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'High':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Medium':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'Low':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-tertiary bg-surface-elevated border-divider';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
      case 'Finished':
        return {
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: CheckCircle2
        };
      case 'In Progress':
      case 'In Transit':
        return {
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          icon: Truck
        };
      case 'Waiting for Parts':
      case 'Ordered':
        return {
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          icon: Clock
        };
      case 'Requested':
      case 'Open':
        return {
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          icon: AlertCircle
        };
      default:
        return {
          color: 'text-secondary bg-surface-elevated border-divider',
          icon: Wrench
        };
    }
  };

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${activeTab} Report`);

    let currentRow = 2;

    if (activeTab === 'Maintenance') {
      worksheet.columns = [
        { header: 'MO ID', key: 'id', width: 15 },
        { header: 'Task Name', key: 'taskName', width: 30 },
        { header: 'Issue', key: 'issue', width: 40 },
        { header: 'Time Elapsed', key: 'timeElapsed', width: 20 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Date Reported', key: 'dateReported', width: 20 }
      ];

      workOrders.filter(wo => {
        if (!searchQuery) return true;
        const sq = searchQuery.toLowerCase();
        return wo.id.toLowerCase().includes(sq) || 
               (wo.taskName || '').toLowerCase().includes(sq) ||
               (wo.items && wo.items.some(item => (item.name || '').toLowerCase().includes(sq)));
      }).forEach(wo => {
        let items = wo.items && wo.items.length > 0 ? wo.items : [null];
        
        if (wo.items && wo.items.length > 0) {
           items = items.filter(it => moViewStatus === 'Finished' ? it?.state === 'Completed' : it?.state !== 'Completed');
        } else {
           const isFinished = wo.status === 'Completed' || wo.status === 'Finished';
           const matchesStatus = moViewStatus === 'Finished' ? isFinished : !isFinished;
           if (!matchesStatus) items = [];
        }
        
        if (items.length === 0) return;

        const startRow = currentRow;

        items.forEach((item, index) => {
          worksheet.addRow({
            id: index === 0 ? wo.id : '',
            taskName: item ? item.name || '-' : wo.taskName,
            issue: item ? item.description || '-' : wo.issue,
            timeElapsed: (item ? item.dateSent : wo.dateReported) || '-',
            priority: item ? item.priority || wo.priority : wo.priority,
            status: index === 0 ? wo.status : '',
            dateReported: index === 0 ? wo.dateReported : ''
          });
          currentRow++;
        });

        if (items.length > 1) {
          worksheet.mergeCells(startRow, 1, currentRow - 1, 1);
          worksheet.mergeCells(startRow, 6, currentRow - 1, 6);
          worksheet.mergeCells(startRow, 7, currentRow - 1, 7);
        }
      });
    } else {
      worksheet.columns = [
        { header: 'PO ID', key: 'id', width: 15 },
        { header: 'Task Name', key: 'taskName', width: 40 },
        { header: 'Issue Description', key: 'issue', width: 40 },
        { header: 'Time Elapsed', key: 'timeElapsed', width: 20 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Date Reported', key: 'dateReported', width: 20 }
      ];

      procurementOrders.filter(po => {
        if (!searchQuery) return true;
        const sq = searchQuery.toLowerCase();
        return po.id.toLowerCase().includes(sq) || 
               (po.taskName || '').toLowerCase().includes(sq) || 
               (po.workOrderId || '').toLowerCase().includes(sq);
      }).forEach(po => {
        let items = po.items && po.items.length > 0 ? po.items : [null];
        
        if (po.items && po.items.length > 0) {
           items = items.filter(it => moViewStatus === 'Finished' ? it?.state === 'Completed' : it?.state !== 'Completed');
        } else {
           const matchesStatus = po.status === moViewStatus;
           if (!matchesStatus) items = [];
        }
        
        if (items.length === 0) return;

        const startRow = currentRow;

        items.forEach((item, index) => {
          worksheet.addRow({
            id: index === 0 ? po.id : '',
            taskName: item ? item.name || '-' : po.taskName,
            issue: item ? item.description || '-' : '-',
            timeElapsed: (item ? item.dateSent : po.dateReported) || '-',
            priority: item ? item.priority || 'Low' : 'Low',
            status: index === 0 ? po.status : '',
            dateReported: index === 0 ? po.dateReported : ''
          });
          currentRow++;
        });

        if (items.length > 1) {
          worksheet.mergeCells(startRow, 1, currentRow - 1, 1);
          worksheet.mergeCells(startRow, 6, currentRow - 1, 6);
          worksheet.mergeCells(startRow, 7, currentRow - 1, 7);
        }
      });
    }

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    logAction('Report Exported', `User exported ${activeTab} report`, 'info');
  };

  // Filtered maintenance list
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const sq = searchQuery.trim().toLowerCase();
      const matchesSearch = !sq || 
        wo.id.toLowerCase().includes(sq) || 
        (wo.taskName || '').toLowerCase().includes(sq) ||
        (wo.machineName || '').toLowerCase().includes(sq) ||
        (wo.issue || '').toLowerCase().includes(sq) ||
        (wo.items && wo.items.some(item => (item.name || '').toLowerCase().includes(sq)));

      const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [workOrders, searchQuery, priorityFilter]);

  // Filtered procurement list
  const filteredProcurementOrders = useMemo(() => {
    return procurementOrders.filter(po => {
      const sq = searchQuery.trim().toLowerCase();
      const matchesSearch = !sq || 
        po.id.toLowerCase().includes(sq) || 
        (po.taskName || '').toLowerCase().includes(sq) || 
        (po.workOrderId || '').toLowerCase().includes(sq) ||
        (po.items && po.items.some(item => (item.name || '').toLowerCase().includes(sq)));

      return matchesSearch;
    });
  }, [procurementOrders, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-4 border-b border-divider/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              Maintenance & Procurement Hub
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                CMMS & Tooling
              </span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Track machine work orders, parts procurement, and technician dispatch checklists.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button" 
            onClick={handleExport} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-tertiary" />
            <span>Export Excel</span>
          </button>

          <button 
            type="button" 
            onClick={() => setIsCreatingOrder(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 
            <span>{activeTab === 'Maintenance' ? 'New Work Order' : 'New Part Request'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Active Work Orders</p>
            <p className="text-lg font-bold text-amber-400 tracking-tight mt-0.5">{metrics.activeMO}</p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Urgent Breakdowns</p>
            <p className="text-lg font-bold text-rose-400 tracking-tight mt-0.5">{metrics.criticalBreakdowns}</p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Parts Requisitions</p>
            <p className="text-lg font-bold text-blue-400 tracking-tight mt-0.5">{metrics.activePO}</p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Resolved Interventions</p>
            <p className="text-lg font-bold text-emerald-400 tracking-tight mt-0.5">{metrics.completedTotal}</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-divider/70 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Navigation & Toolbar Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 px-5 py-3.5 border-b border-divider/60 bg-surface-elevated/20 shrink-0">
          
          {/* Main Segmented Tab Switcher */}
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setActiveTab('Maintenance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'Maintenance' 
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30' 
                  : 'bg-surface-elevated/80 hover:bg-surface-elevated text-secondary hover:text-primary border border-divider-subtle'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance Orders</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'Maintenance' ? 'bg-white/20 text-white' : 'bg-surface text-tertiary'}`}>
                {workOrders.length}
              </span>
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab('Procurement')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'Procurement' 
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30' 
                  : 'bg-surface-elevated/80 hover:bg-surface-elevated text-secondary hover:text-primary border border-divider-subtle'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Procurement Requests</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'Procurement' ? 'bg-white/20 text-white' : 'bg-surface text-tertiary'}`}>
                {procurementOrders.length}
              </span>
            </button>
          </div>
          
          {/* Filters and Search Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Switch (Active vs Finished) */}
            <div className="flex bg-canvas border border-divider-subtle rounded-xl p-1 shrink-0">
              <button 
                type="button"
                onClick={() => setMoViewStatus('Active')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  moViewStatus === 'Active' 
                    ? 'bg-surface text-primary shadow-xs' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                Active
              </button>
              <button 
                type="button"
                onClick={() => setMoViewStatus('Finished')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  moViewStatus === 'Finished' 
                    ? 'bg-surface text-primary shadow-xs' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                Finished
              </button>
            </div>

            {/* Priority Filter (Maintenance Tab) */}
            {activeTab === 'Maintenance' && (
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-canvas border border-divider rounded-xl text-xs text-secondary font-medium outline-none focus:border-blue-500 transition"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary pointer-events-none" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-canvas border border-divider rounded-xl text-xs text-primary focus:border-blue-500 outline-none transition placeholder:text-tertiary/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'Maintenance' ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10 shadow-xs border-b border-divider/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                  <th className="px-5 py-3.5">MO ID & Date</th>
                  <th className="px-4 py-3.5">Task & Machine</th>
                  <th className="px-4 py-3.5">Issue Diagnostic</th>
                  <th className="px-4 py-3.5">Time Elapsed</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {filteredWorkOrders.flatMap((wo) => {
                  let items = wo.items && wo.items.length > 0 ? wo.items : [null];
                  
                  if (wo.items && wo.items.length > 0) {
                     items = items.filter(it => moViewStatus === 'Finished' ? it?.state === 'Completed' : it?.state !== 'Completed');
                  } else {
                     const isFinished = wo.status === 'Completed' || wo.status === 'Finished';
                     const matchesStatus = moViewStatus === 'Finished' ? isFinished : !isFinished;
                     if (!matchesStatus) items = [];
                  }
                  
                  if (items.length === 0) return [];
                  
                  return items.map((item, index) => {
                    const statusObj = getStatusBadge(wo.status);
                    const itemPriority = item?.priority || wo.priority || 'Low';

                    return (
                      <tr 
                        key={`${wo.id}-${item ? item.id : 'base'}`} 
                        className="hover:bg-surface-elevated/40 transition-colors group cursor-pointer"
                        onClick={() => setViewingOrder(wo)}
                      >
                        {/* ID Column */}
                        {index === 0 && (
                          <td rowSpan={items.length} className="px-5 py-3.5 align-top border-b border-divider/40">
                            <span className="font-bold text-primary text-xs tracking-tight block">
                              {wo.id}
                            </span>
                            <span className="text-[10px] text-tertiary mt-0.5 block">
                              {wo.dateReported ? wo.dateReported.split('T')[0] : 'Today'}
                            </span>
                          </td>
                        )}

                        {/* Task & Machine */}
                        <td className="px-4 py-3.5 align-middle border-b border-divider/40">
                          <span className="font-bold text-primary block truncate max-w-xs">
                            {item ? item.name || '-' : (wo.taskName || '-')}
                          </span>
                          {wo.machineName && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 mt-0.5">
                              <Wrench className="w-2.5 h-2.5" />
                              {wo.machineName}
                            </span>
                          )}
                        </td>

                        {/* Issue Diagnostic */}
                        <td className="px-4 py-3.5 align-middle text-secondary border-b border-divider/40 max-w-xs">
                          <p className="truncate text-xs text-secondary" title={item ? item.description : wo.issue}>
                            {item ? item.description || '-' : (wo.issue || '-')}
                          </p>
                        </td>

                        {/* Time Elapsed */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap border-b border-divider/40">
                          <TimeElapsedCounter 
                            dateString={item ? item.dateSent : wo.dateReported} 
                            endDateString={item ? item.dateCompleted : wo.dateCompleted} 
                            isFinished={item ? item.state === 'Completed' : (wo.status === 'Completed' || wo.status === 'Finished')} 
                          />
                        </td>

                        {/* Priority Badge */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap border-b border-divider/40">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(itemPriority)}`}>
                            {itemPriority}
                          </span>
                        </td>

                        {/* Status Column */}
                        {index === 0 && (
                          <>
                            <td rowSpan={items.length} className="px-4 py-3.5 align-top whitespace-nowrap border-b border-divider/40">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusObj.color}`}>
                                <statusObj.icon className="w-3.5 h-3.5" />
                                {wo.status}
                              </span>
                            </td>

                            {/* Actions Column */}
                            <td rowSpan={items.length} className="px-5 py-3.5 text-right align-top whitespace-nowrap border-b border-divider/40">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button 
                                  type="button" 
                                  onClick={() => setViewingOrder(wo)}
                                  className="p-1.5 text-tertiary hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition cursor-pointer"
                                  title="View order details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setEditingOrder(wo)}
                                  className="p-1.5 text-tertiary hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                                  title="Edit work order"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={(e) => handleDeleteWorkOrder(wo.id, e)}
                                  className="p-1.5 text-tertiary hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                                  title="Move to trash"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10 shadow-xs border-b border-divider/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                  <th className="px-5 py-3.5">PO ID & Date</th>
                  <th className="px-4 py-3.5">Requisition / Part</th>
                  <th className="px-4 py-3.5">Related Machine/WO</th>
                  <th className="px-4 py-3.5">Time Elapsed</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {filteredProcurementOrders.flatMap((po) => {
                  let items = po.items && po.items.length > 0 ? po.items : [null];
                  
                  if (po.items && po.items.length > 0) {
                     items = items.filter(it => moViewStatus === 'Finished' ? it?.state === 'Completed' : it?.state !== 'Completed');
                  } else {
                     const matchesStatus = po.status === moViewStatus;
                     if (!matchesStatus) items = [];
                  }
                  
                  if (items.length === 0) return [];

                  return items.map((item, index) => {
                    const statusObj = getStatusBadge(po.status);
                    const itemPriority = item?.priority || 'Medium';

                    return (
                      <tr 
                        key={`${po.id}-${item ? item.id : 'base'}`} 
                        className="hover:bg-surface-elevated/40 transition-colors group cursor-pointer" 
                        onClick={() => setViewingOrder(po)}
                      >
                        {/* ID Column */}
                        {index === 0 && (
                          <td rowSpan={items.length} className="px-5 py-3.5 align-top border-b border-divider/40">
                            <span className="font-bold text-primary text-xs tracking-tight block">
                              {po.id}
                            </span>
                            <span className="text-[10px] text-tertiary mt-0.5 block">
                              {po.dateReported ? po.dateReported.split('T')[0] : 'Today'}
                            </span>
                          </td>
                        )}

                        {/* Part Name */}
                        <td className="px-4 py-3.5 align-middle border-b border-divider/40">
                          <span className="font-bold text-primary block truncate max-w-xs">
                            {item ? item.name || '-' : (po.taskName || '-')}
                          </span>
                          {item?.quantity && (
                            <span className="text-[10px] text-tertiary mt-0.5 block">
                              Qty: <span className="font-semibold text-secondary">{item.quantity}</span>
                            </span>
                          )}
                        </td>

                        {/* Related Machine/WO */}
                        <td className="px-4 py-3.5 align-middle border-b border-divider/40 max-w-[200px]">
                          {po.workOrderId ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400">
                              <Wrench className="w-3 h-3" />
                              {po.workOrderId}
                            </span>
                          ) : (
                            <span className="text-xs text-tertiary">Direct Requisition</span>
                          )}
                        </td>

                        {/* Time Elapsed */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap border-b border-divider/40">
                          <TimeElapsedCounter 
                            dateString={item ? item.dateSent : po.dateReported} 
                            endDateString={item ? item.dateCompleted : po.dateCompleted} 
                            isFinished={item ? item.state === 'Completed' : (po.status === 'Completed' || po.status === 'Finished')} 
                          />
                        </td>

                        {/* Priority Badge */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap border-b border-divider/40">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold border ${getPriorityBadge(itemPriority)}`}>
                            {itemPriority}
                          </span>
                        </td>

                        {/* Status Column */}
                        {index === 0 && (
                          <>
                            <td rowSpan={items.length} className="px-4 py-3.5 align-top whitespace-nowrap border-b border-divider/40">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusObj.color}`}>
                                <statusObj.icon className="w-3.5 h-3.5" />
                                {po.status}
                              </span>
                            </td>

                            {/* Actions Column */}
                            <td rowSpan={items.length} className="px-5 py-3.5 text-right align-top whitespace-nowrap border-b border-divider/40">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button 
                                  type="button" 
                                  onClick={() => setViewingOrder(po)}
                                  className="p-1.5 text-tertiary hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition cursor-pointer"
                                  title="View procurement details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setEditingOrder(po)}
                                  className="p-1.5 text-tertiary hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                                  title="Edit request"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={(e) => handleDeleteProcurementOrder(po.id, e)}
                                  className="p-1.5 text-tertiary hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                                  title="Move to trash"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New/Edit Order Modal */}
      {(isCreatingOrder || editingOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}></div>
          {(() => {
            const isMaintenance = activeTab === 'Maintenance';
            if (isMaintenance) {
              return (
                <MaintenanceOrderEditor 
                  initialOrder={(editingOrder as WorkOrder) || null} 
                  machinesList={machinesList}
                  onSave={handleSaveMO} 
                  onCancel={() => { setIsCreatingOrder(false); setEditingOrder(null); }} 
                />
              );
            }
            return (
              <ProcurementOrderEditor 
                initialOrder={(editingOrder as ProcurementOrder) || null} 
                workOrders={workOrders} 
                onSave={handleSavePO} 
                onCancel={() => { setIsCreatingOrder(false); setEditingOrder(null); }} 
              />
            );
          })()}
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setViewingOrder(null)}></div>
          <div className="relative bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  {viewingOrder.id.startsWith('MO-') ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    {viewingOrder.id}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getStatusBadge(viewingOrder.status).color}`}>
                      {viewingOrder.status}
                    </span>
                  </h3>
                  <p className="text-xs text-tertiary">
                    {viewingOrder.id.startsWith('MO-') ? 'Maintenance Work Order Records' : 'Parts Procurement Requisition'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingOrder(null)}
                className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-elevated cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-canvas border border-divider-subtle">
                  <span className="text-[10px] uppercase font-bold text-tertiary">Task / Title</span>
                  <p className="font-bold text-xs text-primary mt-0.5 truncate">{viewingOrder.taskName || '-'}</p>
                </div>

                {'machineName' in viewingOrder && viewingOrder.machineName && (
                  <div className="p-3 rounded-xl bg-canvas border border-divider-subtle">
                    <span className="text-[10px] uppercase font-bold text-tertiary">Target Machine</span>
                    <p className="font-bold text-xs text-blue-400 mt-0.5 truncate">{viewingOrder.machineName}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-canvas border border-divider-subtle">
                  <span className="text-[10px] uppercase font-bold text-tertiary">Date Logged</span>
                  <p className="font-semibold text-xs text-secondary mt-0.5">{viewingOrder.dateReported ? viewingOrder.dateReported.split('T')[0] : 'Today'}</p>
                </div>
              </div>

              {/* Issue Description */}
              {'issue' in viewingOrder && viewingOrder.issue && (
                <div className="p-4 rounded-xl bg-canvas/60 border border-divider-subtle space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">Reported Symptom & Diagnostic</span>
                  <p className="text-xs text-secondary leading-relaxed">{viewingOrder.issue}</p>
                </div>
              )}

              {/* Items & Tasks Checklist */}
              {viewingOrder.items && viewingOrder.items.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Checklist Items & Stages ({viewingOrder.items.length})
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {viewingOrder.items.map((item, idx) => (
                      <div key={item.id} className="p-3.5 border border-divider rounded-xl bg-canvas/40 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-surface-elevated text-[11px] font-bold text-tertiary flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-primary">{item.name || `Task ${idx + 1}`}</h5>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold border ${getStatusBadge(item.state).color}`}>
                            {item.state}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-secondary pl-7">{item.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-divider-subtle text-xs">
                          <div className="text-[11px] text-tertiary">
                            Quantity: <span className="font-bold text-primary">{item.quantity}</span> | Priority: <span className="font-bold text-secondary">{item.priority}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => handleCheckItem(viewingOrder.id, item.id)}
                              className="text-[11px] font-semibold bg-surface-elevated hover:bg-surface text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-divider-subtle transition cursor-pointer"
                            >
                              Check
                            </button>
                            {item.state !== 'Completed' && (
                              <button 
                                type="button" 
                                onClick={() => handleCompleteItem(viewingOrder.id, item.id)}
                                className="text-[11px] font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Complete
                              </button>
                            )}
                          </div>
                        </div>

                        {item.images && item.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-divider-subtle">
                            {item.images.map((img, i) => (
                              <img 
                                key={i} 
                                src={img} 
                                alt={`Item attached ${i + 1}`} 
                                className="rounded-lg border border-divider-subtle w-16 h-16 object-cover cursor-pointer hover:opacity-80 transition" 
                                onClick={() => setZoomedImage(img)} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {('requestForms' in viewingOrder && viewingOrder.requestForms && viewingOrder.requestForms.length > 0) && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-primary">
                    Attached Invoices & Documents ({viewingOrder.requestForms.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {viewingOrder.requestForms.map((fileData, idx) => {
                      const isPdf = fileData.startsWith('data:application/pdf');
                      if (isPdf) {
                        return (
                          <div key={idx} className="flex items-center justify-center p-3 rounded-xl border border-divider bg-canvas text-blue-400 h-28">
                            <a href={fileData} download={`Attachment_${idx + 1}.pdf`} className="flex flex-col items-center gap-1.5 hover:text-blue-300">
                              <FileText className="w-7 h-7" />
                              <span className="text-[11px] font-bold underline">Download PDF</span>
                            </a>
                          </div>
                        );
                      }
                      return (
                        <img 
                          key={idx} 
                          src={fileData} 
                          alt={`Attachment ${idx + 1}`} 
                          className="rounded-xl border border-divider w-full h-28 object-cover cursor-pointer hover:opacity-80 transition shadow-xs" 
                          onClick={() => setZoomedImage(fileData)} 
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Bottom Toolbar */}
            <div className="px-6 py-4 border-t border-divider flex justify-between gap-3 bg-canvas/40 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  if (viewingOrder.id.startsWith('MO-')) handleDeleteWorkOrder(viewingOrder.id);
                  else handleDeleteProcurementOrder(viewingOrder.id);
                }}
                className="px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>

              <button 
                type="button" 
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Pan & Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute -top-12 right-0 md:-right-12 text-secondary hover:text-primary bg-surface/70 hover:bg-surface p-2 rounded-full backdrop-blur-md transition z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={5}
              centerOnInit
            >
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%', maxHeight: '90vh' }}>
                <img src={zoomedImage} alt="Zoomed View" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
