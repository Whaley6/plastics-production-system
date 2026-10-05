import React, { useState, useMemo, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { logAction } from '../utils/logger';
import ExcelJS from 'exceljs';
import { 
  Cpu, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Wrench,
  ChevronRight,
  Camera,
  Upload,
  Image as ImageIcon,
  Eye,
  FileText,
  Scan,
  Download
} from 'lucide-react';

export type CncTicket = {
  id: string; // Ticket Number (e.g., CNC-101)
  moldName: string; // Product Name
  machineNumber: string; // Machine Number
  dateSent: string; // Mold Transfer Date (YYYY-MM-DD)
  maintenanceInterval: string; // Maintenance Interval
  state: 'Fixed Properly' | 'Works (Not Fixed)' | 'Not Fixed' | 'Has Other Issues'; // Status
  closingDate?: string; // Closing Date (YYYY-MM-DD)
  notes?: string; // Optional remarks/details
  image?: string; // Base64 data of scanned paper
};

const TODAY_STR = new Date().toISOString().split('T')[0];

function generateMockPaperScan(ticketId: string, moldName: string, machine: string, date: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - textured paper cream color
  ctx.fillStyle = '#fbfaf5';
  ctx.fillRect(0, 0, 600, 800);

  // Subtle gridlines to simulate engineering report paper
  ctx.strokeStyle = 'rgba(218, 224, 233, 0.6)';
  ctx.lineWidth = 1;
  for (let x = 20; x < 600; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = 20; y < 800; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // Draw Header border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(30, 30, 540, 740);

  // Header Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px Courier New';
  ctx.fillText('CNC WORKSHOP & MOLD INSPECTION', 50, 75);
  ctx.fillRect(50, 88, 500, 3);

  // Subtitle / Stamp
  ctx.fillStyle = '#475569';
  ctx.font = '14px Courier New';
  ctx.fillText('TECHNICAL COMPLIANCE SHEET', 50, 115);
  ctx.fillText('DATE SENT: ' + date, 350, 115);

  // Specifications block
  ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
  ctx.fillRect(50, 140, 500, 150);
  ctx.strokeRect(50, 140, 500, 150);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Courier New';
  ctx.fillText('TICKET NO:    ' + ticketId, 70, 175);
  ctx.fillText('PRODUCT MOLD: ' + moldName.toUpperCase(), 70, 205);
  ctx.fillText('MACHINE REF:  ' + machine.toUpperCase(), 70, 235);
  ctx.fillText('INSPECTION:   INTERVAL RUN LOG', 70, 265);

  // Diagnostics check list
  ctx.fillText('DIAGNOSTICS & VERIFICATION CHECKLIST:', 50, 330);
  
  const checkItems = [
    ['[X]  Parting line wear alignment check', 'PASS'],
    ['[X]  Core / Cavity polishing inspect', 'PASS'],
    ['[X]  Ejector pin clearance & oiling', 'PASS'],
    ['[X]  Cooling line pressure flow test', 'PASS'],
    ['[ ]  Hot runner manifold thermocouple', 'REPLACE']
  ];

  ctx.font = '12px Courier New';
  checkItems.forEach((item, idx) => {
    const yPos = 360 + (idx * 35);
    ctx.fillStyle = '#334155';
    ctx.fillText(item[0], 65, yPos);
    ctx.fillStyle = item[1] === 'PASS' ? '#16a34a' : '#dc2626';
    ctx.fillText(item[1], 460, yPos);
  });

  // Notes area
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px Courier New';
  ctx.fillText('TECHNICIAN LOGS & FIELD NOTES:', 50, 550);
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(50, 580); ctx.lineTo(550, 580);
  ctx.moveTo(50, 615); ctx.lineTo(550, 615);
  ctx.moveTo(50, 650); ctx.lineTo(550, 650);
  ctx.stroke();

  ctx.fillStyle = '#2563eb';
  ctx.font = 'italic 12px Courier New';
  ctx.fillText('Verified mold transfer parameters for ' + machine, 55, 575);
  ctx.fillText('High gloss finish inspection performed.', 55, 610);

  // Approval Stamp
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.strokeRect(380, 680, 160, 60);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
  ctx.fillRect(380, 680, 160, 60);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 12px Courier New';
  ctx.fillText('CNC APPROVED', 400, 705);
  ctx.fillText('WORKSHOP DEPT', 405, 725);

  return canvas.toDataURL('image/jpeg', 0.8);
}

function calculateInterval(dateSent: string, closingDate?: string): string {
  if (!dateSent) return '-';
  const start = new Date(dateSent);
  const end = closingDate ? new Date(closingDate) : new Date(TODAY_STR);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return '-';
  }
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysVal = (diffDays < 0 ? 0 : diffDays) + 1;
  
  if (closingDate) {
    return `${daysVal} ${daysVal === 1 ? 'Day' : 'Days'}`;
  } else {
    return `${daysVal} ${daysVal === 1 ? 'Day' : 'Days'} (Active)`;
  }
}

export const INITIAL_CNC_TICKETS: CncTicket[] = [
  {
    id: 'CNC-101',
    moldName: 'Pump Head Mold',
    machineNumber: '1',
    dateSent: '2026-07-08',
    maintenanceInterval: '4 Days (Active)',
    state: 'Not Fixed',
    notes: 'Adjust air and gas exhaust vents to prevent flash formation.'
  },
  {
    id: 'CNC-102',
    moldName: 'Al-Hadbaa Lid Mold',
    machineNumber: '10',
    dateSent: '2026-07-05',
    maintenanceInterval: '7 Days (Active)',
    state: 'Has Other Issues',
    notes: 'Wear on the parting line requires laser welding and re-polishing.'
  },
  {
    id: 'CNC-103',
    moldName: 'Water Bottle 0.5L Mold',
    machineNumber: 'B2',
    dateSent: '2026-07-02',
    maintenanceInterval: '6 Days',
    state: 'Fixed Properly',
    closingDate: '2026-07-08',
    notes: 'Polished the blowing cavity to remove scratches.'
  },
  {
    id: 'CNC-104',
    moldName: 'Rasan Mold',
    machineNumber: '3',
    dateSent: '2026-07-10',
    maintenanceInterval: '2 Days (Active)',
    state: 'Not Fixed',
    notes: 'Manufacture new circular ejector pins.'
  }
];

export default function CncMoldTickets() {
  const { user } = useAuth();
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];
  const isReadOnly = currentRole?.permissions?.cnc_readonly === true;

  const [tickets, setTickets] = useLocalStorage<CncTicket[]>('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);
  const [machines] = useLocalStorage<any[]>('production_machines_v11', []);
  const [trash, setTrash] = useLocalStorage<any[]>('trash_data', []);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'Active' | 'Finished'>('Active');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<CncTicket | null>(null);

  // Form input fields
  const [formId, setFormId] = useState('');
  const [formMoldName, setFormMoldName] = useState('');
  const [formMachineNumber, setFormMachineNumber] = useState('');
  const [formDateSent, setFormDateSent] = useState('');
  const [formState, setFormState] = useState<CncTicket['state']>('Not Fixed');
  const [formClosingDate, setFormClosingDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Scanned Document/Paper attachment state
  const [formImage, setFormImage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxTicket, setLightboxTicket] = useState<CncTicket | null>(null);
  const [imageFilter, setImageFilter] = useState<'normal' | 'grayscale' | 'negative'>('normal');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Find molds with duplicate active tickets
  const activeDuplicates = useMemo(() => {
    const activeTickets = (tickets || []).filter(t => (t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)'));
    const counts: Record<string, number> = {};
    activeTickets.forEach(t => {
      const name = t.moldName.trim().toLowerCase();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.keys(counts).filter(name => counts[name] > 1);
  }, [tickets]);

  // Check if form currently typed mold is duplicated
  const isFormMoldDuplicate = useMemo(() => {
    if (!formMoldName.trim()) return false;
    const cleanName = formMoldName.trim().toLowerCase();
    return (tickets || []).some(t => 
      t.id !== formId && 
      t.moldName.trim().toLowerCase() === cleanName && 
      (t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)')
    );
  }, [formMoldName, formId, tickets]);

  // Extract machine options from the system if available
  const machineOptions = useMemo(() => {
    if (machines && machines.length > 0) {
      return machines.map((m: any) => ({
        id: m.id || m.name,
        value: m.name,
        label: `${m.m || ''} - ${m.name || ''}`,
        moldName: m.moldName
      }));
    }
    return ['1', '2', '3', '4', '6', '10', 'B1', 'B2', 'L1'].map(v => ({
      id: v,
      value: v,
      label: v,
      moldName: ''
    }));
  }, [machines]);

  // Export functionalities
  const exportToExcel = async (data: any[], filename: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CNC Tickets');

    worksheet.columns = [
      { header: 'Ticket ID', key: 'id', width: 15 },
      { header: 'Mold Name', key: 'moldName', width: 25 },
      { header: 'Machine Number', key: 'machineNumber', width: 20 },
      { header: 'Date Sent', key: 'dateSent', width: 15 },
      { header: 'Maintenance Interval', key: 'maintenanceInterval', width: 25 },
      { header: 'Status', key: 'state', width: 20 },
      { header: 'Closing Date', key: 'closingDate', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    // Add big title row in row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    worksheet.mergeCells(1, 1, 1, 8);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'CNC WORKSHOP TICKETS REPORT';
    titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002060' } // Dark blue from image
    };

    // Header styling
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      const text = cell.value?.toString().toUpperCase() || '';
      let argbStr = 'FF00B050'; // Default Green
      if (text.includes('NOTES') || text.includes('STATUS') || text.includes('CLOSING')) {
        argbStr = 'FF00B0F0'; // Light Blue
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argbStr }
      };
    });

    data.forEach(ticket => {
      const row = worksheet.addRow(ticket);
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        
        // Status color coding (Status is column 6)
        if (colNumber === 6) {
          cell.font = { bold: true };
          if (cell.value === 'Fixed Properly') {
             cell.font.color = { argb: 'FF16A34A' };
          } else if (cell.value === 'Not Fixed') {
             cell.font.color = { argb: 'FFD97706' };
          } else if (cell.value === 'Has Other Issues') {
             cell.font.color = { argb: 'FFDC2626' };
          } else if (cell.value === 'Works (Not Fixed)') {
             cell.font.color = { argb: 'FF2563EB' };
          }
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportAll = () => {
    logAction('CNC Export', 'Exported all CNC tickets', 'info');
    exportToExcel(tickets || [], `CNC_Tickets_All_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportActive = () => {
    logAction('CNC Export', 'Exported active CNC tickets', 'info');
    const activeTickets = (tickets || []).filter((t: any) => t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)');
    exportToExcel(activeTickets, `CNC_Tickets_Active_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle opening form for adding
  const handleOpenAdd = () => {
    setEditingTicket(null);
    
    // Auto increment ticket ID based on the most recent ticket
    let nextId = '1';
    if (tickets && tickets.length > 0) {
      const match = tickets[0].id.match(/^(.*?)(\d+)$/);
      if (match) {
        nextId = `${match[1]}${parseInt(match[2], 10) + 1}`;
      } else {
        nextId = `${tickets[0].id}-1`;
      }
    }

    setFormId(nextId);
    const defaultMachine = machineOptions[0] ? machineOptions[0].value : '1';
    setFormMachineNumber(defaultMachine);
    const mach = machineOptions.find(m => m.value === defaultMachine);
    setFormMoldName(mach && mach.moldName ? mach.moldName : '');
    setFormDateSent(new Date().toISOString().split('T')[0]);
    setFormState('Not Fixed');
    setFormClosingDate('');
    setFormNotes('');
    setFormImage('');
    setIsCameraActive(false);
    setIsFormOpen(true);
  };

  // Handle opening form for editing
  const handleOpenEdit = (t: CncTicket, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTicket(t);
    setFormId(t.id);
    setFormMoldName(t.moldName);
    setFormMachineNumber(t.machineNumber);
    setFormDateSent(t.dateSent);
    setFormState(t.state);
    setFormClosingDate(t.closingDate || '');
    setFormNotes(t.notes || '');
    setFormImage(t.image || '');
    setIsCameraActive(false);
    setIsFormOpen(true);
  };

  // Real Camera capture and upload methods
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access your camera. Please ensure permissions are granted, or upload a local photo of your paper scan.");
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("The file size is too large (maximum 5MB recommended for best local performance).");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      if (file.size > 5 * 1024 * 1024) {
        alert("The file size is too large (maximum 5MB recommended for best local performance).");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete / Trash
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = (tickets || []).find(t => t.id === id);
    if (!item) return;

    if (confirm(`Move CNC Ticket "${id}" to archive trash?`)) {
      setTrash(prev => [
        ...prev,
        {
          id: item.id,
          type: 'cnc_ticket',
          name: `CNC Ticket ${item.id} - ${item.moldName}`,
          data: item,
          deletedAt: new Date().toISOString()
        }
      ]);

      setTickets(prev => prev.filter(t => t.id !== id));
      logAction('CNC Ticket Deleted', `Moved ticket ${id} to archive trash.`, 'warning');
    }
  };

  // Save / Submit ticket
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formId.trim()) {
      alert('Ticket Number is required.');
      return;
    }
    if (!formMoldName.trim()) {
      alert('Product Name / Mold Name is required.');
      return;
    }
    if (!formMachineNumber.trim()) {
      alert('Machine Number is required.');
      return;
    }
    if (!formDateSent) {
      alert('Mold Transfer Date is required.');
      return;
    }

    if (isFormMoldDuplicate && (formState !== 'Fixed Properly' && formState !== 'Works (Not Fixed)')) {
      const confirmSave = confirm(`Warning: An active (unfixed) workshop ticket already exists for the mold "${formMoldName.trim()}". Are you sure you want to save this as a duplication?`);
      if (!confirmSave) return;
    }

    // Stop camera if running
    stopCamera();

    // Enforce closing date logic
    let finalClosingDate = formClosingDate;
    if ((formState !== 'Fixed Properly' && formState !== 'Works (Not Fixed)')) {
      finalClosingDate = '';
    } else if ((formState === 'Fixed Properly' || formState === 'Works (Not Fixed)') && !finalClosingDate) {
      finalClosingDate = new Date().toISOString().split('T')[0];
    }

    const updatedData: CncTicket = {
      id: formId,
      moldName: formMoldName,
      machineNumber: formMachineNumber,
      dateSent: formDateSent,
      maintenanceInterval: calculateInterval(formDateSent, (formState === 'Fixed Properly' || formState === 'Works (Not Fixed)') ? (finalClosingDate || new Date().toISOString().split('T')[0]) : undefined),
      state: formState,
      closingDate: finalClosingDate || undefined,
      notes: formNotes,
      image: formImage || undefined
    };

    setTickets(prev => {
      const exists = prev.some(item => item.id === formId);
      
      // If we are editing, we should map based on the original ID, not the new one
      if (editingTicket) {
        logAction('CNC Ticket Updated', `Updated CNC Ticket ${formId} (${formMoldName})`, 'info');
        return prev.map(item => item.id === editingTicket.id ? updatedData : item);
      } else if (exists) {
        // If it already exists and we are not explicitly editing it, overwrite it
        logAction('CNC Ticket Overwritten', `Overwritten CNC Ticket ${formId} (${formMoldName})`, 'warning');
        return prev.map(item => item.id === formId ? updatedData : item);
      } else {
        logAction('CNC Ticket Created', `Created CNC Ticket ${formId} (${formMoldName})`, 'success');
        return [updatedData, ...prev];
      }
    });

    setIsFormOpen(false);
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(t => {
      // Tab Filter
      if (activeTab === 'Active' && (t.state === 'Fixed Properly' || t.state === 'Works (Not Fixed)')) return false;
      if (activeTab === 'Finished' && (t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)')) return false;

      // Status Filter
      if (statusFilter !== 'All' && t.state !== statusFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match = 
          t.id.toLowerCase().includes(query) ||
          t.moldName.toLowerCase().includes(query) ||
          t.machineNumber.toLowerCase().includes(query) ||
          (t.maintenanceInterval || '').toLowerCase().includes(query) ||
          (t.notes || '').toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [tickets, statusFilter, searchQuery, activeTab]);

  // Style helper for state badges
  const getStatusBadge = (state: CncTicket['state']) => {
    switch (state) {
      case 'Fixed Properly':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Works (Not Fixed)':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Has Other Issues':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Not Fixed':
      default:
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12 transition-all font-sans">
      
      {/* TITLE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-divider pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">CNC Mold Tickets</h1>
              <p className="text-xs text-tertiary">
                Manage mold transfers, mechanical maintenance intervals, and quality status reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button"
            onClick={handleExportAll}
            className="flex items-center justify-center gap-1.5 bg-surface border border-surface-elevated hover:bg-surface-elevated text-secondary font-medium py-2 px-4 rounded-lg text-xs cursor-pointer select-none transition-all shadow-sm active:scale-95"
            title="Export all tickets to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export All</span>
          </button>
          <button type="button"
            onClick={handleExportActive}
            className="flex items-center justify-center gap-1.5 bg-surface border border-surface-elevated hover:bg-surface-elevated text-secondary font-medium py-2 px-4 rounded-lg text-xs cursor-pointer select-none transition-all shadow-sm active:scale-95"
            title="Export active tickets to Excel"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Export Active</span>
          </button>
          <button type="button"
            id="btn-new-cnc-ticket"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer select-none transition-all shadow shadow-indigo-600/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New CNC Ticket</span>
          </button>
        </div>
      </div>

      {/* ACTIVE DUPLICATES NOTIFICATION BANNER */}
      {activeDuplicates.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start text-amber-500 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Duplication in the Molds Detected</h4>
            <p className="text-xs text-secondary mt-1">
              Warning: The following molds currently have multiple active workshop tickets:{" "}
              <span className="font-mono font-bold text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded-lg border border-amber-500/10">
                {activeDuplicates.map(name => {
                  const match = (tickets || []).find(t => t.moldName.trim().toLowerCase() === name);
                  return match?.moldName || name;
                }).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-4 border-b border-divider mb-1">
        <button
          type="button"
          onClick={() => { setActiveTab('Active'); setStatusFilter('All'); }}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'Active' ? 'text-indigo-400' : 'text-tertiary hover:text-secondary'
          }`}
        >
          Active Tickets
          {activeTab === 'Active' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('Finished'); setStatusFilter('All'); }}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'Finished' ? 'text-emerald-400' : 'text-tertiary hover:text-secondary'
          }`}
        >
          Finished & Closed
          {activeTab === 'Finished' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full shadow-[0_-2px_10px_rgba(16,185,129,0.5)]" />
          )}
        </button>
      </div>

      {/* SEARCH AND CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface border border-divider p-4 rounded-xl shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
          <input
            id="cnc-search-query"
            type="text"
            placeholder="Search tickets by ID, product mold, machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-canvas border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors text-primary placeholder:text-quinary font-semibold"
          />
          {searchQuery && (
            <button type="button" 
              id="btn-clear-search"
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <label htmlFor="cnc-status-filter" className="text-xs text-tertiary font-bold whitespace-nowrap">Status:</label>
          <select
            id="cnc-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 text-xs bg-canvas border border-divider rounded-lg p-2 font-bold text-secondary outline-none focus:border-indigo-500"
          >
            <option value="All">All Tickets</option>
            <option value="Fixed Properly">Fixed Properly</option>
            <option value="Works (Not Fixed)">Works (Not Fixed)</option>
            <option value="Not Fixed">Not Fixed</option>
            <option value="Has Other Issues">Has Other Issues</option>
          </select>
        </div>
      </div>

      {/* SIMPLIFIED SPREADSHEET TABLE */}
      <div className="bg-surface border border-divider rounded-xl overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-canvas border-b border-divider text-[10px] uppercase tracking-widest text-quaternary font-bold">
                <th className="text-center px-6 py-4 font-semibold text-sm">Ticket Number</th>
                <th className="text-center px-6 py-4 font-semibold text-sm">Product Name</th>
                <th className="text-center px-6 py-4 font-semibold text-sm text-center">Machine Number</th>
                <th className="text-center px-6 py-4 text-center font-semibold text-sm">Mold Transfer Date</th>
                <th className="text-center px-6 py-4 text-center font-semibold text-sm">Maintenance Interval</th>
                <th className="text-center px-6 py-4 text-center font-semibold text-sm">Status</th>
                <th className="text-center px-6 py-4 text-center font-semibold text-sm">Closing Date</th>
                <th className="text-center px-6 py-4 font-semibold text-sm w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider font-semibold text-primary">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-tertiary bg-slate-500/5">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Clock className="w-8 h-8 text-quaternary/40" />
                      <span className="font-bold text-primary">No Mold Tickets Found</span>
                      <p className="text-[11px] text-secondary">
                        Try refining your search terms or choosing a different status option.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    onClick={(e) => handleOpenEdit(ticket, e)}
                    className="hover:bg-surface-elevated/30 transition-colors cursor-pointer group"
                  >
                    {/* Ticket Number & Attachment indicator */}
                    <td className="text-center px-6 py-4 font-mono font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{ticket.id}</span>
                        {ticket.image ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageFilter('normal');
                              setLightboxTicket(ticket);
                            }}
                            className="p-1 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all flex items-center justify-center"
                            title="View attached scanned paper document"
                          >
                            <FileText className="w-3.5 h-3.5 animate-pulse" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Auto generate a high-quality mockup scanned compliance sheet
                              const mock = generateMockPaperScan(ticket.id, ticket.moldName, ticket.machineNumber, ticket.dateSent);
                              const updated = { ...ticket, image: mock };
                              setTickets(prev => prev.map(item => item.id === ticket.id ? updated : item));
                              setImageFilter('normal');
                              setLightboxTicket(updated);
                              logAction('CNC Ticket Scan Simulated', `Generated mock paper scan for ${ticket.id}`, 'info');
                            }}
                            className="p-1 text-quaternary hover:text-indigo-400 rounded-lg transition-all opacity-40 group-hover:opacity-100 hover:bg-surface-elevated/80 flex items-center justify-center"
                            title="No paper scan attached. Click to simulate a scanner snapshot!"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="text-center px-6 py-4 max-w-[200px] truncate font-bold text-primary" dir="auto">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="truncate">{ticket.moldName}</span>
                        {activeDuplicates.includes(ticket.moldName.trim().toLowerCase()) && (ticket.state !== 'Fixed Properly' && ticket.state !== 'Works (Not Fixed)') && (
                          <span 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold shrink-0"
                            title="Warning: There is another active ticket for this mold!"
                          >
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>DUPLICATE</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Machine Number */}
                    <td className="text-center px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-block bg-canvas border border-divider px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-secondary">
                        {ticket.machineNumber}
                      </span>
                    </td>

                    {/* Mold Transfer Date */}
                    <td className="text-center px-6 py-4 text-center font-mono text-secondary whitespace-nowrap">
                      {ticket.dateSent}
                    </td>

                    {/* Maintenance Interval */}
                    <td className="text-center px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-block bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-lg text-[11px] font-medium">
                        {calculateInterval(ticket.dateSent, ticket.closingDate)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="text-center px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(ticket.state)}`}>
                        {ticket.state}
                      </span>
                    </td>

                    {/* Closing Date */}
                    <td className="text-center px-6 py-4 text-center font-mono text-secondary whitespace-nowrap">
                      {ticket.closingDate || <span className="text-quaternary">-</span>}
                    </td>

                    {/* Actions */}
                    <td className="text-center px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button"
                          id={`btn-edit-${ticket.id}`}
                          onClick={(e) => handleOpenEdit(ticket, e)}
                          className="p-1.5 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-secondary transition-all"
                          title="Edit Ticket"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button"
                          id={`btn-delete-${ticket.id}`}
                          onClick={(e) => handleDelete(ticket.id, e)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-tertiary hover:text-red-500 transition-all"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW/EDIT MODAL FORM DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-divider flex items-center justify-between bg-surface-elevated/20">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-500" />
                  {editingTicket ? `Edit CNC Ticket: ${formId}` : 'New CNC Workshop Ticket'}
                </h3>
                <p className="text-[10px] text-tertiary mt-0.5">
                  Enter diagnostic specifications and technician status.
                </p>
              </div>
              <button type="button" 
                id="btn-close-modal"
                onClick={() => setIsFormOpen(false)}
                className="text-tertiary hover:text-primary transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* CNC Ticket Number */}
                <div>
                  <label htmlFor="form-id" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Ticket Number</label>
                  <input
                    id="form-id"
                    type="text"
                    required
                    placeholder="e.g. CNC-101"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors uppercase"
                  />
                </div>

                {/* Product Name (Mold Name) */}
                <div>
                  <label htmlFor="form-mold-name" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Product Name / Mold Name</label>
                  <input
                    id="form-mold-name"
                    type="text"
                    required
                    placeholder="e.g. Pump Head Mold"
                    value={formMoldName}
                    onChange={(e) => setFormMoldName(e.target.value)}
                    className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                  />
                  {isFormMoldDuplicate && (formState !== 'Fixed Properly' && formState !== 'Works (Not Fixed)') && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-medium leading-normal animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <span>
                        <strong>Duplicate Active Mold Warning:</strong> This mold currently has another active (unfixed) ticket. Creating this ticket will result in duplication.
                      </span>
                    </div>
                  )}
                </div>

                {/* Grid row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Machine Number */}
                  <div>
                    <label htmlFor="form-machine-number" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Machine Number</label>
                    <select
                      id="form-machine-number"
                      value={formMachineNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormMachineNumber(val);
                        const mach = machineOptions.find(m => m.value === val);
                        if (mach && mach.moldName) {
                          setFormMoldName(mach.moldName);
                        }
                      }}
                      className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                    >
                      {machineOptions.map(m => (
                        <option key={m.id} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mold Transfer Date */}
                  <div>
                    <label htmlFor="form-date-sent" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Mold Transfer Date</label>
                    <input
                      id="form-date-sent"
                      type="date"
                      required
                      value={formDateSent}
                      onChange={(e) => setFormDateSent(e.target.value)}
                      className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Grid row 2 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Calculated Maintenance Interval */}
                  <div className="flex flex-col justify-center pb-0.5">
                    <label className="block text-[11px] font-bold text-tertiary mb-1 uppercase tracking-wider">Maintenance Interval</label>
                    <div className="px-4 py-2 bg-canvas/40 border border-divider rounded-lg flex items-center gap-1.5 min-h-[34px]">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs font-mono font-bold text-secondary">
                        {calculateInterval(formDateSent, (formState === 'Fixed Properly' || formState === 'Works (Not Fixed)') ? (formClosingDate || TODAY_STR) : undefined)}
                      </span>
                    </div>
                  </div>

                  {/* Status / State */}
                  <div>
                    <label htmlFor="form-state" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Status</label>
                    <select
                      id="form-state"
                      value={formState}
                      onChange={(e) => {
                        const nextVal = e.target.value as CncTicket['state'];
                        setFormState(nextVal);
                        if ((nextVal === 'Fixed Properly' || nextVal === 'Works (Not Fixed)') && !formClosingDate) {
                          setFormClosingDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Not Fixed">Not Fixed</option>
                      <option value="Fixed Properly">Fixed Properly</option>
            <option value="Works (Not Fixed)">Works (Not Fixed)</option>
                      <option value="Has Other Issues">Has Other Issues</option>
                    </select>
                  </div>
                </div>

                {/* Closing Date (conditional) */}
                {(formState === 'Fixed Properly' || formState === 'Works (Not Fixed)') && (
                  <div>
                    <label htmlFor="form-closing-date" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Closing Date</label>
                    <input
                      id="form-closing-date"
                      type="date"
                      required
                      value={formClosingDate}
                      onChange={(e) => setFormClosingDate(e.target.value)}
                      className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}

                {/* Notes / Remarks */}
                <div>
                  <label htmlFor="form-notes" className="block text-[11px] font-bold text-secondary mb-1 uppercase tracking-wider">Notes & Remarks</label>
                  <textarea
                    id="form-notes"
                    rows={2}
                    placeholder="Provide troubleshooting logs, milling notes or replacement detail info..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-canvas text-primary border border-divider rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors resize-none"
                  ></textarea>
                </div>

                {/* Scanned Paper / Document Attachment Container */}
                <div className="border border-divider rounded-lg p-3 bg-canvas/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Scanned Paper / Document Attachment</span>
                    {formImage && (
                      <button
                        type="button"
                        onClick={() => setFormImage('')}
                        className="text-[10px] font-bold text-red-500 hover:text-red-400 flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Remove Scan
                      </button>
                    )}
                  </div>

                  {formImage ? (
                    <div className="relative group rounded-lg overflow-hidden border border-divider max-h-[140px] flex items-center justify-center bg-black/40 p-4">
                      {formImage.startsWith('data:application/pdf') ? (
                        <div className="flex flex-col items-center gap-2 text-indigo-400">
                          <FileText className="w-10 h-10" />
                          <span className="text-[10px] font-bold text-secondary">PDF Attached</span>
                        </div>
                      ) : (
                        <img 
                          src={formImage} 
                          alt="Scanned Paper Preview" 
                          className="max-h-[140px] w-auto object-contain"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const dummy = { id: formId || 'CNC-NEW', moldName: formMoldName || 'Preview Mold', machineNumber: formMachineNumber || 'MK 1', dateSent: formDateSent || TODAY_STR, state: formState, notes: formNotes, image: formImage };
                            setImageFilter('normal');
                            setLightboxTicket(dummy as any);
                          }}
                          className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Full View
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`border border-dashed rounded-lg p-4 text-center transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-divider bg-canvas/20'}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {isCameraActive ? (
                        <div className="flex flex-col items-center gap-2">
                          <video 
                            ref={videoRef}
                            className="w-full max-h-[180px] object-cover rounded-lg border border-divider bg-black"
                            playsInline
                            muted
                          />
                          <div className="flex gap-2 w-full justify-center">
                            <button
                              type="button"
                              onClick={captureSnapshot}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                            >
                              <Camera className="w-3.5 h-3.5" /> Capture Frame
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {/* Real File Input */}
                            <label className="flex items-center justify-center gap-1.5 bg-surface-elevated hover:bg-divider border border-divider px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-secondary cursor-pointer transition-all active:scale-95">
                              <Upload className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Upload Scan / Photo</span>
                              <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                              />
                            </label>



                          </div>
                          <p className="text-[10px] text-tertiary">
                            Upload a photo, use your webcam, or use a high-quality scanned paper report document.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Action buttons footer */}
              <div className="p-4 border-t border-divider flex items-center justify-center gap-2 bg-surface-elevated/20">
                <button
                  id="btn-form-cancel"
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setIsFormOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-form-submit"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/10"
                >
                  {editingTicket ? 'Apply Changes' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR SCANNED PAPERS */}
      {lightboxTicket && lightboxTicket.image && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {/* Download button */}
            <a
              href={lightboxTicket.image}
              download={`CNC-Scan-${lightboxTicket.id}.jpg`}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all select-none"
            >
              <Upload className="w-4 h-4 rotate-180" />
              <span>Download File</span>
            </a>
            
            {/* Close button */}
            <button type="button"
              onClick={() => setLightboxTicket(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 items-stretch max-h-[85vh] overflow-y-auto md:overflow-hidden p-2">
            {/* Left side: Scanned Paper Container */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4 relative min-h-[350px]">
              {lightboxTicket.image.startsWith('data:application/pdf') ? (
                <iframe
                  src={lightboxTicket.image}
                  className="w-full h-full min-h-[70vh] rounded-lg bg-white"
                  title="PDF Document Viewer"
                />
              ) : (
                <img
                  src={lightboxTicket.image}
                  alt="Full Scanned Document"
                  className="max-h-[70vh] max-w-full object-contain shadow-2xl transition-all duration-200"
                  style={{
                    filter: 
                      imageFilter === 'grayscale' ? 'contrast(1.65) grayscale(1) brightness(0.95)' :
                      imageFilter === 'negative' ? 'invert(1) hue-rotate(180deg) contrast(1.2) brightness(1)' :
                      'none'
                  }}
                />
              )}
            </div>

            {/* Right side: Meta Specifications Panel */}
            <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between text-white shrink-0">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                    CNC DOCUMENT SCAN
                  </span>
                  <h3 className="text-lg font-bold mt-2.5 font-mono text-white">
                    Ticket Ref: {lightboxTicket.id}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Attached paper inspection report and mechanical logs.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Product Name:</span>
                    <span className="font-bold text-slate-200">{lightboxTicket.moldName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Machine Number:</span>
                    <span className="font-mono font-bold text-slate-200">{lightboxTicket.machineNumber}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Transfer Date:</span>
                    <span className="font-mono text-slate-200">{lightboxTicket.dateSent}</span>
                  </div>
                  {lightboxTicket.closingDate && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Closing Date:</span>
                      <span className="font-mono text-slate-200">{lightboxTicket.closingDate}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 animate-pulse">
                    <span className="text-slate-400">Workforce Status:</span>
                    <span className={`font-bold ${
                      (lightboxTicket.state === 'Fixed Properly' || lightboxTicket.state === 'Works (Not Fixed)') ? 'text-green-400' :
                      lightboxTicket.state === 'Has Other Issues' ? 'text-red-400' : 'text-amber-400'
                    }`}>{lightboxTicket.state}</span>
                  </div>
                </div>

                {lightboxTicket.notes && (
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Workshop Remarks:</span>
                    <p className="text-xs text-slate-300 mt-1 italic leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800" dir="auto">
                      "{lightboxTicket.notes}"
                    </p>
                  </div>
                )}

                {/* Scan filter selection to enhance text readability */}
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Enhance Readability:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button type="button"
                      onClick={() => setImageFilter('normal')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        imageFilter === 'normal' 
                          ? 'bg-indigo-600 text-white border-indigo-500' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Original
                    </button>
                    <button type="button"
                      onClick={() => setImageFilter('grayscale')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        imageFilter === 'grayscale' 
                          ? 'bg-indigo-600 text-white border-indigo-500' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Increases black contrast, ideal for pencil handwriting"
                    >
                      B&W Scan
                    </button>
                    <button type="button"
                      onClick={() => setImageFilter('negative')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        imageFilter === 'negative' 
                          ? 'bg-indigo-600 text-white border-indigo-500' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Inverts colors, ideal for dark screen blueprints"
                    >
                      Blueprint
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-4 md:mt-0">
                Use B&W Scan to read dim pencil marks on the shop floor.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
