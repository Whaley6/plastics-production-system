import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { useJobTitles } from '../hooks/useJobTitles';
import { useShifts } from '../hooks/useShifts';
import { logAction } from '../utils/logger';
import { Search, Plus, Download, Upload, Filter, MoreVertical, ShieldAlert, ShieldX, X, User, Phone, Calendar, Shirt, Database, PlusCircle, Save, Trash2, RefreshCw, MapPin, GraduationCap, Heart, Home, Clock, Users, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { WorkerScheduleAndKPI } from '../components/WorkerScheduleAndKPI';
import { getCurrentShiftGroup, getActiveWorkersNow } from '../utils/shiftLogic';

const INITIAL_WORKERS = [
 { 
 id: 'W-9201', name: 'John Aris', jobTitle: 'مشغل', shift: 'A', status: 'Active', alerts: 2, absences: 1,
 mobile: '+1 555-0101', startDate: '2023-01-15', maritalStatus: 'Married', address: '123 Main St, Factory Ville', education: 'High School Diploma',
 ppe: { shirt: 'L', shoes: 42 }, 
 customData: { 'Forklift Cert': 'Level 2 - Up to 5T', 'Union Member': 'Yes' },
 actionHistory: [
 { date: '2023-06-10', type: 'Verbal Warning', reason: 'Late for shift without notice' },
 { date: '2023-09-22', type: 'First Written Warning', reason: 'Safety violation on factory floor' }
 ]
 },
 { 
 id: 'W-9204', name: 'Sarah Chen', jobTitle: 'موظف جودة', shift: 'B', status: 'Active', alerts: 0, absences: 0,
 mobile: '+1 555-0102', startDate: '2022-11-01', maritalStatus: 'Single', address: '456 Oak Ave, Industrial Park', education: 'B.Sc. Industrial Engineering',
 ppe: { shirt: 'S', shoes: 38 }, 
 customData: { 'First Aid': 'Certified (Expires 2027)' },
 actionHistory: []
 },
 { 
 id: 'W-9208', name: 'Mike Ross', jobTitle: 'مشغل', shift: 'C', status: 'Active', alerts: 4, absences: 2,
 mobile: '+1 555-0103', startDate: '2021-03-10', maritalStatus: 'Divorced', address: '789 Pine Rd, Works Town', education: 'Vocational Training',
 ppe: { shirt: 'XL', shoes: 44 }, 
 customData: {},
 actionHistory: [
 { date: '2021-08-14', type: 'Verbal Warning', reason: 'Missing PPE' },
 { date: '2022-01-05', type: 'First Written Warning', reason: 'Unexcused absence' },
 { date: '2022-06-11', type: 'Second Written Warning', reason: 'Argument with supervisor' },
 { date: '2023-02-28', type: 'Final Warning', reason: 'Repeated tardiness' }
 ]
 },
 { 
 id: 'W-9112', name: 'Sarah Williams', jobTitle: 'عامل تعبئة و تغليف', shift: 'A', status: 'Terminated', alerts: 5, absences: 3,
 mobile: '+1 555-0104', startDate: '2019-05-20', maritalStatus: 'Married', address: '101 Cedar Ln, Warehouse District', education: 'High School Diploma',
 ppe: { shirt: 'M', shoes: 39 }, 
 customData: { 'Exit Interview': 'Completed' },
 actionHistory: [
 { date: '2023-11-01', type: 'Termination', reason: 'Multiple safety violations resulting in damage to equipment' }
 ]
 },
];

const INITIAL_SCHEMA = [
 { key: 'Forklift Cert', type: 'text' },
 { key: 'First Aid', type: 'text' },
 { key: 'Union Member', type: 'text' }, // simplified to text for editing ease
 { key: 'Exit Interview', type: 'text' }
];

export default function WorkerManagement() {
  const [jobTitles] = useJobTitles();
  const [shifts] = useShifts();
 const isViewer = false;
 const [searchTerm, setSearchTerm] = useState('');
 const [shiftFilter, setShiftFilter] = useState('All');
 const [dateFilterStart, setDateFilterStart] = useState('');
 const [dateFilterEnd, setDateFilterEnd] = useState('');
 const [jobTitleFilter, setJobTitleFilter] = useState('All');
 const [viewMode, setViewMode] = useState<'Active' | 'Terminated' | 'Schedule'>('Active');
   const { user } = useAuth();
  const activeRoleId = user?.role || 'super-admin';
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || defaultRoles.find((r: any) => r.id === activeRoleId) || defaultRoles[0];
  const canViewAll = activeRole && activeRole.permissions && activeRole.permissions.workers_view_all !== undefined ? activeRole.permissions.workers_view_all : true;
  const isReadOnly = activeRole?.permissions?.workers_readonly === true;

  const [workers, setWorkers] = useLocalStorage('workers_data', INITIAL_WORKERS);

  React.useEffect(() => {
    // Migration: fix old english titles
    if (workers && workers.length > 0) {
      const needsMigration = workers.some((w: any) => 
        w.jobTitle === 'Forklift Operator' || 
        w.jobTitle === 'QA Inspector' || 
        w.jobTitle === 'Machine Operator' || 
        w.jobTitle === 'Packager'
      );
      if (needsMigration) {
        const migrated = workers.map((w: any) => {
          if (w.jobTitle === 'Forklift Operator') return { ...w, jobTitle: 'مشغل' };
          if (w.jobTitle === 'QA Inspector') return { ...w, jobTitle: 'موظف جودة' };
          if (w.jobTitle === 'Machine Operator') return { ...w, jobTitle: 'مشغل' };
          if (w.jobTitle === 'Packager') return { ...w, jobTitle: 'عامل تعبئة و تغليف' };
          return w;
        });
        setWorkers(migrated);
      }
    }
  }, [workers, setWorkers]);
  const [schema, setSchema] = useLocalStorage('workers_schema', INITIAL_SCHEMA);

  const visibleWorkers = canViewAll ? workers : workers.filter((w: any) => 
    activeRole && activeRole.permissions && Array.isArray(activeRole.permissions.workers_view_titles) && activeRole.permissions.workers_view_titles.includes(w.jobTitle)
  );
  
  const [customSchedules] = useLocalStorage<Record<string, Record<string, string>>>('custom_shift_schedules', {});
  const [customPatterns] = useLocalStorage<Record<string, string>>('custom_shift_patterns', {});
  const [customAnchors] = useLocalStorage<Record<string, { dateKey: string, state: string }>>('custom_cycle_anchors', {});
  const [globalShiftOffset] = useLocalStorage<number>('global_shift_offset', 0);


  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [editForm, setEditForm] = useState<any>(null);
 
 const [isAdding, setIsAdding] = useState(false);
 const [addForm, setAddForm] = useState<any>({
 id: '', name: '', jobTitle: '', shift: 'A', status: 'Active', alerts: 0, absences: 0,
 mobile: '', startDate: new Date().toISOString().split('T')[0], maritalStatus: '', address: '', education: '',
 ppe: { shirt: 'M', shoes: 40 }, customData: {}, actionHistory: []
 });

 const [isWarning, setIsWarning] = useState(false);
 const [warningLevel, setWarningLevel] = useState('Verbal Warning');
 const [warningReason, setWarningReason] = useState('');
 const [warningDate, setWarningDate] = useState(new Date().toISOString().split('T')[0]);

 const [isAbsence, setIsAbsence] = useState(false);
 const [absenceType, setAbsenceType] = useState('غياب');
 const [absenceReason, setAbsenceReason] = useState('');
 const [absencePhoto, setAbsencePhoto] = useState<string | null>(null);
 const [zoomedImage, setZoomedImage] = useState<string | null>(null);

 const selectedWorker = visibleWorkers.find((w: any) => w.id === selectedWorkerId);

 const handleOpenEdit = () => {
 setEditForm(JSON.parse(JSON.stringify(selectedWorker))); // deep copy
 setIsEditing(true);
 };

 const handleSaveEdit = () => {
 const originalWorker = visibleWorkers.find((w: any) => w.id === selectedWorkerId);
 if (originalWorker) {
   const changes = Object.keys(editForm).filter(k => {
     const oldVal = (originalWorker as any)[k];
     const newVal = (editForm as any)[k];
     if (typeof oldVal === 'object' || typeof newVal === 'object') return false;
     return oldVal !== newVal && k !== 'actionHistory';
   });
   const changeDetails = changes.map(k => `${k}: ${(originalWorker as any)[k]} -> ${(editForm as any)[k]}`).join(', ');
   logAction('Worker Updated', `Worker ${editForm.name} (${editForm.id}) was updated.${changeDetails ? ` Changes: ${changeDetails}` : ''}`, 'info');
 }
 // If we changed ID, handle correctly by mapping the OLD ID, but editForm has the NEW ID.
 // Actually, in handleSaveEdit we map by w.id === selectedWorkerId (because editForm.id might have been typed differently).
 setWorkers(prev => prev.map(w => w.id === selectedWorkerId ? editForm : w));
 setSelectedWorkerId(editForm.id);
 setIsEditing(false);
 };

 const handleAddWorker = () => {
 if (!addForm.name.trim() || !addForm.id.trim()) return;
 setWorkers(prev => [...prev, addForm]);
 const details = Object.entries(addForm).map(([k, v]) => `${k}: ${v}`).join(', ');
 logAction('Worker Added', `New worker ${addForm.name} (${addForm.id}) was added. Added: ${details}`, 'success');
 setIsAdding(false);
 setAddForm({
 id: '', name: '', jobTitle: '', shift: 'A', status: 'Active', alerts: 0, absences: 0,
 mobile: '', startDate: new Date().toISOString().split('T')[0], maritalStatus: '', address: '', education: '',
 ppe: { shirt: 'M', shoes: 40 }, customData: {}, actionHistory: []
 });
 };

 const handleIssueWarning = () => {
 if (!selectedWorker) return;
 
 let isTermination = warningLevel === 'Termination';
 const newAction = {
 date: warningDate,
 type: warningLevel,
 reason: warningReason || 'No reason provided'
 };

 setWorkers(prev => prev.map(w => {
 if (w.id === selectedWorker.id) {
 return {
 ...w,
 alerts: isTermination ? 5 : w.alerts + 1,
 status: isTermination ? 'Terminated' : w.status,
 actionHistory: [...(w.actionHistory || []), newAction]
 };
 }
 return w;
 }));
 logAction('Worker Warning Issued', `Issued "${warningLevel}" to ${selectedWorker.name} (${selectedWorker.id}). Reason: ${warningReason}`, warningLevel === 'Termination' ? 'error' : 'warning');
 setIsWarning(false);
 setWarningReason('');
 setWarningLevel('Verbal Warning');
 setWarningDate(new Date().toISOString().split('T')[0]);
 };

 const handleLogAbsence = () => {
 if (!selectedWorker) return;

 const newAction = {
 date: new Date().toISOString().split('T')[0],
 type: 'Absence',
 absenceType: absenceType,
 reason: absenceReason || 'No reason provided',
 photo: absencePhoto
 };

 setWorkers(prev => prev.map(w => {
 if (w.id === selectedWorker.id) {
 return {
 ...w,
 absences: (w.absences || 0) + (absenceType === 'غياب' ? 1 : 0),
 actionHistory: [...(w.actionHistory || []), newAction]
 };
 }
 return w;
 }));
 logAction('Worker Absence Logged', `Logged absence (${absenceType}) for ${selectedWorker.name} (${selectedWorker.id}). Reason: ${absenceReason || 'None'}`, 'warning');
 setIsAbsence(false);
 setAbsenceReason('');
 setAbsenceType('غياب');
 setAbsencePhoto(null);
 };

 const handleRemoveWarning = (idx: number) => {
 if (!selectedWorker) return;
 
 setWorkers(prev => prev.map(w => {
 if (w.id === selectedWorker.id) {
 const newHistory = [...(w.actionHistory || [])];
 const removedItem = newHistory[idx];
 newHistory.splice(idx, 1);
 
 let newAlerts = w.alerts;
 let newAbsences = w.absences || 0;
 
 if (removedItem && removedItem.type === 'Absence') {
 if (removedItem.absenceType === 'غياب' || !removedItem.absenceType) {
 newAbsences = Math.max(0, newAbsences - 1);
 }
 } else if (removedItem && removedItem.type !== 'System Note') {
 newAlerts = Math.max(0, w.alerts - 1);
 }
 
 return { ...w, actionHistory: newHistory, alerts: newAlerts, absences: newAbsences };
 }
 return w;
 }));
 logAction('Worker Action Removed', `Removed an action record for ${selectedWorker.name} (${selectedWorker.id})`, 'info');
 };

  const handleRevokeTermination = () => {
    if (!selectedWorker) return;
    setWorkers(prev => prev.map(w => {
      if (w.id === selectedWorker.id) {
        const reinstateNote = {
          date: new Date().toISOString().split('T')[0],
          type: 'System Note',
          reason: 'Termination dynamically revoked by Administrator.'
        };
        const previousAlerts = (w.actionHistory || []).filter((a: any) => a.type !== 'System Note' && a.type !== 'Termination' && a.type !== 'Absence').length;
        return { ...w, status: 'Active', alerts: previousAlerts, actionHistory: [...(w.actionHistory || []), reinstateNote] };
      }
      return w;
    }));
    logAction('Worker Termination Revoked', `Revoked termination for ${selectedWorker.name} (${selectedWorker.id}). Set to Active.`, 'success');
    setViewMode('Active');
  };

  const [trash, setTrash] = useLocalStorage<any[]>('trash_data', []);

  const handleDeleteWorker = () => {
    if (!selectedWorker) return;
    if (confirm(`Move ${selectedWorker.name} to trash? It can be restored within 30 days.`)) {
      const trashItem = {
        id: selectedWorker.id,
        type: 'worker',
        name: selectedWorker.name,
        data: selectedWorker,
        deletedAt: new Date().toISOString()
      };
      setTrash(prev => [...prev, trashItem]);
      setWorkers(prev => prev.filter(w => w.id !== selectedWorker.id));
      logAction('Worker Deleted', `Worker ${selectedWorker.name} (${selectedWorker.id}) was moved to trash. Removed: name: ${selectedWorker.name}, jobTitle: ${selectedWorker.jobTitle}, shift: ${selectedWorker.shift}, type: Worker`, 'warning');
      setSelectedWorkerId(null);
    }
  };

 const processImportedData = (importedData: any[]) => {
 logAction('Data Imported', `Initiated data import.`, 'info');
 setWorkers(prev => {
 const existingIds = new Set(prev.map(w => w.id));
 const newWorkers = importedData.filter(w => w.id && !existingIds.has(w.id));
 const updatedWorkers = importedData.filter(w => w.id && existingIds.has(w.id));
 
 const merged = prev.map(w => {
 const matchingUpdated = updatedWorkers.find(uw => uw.id === w.id);
 if (matchingUpdated) {
 return { ...w, ...matchingUpdated };
 }
 return w;
 });
 
 alert(`Imported ${newWorkers.length} new workers. Updated ${updatedWorkers.length} existing workers.`);
 return [...merged, ...newWorkers];
 });
 };

 const handleExport = async () => {
    logAction('Data Exported', `Exported worker database.`, 'info');
    
    const workbook = new ExcelJS.Workbook();
    
    const baseColumns = [
      { header: 'Workers Code', key: 'ID', width: 15 },
      { header: 'Full Name', key: 'Name', width: 25 },
      { header: 'Job Title', key: 'JobTitle', width: 20 },
      { header: 'Shift', key: 'Shift', width: 10 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Alerts', key: 'Alerts', width: 10 },
      { header: 'Absences', key: 'Absences', width: 10 },
      { header: 'Mobile', key: 'Mobile', width: 20 },
      { header: 'Start Date', key: 'StartDate', width: 15 },
      { header: 'Marital Status', key: 'MaritalStatus', width: 15 },
      { header: 'Address', key: 'Address', width: 35 },
      { header: 'Education', key: 'Education', width: 20 },
      { header: 'PPE Shirt', key: 'PPE_Shirt', width: 15 },
      { header: 'PPE Shoes', key: 'PPE_Shoes', width: 15 }
    ];

    const generateSheet = (sheetName: string, subset: any[]) => {
      const maxActions = Math.max(1, ...subset.map(w => (w.actionHistory || []).length));
      const worksheet = workbook.addWorksheet(sheetName);
      
      const actionColumns = Array.from({ length: maxActions }).map((_, i) => ({
        header: `Action History ${i + 1}`, key: `ActionHistory_${i + 1}`, width: 45
      }));

      worksheet.columns = [...baseColumns, ...actionColumns];

      subset.forEach(w => {
        const rowData: any = {
          ID: w.id,
          Name: w.name,
          JobTitle: w.jobTitle,
          Shift: w.shift,
          Status: w.status,
          Alerts: w.alerts,
          Absences: w.absences || 0,
          Mobile: w.mobile,
          StartDate: w.startDate,
          MaritalStatus: w.maritalStatus || '',
          Address: w.address || '',
          Education: w.education || '',
          PPE_Shirt: w.ppe?.shirt || '',
          PPE_Shoes: w.ppe?.shoes || '',
        };
        
        const history = w.actionHistory || [];
        for (let i = 0; i < maxActions; i++) {
          if (i < history.length) {
             const a = history[i];
             rowData[`ActionHistory_${i + 1}`] = `[${a.date || ''}] ${a.type || ''}: ${a.reason || ''}`;
          } else {
             rowData[`ActionHistory_${i + 1}`] = '';
          }
        }
        
        worksheet.addRow(rowData);
      });

      worksheet.spliceRows(1, 0, []); 
      
      worksheet.mergeCells(1, baseColumns.length + 1, 1, baseColumns.length + maxActions);
      const topHeader = worksheet.getCell(1, baseColumns.length + 1);
      topHeader.value = 'Action History';
      topHeader.alignment = { horizontal: 'center', vertical: 'middle' };
      topHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      topHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      topHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      worksheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      for (let c = 1; c <= baseColumns.length; c++) {
        const val = worksheet.getCell(2, c).value;
        worksheet.mergeCells(1, c, 2, c);
        const cell = worksheet.getCell(1, c);
        cell.value = val;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
          });
        }
      });
    };

    const activeWorkers = visibleWorkers.filter((w: any) => w.status !== 'Terminated');
    const terminatedWorkers = visibleWorkers.filter((w: any) => w.status === 'Terminated');

    generateSheet('Active Workers', activeWorkers);
    generateSheet('Terminated Workers', terminatedWorkers);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workers_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

 const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const file = e.target.files[0];
 const reader = new FileReader();

 reader.onload = event => {
 try {
 const data = event.target?.result;
 if (file.name.endsWith('.json')) {
 const importedData = JSON.parse(data as string);
 if (Array.isArray(importedData)) {
 processImportedData(importedData);
 } else {
 alert("Invalid format: expected a JSON array of workers.");
 }
          } else {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const formattedData = jsonData.map((row: any) => {
              let ppeShirt = 'M';
              let ppeShoes = 40;
              if (row.PPE_Shirt) ppeShirt = String(row.PPE_Shirt).trim();
              if (row.PPE_Shoes) ppeShoes = Number(row.PPE_Shoes) || 40;
              
              let customData = {};
              try { if (row.CustomData && String(row.CustomData).trim() !== '') customData = JSON.parse(String(row.CustomData)); } catch(e){}
              
              let actionHistory: any[] = [];
              try { 
                // Read from all ActionHistory_1, ActionHistory_2 ... fields
                const keys = Object.keys(row).filter(k => k.startsWith('ActionHistory_') || k === 'Action History');
                for (const k of keys) {
                  const val = String(row[k]);
                  if (val && val.trim() !== '') {
                    // Try to parse JSON format just in case it was exported in old format
                    if (val.trim().startsWith('[')) {
                      try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                           actionHistory.push(...parsed);
                           continue;
                        }
                      } catch(e) {}
                    }
                    
                    // Otherwise parse string format: "[YYYY-MM-DD] Type: Reason"
                    const match = val.match(/^\[(.*?)\] (.*?): (.*)$/);
                    if (match) {
                      actionHistory.push({ date: match[1], type: match[2], reason: match[3] });
                    } else {
                      actionHistory.push({ date: new Date().toISOString().split('T')[0], type: 'System Note', reason: val });
                    }
                  }
                }
              } catch(e) {}


              return {
                id: row.ID ? String(row.ID).trim() : '',
                name: row.Name ? String(row.Name).trim() : '',
                jobTitle: row.JobTitle ? String(row.JobTitle).trim() : '',
                shift: row.Shift ? String(row.Shift).trim() : '',
                status: row.Status ? String(row.Status).trim() : 'Active',
                alerts: Number(row.Alerts) || 0,
                absences: Number(row.Absences) || 0,
                mobile: row.Mobile ? String(row.Mobile).trim() : '',
                startDate: row.StartDate ? String(row.StartDate).trim() : '',
                maritalStatus: row.MaritalStatus ? String(row.MaritalStatus).trim() : '',
                address: row.Address ? String(row.Address).trim() : '',
                education: row.Education ? String(row.Education).trim() : '',
                ppe: { shirt: ppeShirt, shoes: ppeShoes },
                customData,
                actionHistory
              };
            });

            processImportedData(formattedData);
          }
 } catch (err) {
 console.error(err);
 alert("Error parsing file. Please ensure it has the correct exported format.");
 }
 };
 
 if (file.name.endsWith('.json')) {
 reader.readAsText(file, "UTF-8");
 } else {
 reader.readAsArrayBuffer(file);
 }
 
 e.target.value = '';
 }
 };

 const addCustomField = () => {
 const fieldName = prompt("Enter new custom field name:");
 if (fieldName && !schema.find(s => s.key === fieldName)) {
 setSchema([...schema, { key: fieldName, type: 'text' }]);
 }
 };

 

  const shiftInfo = getCurrentShiftGroup(globalShiftOffset);
  const currentShiftWorkers = getActiveWorkersNow(visibleWorkers, customSchedules, customPatterns, customAnchors, globalShiftOffset);


  return (
 <div className="space-y-6 relative h-full flex flex-col">
 <div className="flex justify-between items-end border-b border-divider pb-5 shrink-0">
 <div>
 <h2 className="text-2xl font-bold tracking-tight text-primary">Worker Management</h2>
 <p className="mt-2 text-sm text-quinary">
 Manage employee profiles, shifts, and custom metadata fields.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-elevated rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors shadow-sm cursor-pointer">
 <Upload className="w-4 h-4" /> Import
 <input type="file" accept=".json,.xlsx,.xls" className="hidden" onChange={handleImport} />
 </label>
 <button type="button" onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-elevated rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors shadow-sm cursor-pointer">
 <Download className="w-4 h-4" /> Export
 </button>
 {!isViewer && (
   <button type="button" 
   onClick={() => setIsAdding(true)}
   className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white-fixed rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors shadow-sm"
   >
   <Plus className="w-4 h-4" /> Add Worker
   </button>
 )}
 </div>
 </div>




 <div className="bg-canvas/50 rounded-lg shadow-sm border border-divider-subtle overflow-hidden flex-1 flex flex-col min-h-0">
 {/* Tabs */}
 <div className="flex items-center justify-between border-b border-divider-subtle px-4 bg-surface/20 shrink-0">
  <div className="flex gap-4 self-end">
    <button type="button" 
      onClick={() => setViewMode('Active')}
      className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'Active' ? 'border-blue-500 text-blue-400' : 'border-transparent text-quinary hover:text-secondary'}`}
    >
      Active Workers
    </button>
    <button type="button" 
      onClick={() => setViewMode('Terminated')}
      className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'Terminated' ? 'border-red-500 text-red-400' : 'border-transparent text-quinary hover:text-secondary'}`}
    >
      Terminated Archive
    </button>
    <button type="button" 
      onClick={() => setViewMode('Schedule')}
      className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'Schedule' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-quinary hover:text-secondary'}`}
    >
      Shift Schedule
    </button>
  </div>
  
  <div 
    onClick={() => {
      setViewMode('Active');
      setShiftFilter('WorkingNow');
    }}
    className="flex items-center gap-6 cursor-pointer group py-2"
  >
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center gap-2">
        <Clock className="w-4 h-4 text-blue-400 group-hover:text-indigo-400 transition-colors" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-primary">Shift {shiftInfo.current}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-lg bg-surface border border-divider text-secondary">{shiftInfo.time}</span>
          </div>
        </div>
      </div>
      
      <ArrowRight className="w-3.5 h-3.5 text-quaternary group-hover:text-indigo-400/50 transition-colors" />
      
      <div>
        <span className="text-xs font-bold text-secondary group-hover:text-primary transition-colors">Shift {shiftInfo.next}</span>
      </div>
    </div>

    <div className="flex items-center gap-2 border-l border-divider pl-4">
      <Users className="w-4 h-4 text-emerald-400" />
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-primary">{currentShiftWorkers.length}</span>
        <span className="text-[10px] text-secondary">Present</span>
      </div>
    </div>
  </div>
 </div>

 {/* Toolbar */}
 {viewMode !== 'Schedule' && (
 <div className="p-4 border-b border-divider-subtle flex justify-between items-center bg-surface/20 shrink-0">
 <div className="relative w-96">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
 <input 
 type="text" 
 placeholder="Search by name or code..." 
 className="w-full pl-9 pr-4 py-2 bg-canvas border border-divider rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-secondary placeholder:text-quinary"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <div className="flex items-center justify-center gap-2">
 <div className="flex items-center bg-canvas border border-divider rounded-lg overflow-hidden">
 <input 
 type="date"
 value={dateFilterStart}
 onChange={(e) => setDateFilterStart(e.target.value)}
 className="bg-transparent text-xs px-2 py-1.5 outline-none text-secondary focus:bg-surface dark:[color-scheme:dark]"
 title="Start Date"
 />
 <span className="text-quaternary text-[10px] px-1 uppercase font-bold">to</span>
 <input 
 type="date"
 value={dateFilterEnd}
 onChange={(e) => setDateFilterEnd(e.target.value)}
 className="bg-transparent text-xs px-2 py-1.5 outline-none text-secondary focus:bg-surface dark:[color-scheme:dark]"
 title="End Date"
 />
 </div>
 {(dateFilterStart || dateFilterEnd) && (
 <button type="button" 
 onClick={() => { setDateFilterStart(''); setDateFilterEnd(''); }}
 className="text-quaternary hover:text-muted transition-colors mr-2"
 title="Clear date range"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 <Filter className="w-4 h-4 text-quaternary" />
 <select 
 value={jobTitleFilter}
 onChange={(e) => setJobTitleFilter(e.target.value)}
 className="bg-canvas border border-divider rounded-lg text-xs px-4 py-2 outline-none text-secondary focus:border-blue-500"
 >
 <option value="All">All Job Titles</option>
 {jobTitles.map((title: string) => (
   <option key={title} value={title}>{title}</option>
 ))}
 </select>
 <select 
 value={shiftFilter}
 onChange={(e) => setShiftFilter(e.target.value)}
 className="bg-canvas border border-divider rounded-lg text-xs px-4 py-2 outline-none text-secondary focus:border-blue-500"
 >
 <option value="All">All Shifts</option>
 <option value="WorkingNow">Working Now</option>
 {shifts.map((s: string) => <option key={s} value={s}>Shift {s}</option>)}
 
 </select>
 </div>
 </div>
 )}

 {/* Table / Schedule View */}
 {viewMode === 'Schedule' ? (
   <WorkerScheduleAndKPI workers={workers} isReadOnly={isReadOnly} />
 ) : (
 <div className="overflow-x-auto flex-1">
 <table className="w-full border-collapse">
 <thead>
 <tr className="border-b border-divider text-[13px] uppercase tracking-widest text-quaternary bg-surface/40">
 <th className="text-center px-6 py-4 font-semibold">Worker Code</th>
 <th className="text-center px-6 py-4 font-semibold">Full Name</th>
 <th className="text-center px-6 py-4 font-semibold">Job Title</th>
 <th className="text-center px-6 py-4 font-semibold">Shift</th>
 <th className="text-center px-6 py-4 font-semibold">Alerts</th>
 <th className="text-center px-6 py-4 font-semibold">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 bg-transparent">
 {visibleWorkers.filter((w: any) => {
 const matchesView = w.status === viewMode;
 const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || w.id.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesShift = shiftFilter === 'All' || (shiftFilter === 'WorkingNow' ? currentShiftWorkers.some((cw: any) => cw.id === w.id) : w.shift === shiftFilter);
 const matchesJobTitle = jobTitleFilter === 'All' || w.jobTitle === jobTitleFilter;
 const matchesDateStart = !dateFilterStart || w.startDate >= dateFilterStart;
 const matchesDateEnd = !dateFilterEnd || w.startDate <= dateFilterEnd;
 return matchesView && matchesSearch && matchesShift && matchesJobTitle && matchesDateStart && matchesDateEnd;
 }).map((worker) => (
 <tr 
 key={worker.id} 
 className="hover:bg-surface/50 transition-colors group cursor-pointer"
 onClick={() => setSelectedWorkerId(worker.id)}
 >
 <td className="text-center px-6 py-4 whitespace-nowrap text-base font-bold font-mono text-blue-400">
 {worker.id}
 </td>
 <td className="text-center px-6 py-4 whitespace-nowrap text-base font-semibold text-secondary">
 <div className="flex items-center justify-center gap-2">
 <bdi dir="auto">{worker.name}</bdi>
 {worker.status === 'Terminated' && <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-400">Terminated</span>}
 </div>
 </td>
 <td className="text-center px-6 py-4 whitespace-nowrap text-base font-semibold text-muted">
 <bdi dir="auto">{worker.jobTitle || '-'}</bdi>
 </td>
 <td className="text-center px-6 py-4 whitespace-nowrap text-base font-semibold text-quinary">
 {worker.shift}
 </td>
 <td className="text-center px-6 py-4 whitespace-nowrap">
 <div className="flex flex-col items-center gap-1.5">
 {worker.alerts > 0 ? (
 <div className="flex flex-wrap justify-center gap-1 max-w-[80px]" title={`${worker.alerts} active warnings`}>
 {(worker.actionHistory || [])
 .filter((a: any) => a.type !== 'System Note' && a.type !== 'Termination' && a.type !== 'Absence')
 .slice(0, worker.alerts)
 .map((warning: any, i: number) => {
 const colors = [
 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
 'bg-rose-700 shadow-[0_0_8px_rgba(225,29,72,0.6)]',
 'bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]',
 'bg-fuchsia-600 shadow-[0_0_8px_rgba(192,38,211,0.6)]'
 ];
 const dotColor = colors[Math.min(i, colors.length - 1)];
 return (
 <span 
 key={i} 
 className={`w-2 h-2 rounded-full cursor-help ${dotColor}`}
 title={`${warning.date} - ${warning.type}:\n${warning.reason}`}
 ></span>
 )
 })}
 </div>
 ) : (
 <span className="text-[10px] text-quinary">-</span>
 )}
 
 <div 
 className="flex justify-center gap-1 mt-0.5" 
 title={`Absences: ${worker.absences || 0}/3`}
 >
 {[...Array(3)].map((_, i) => (
 <span 
 key={i} 
 className={`w-2 h-2 rounded-sm ${i < (worker.absences || 0) ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'bg-surface-elevated/50 border border-surface-strong/30'}`}
 ></span>
 ))}
 </div>
 </div>
 </td>
 <td className="text-center px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex justify-center gap-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
 <span>View Profile &rarr;</span>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Add Worker Modal */}
 {isAdding && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setIsAdding(false)}></div>
 <div className="relative bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
 <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-canvas/50">
 <h3 className="text-lg font-bold text-primary-muted flex items-center gap-2"><User className="w-5 h-5 text-blue-400" /> Provision New Worker</h3>
 <button type="button" onClick={() => setIsAdding(false)} className="text-quaternary hover:text-muted transition-colors"><X className="w-5 h-5" /></button>
 </div>
 
 <div className="p-4 overflow-y-auto space-y-3">
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Full Name</label>
 <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Worker Code</label>
 <input type="text" value={addForm.id} onChange={e => setAddForm({...addForm, id: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary font-mono" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Job Title</label>
 <select value={addForm.jobTitle} onChange={e => setAddForm({...addForm, jobTitle: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 <option value="">Select Job Title</option>
 {jobTitles.map((title: string) => (
   <option key={title} value={title}>{title}</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Shift</label>
 <select value={addForm.shift} onChange={e => setAddForm({...addForm, shift: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 {shifts.map((s: string) => <option key={s} value={s}>Shift {s}</option>)}
 
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Mobile</label>
 <input type="text" value={addForm.mobile} onChange={e => setAddForm({...addForm, mobile: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Start Date</label>
 <input type="date" value={addForm.startDate} onChange={e => setAddForm({...addForm, startDate: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary dark:[color-scheme:dark]" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Marital Status</label>
 <select value={addForm.maritalStatus} onChange={e => setAddForm({...addForm, maritalStatus: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 <option value="">Select</option>
 <option value="Single">Single</option>
 <option value="Married">Married</option>
 <option value="Divorced">Divorced</option>
 <option value="Widowed">Widowed</option>
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Education</label>
 <input type="text" value={addForm.education} onChange={e => setAddForm({...addForm, education: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 </div>
 <div className="grid grid-cols-1 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Address</label>
 <input type="text" value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 </div>
 </div>
 
 <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 bg-canvas/50">
 <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-surface hover:bg-surface-elevated text-muted text-sm rounded-lg transition-colors border border-surface-elevated">Cancel</button>
 <button type="button" 
 onClick={handleAddWorker} 
 disabled={!addForm.name.trim() || !addForm.id.trim()}
 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-quaternary/40 disabled:cursor-not-allowed text-white-fixed text-sm rounded-lg transition-colors font-medium">
 Create Worker
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Disciplinary Action Modal */}
 {isWarning && selectedWorker && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setIsWarning(false)}></div>
 <div className="relative bg-surface border border-red-500/20 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
 <div className="px-6 py-4 border-b border-red-500/10 flex justify-between items-center bg-red-500/5">
 <h3 className="text-lg font-bold text-red-400 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Issue Action</h3>
 <button type="button" onClick={() => setIsWarning(false)} className="text-quaternary hover:text-muted transition-colors"><X className="w-5 h-5" /></button>
 </div>
 
 <div className="p-4 space-y-3">
 <p className="text-sm text-muted">
 You are issuing an action for <strong>{selectedWorker.name} ({selectedWorker.id})</strong>.
 Current alerts track: <strong>{selectedWorker.alerts}</strong>.
 </p>
 
 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Action Date</label>
 <input 
 type="date" 
 value={warningDate} 
 onChange={e => setWarningDate(e.target.value)}
 className="w-full bg-canvas border border-divider rounded-lg px-3 py-3 text-sm text-secondary focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:[color-scheme:dark]" 
 />
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Action Level</label>
 <select 
 value={warningLevel} 
 onChange={e => setWarningLevel(e.target.value)}
 className="w-full bg-canvas border border-divider rounded-lg px-3 py-3 text-sm text-secondary appearance-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
 >
 <option>Verbal Warning</option>
 <option>First Written Warning</option>
 <option>Second Written Warning</option>
 <option>Third Written Warning</option>
 <option>Final Warning</option>
 <option className="text-red-400 font-bold">Termination</option>
 </select>
 {warningLevel === 'Termination' && (
 <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
 <ShieldX className="w-3 h-3" /> This will archive the worker and revoke system access.
 </p>
 )}
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Reason</label>
 <textarea 
 value={warningReason}
 onChange={e => setWarningReason(e.target.value)}
 placeholder="Detail the reason for this action..."
 className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary focus:border-red-500 focus:ring-1 focus:ring-red-500 min-h-[80px] resize-none"
 />
 </div>
 </div>
 
 <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 bg-canvas/50">
 <button type="button" onClick={() => setIsWarning(false)} className="px-4 py-2 bg-surface hover:bg-surface-elevated text-muted text-sm rounded-lg transition-colors border border-surface-elevated">Cancel</button>
 <button type="button" onClick={handleIssueWarning} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white-fixed text-sm rounded-lg transition-colors font-bold">Confirm Action</button>
 </div>
 </div>
 </div>
 )}

 {/* Log Absence Modal */}
 {isAbsence && selectedWorker && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setIsAbsence(false)}></div>
 <div className="relative bg-surface border border-blue-500/20 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
 <div className="px-6 py-4 border-b border-blue-500/10 flex justify-between items-center bg-blue-500/5">
 <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Calendar className="w-5 h-5" /> Log Absence</h3>
 <button type="button" onClick={() => setIsAbsence(false)} className="text-quaternary hover:text-muted transition-colors"><X className="w-5 h-5" /></button>
 </div>
 
 <div className="p-6 space-y-4">
 <p className="text-sm text-muted">
 Logging unexpected absence for <strong>{selectedWorker.name}</strong>.
 </p>
 
 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Absence Type</label>
 <select 
 value={absenceType}
 onChange={e => setAbsenceType(e.target.value)}
 className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
 >
 <option value="غياب">غياب</option>
 <option value="اجازة قطع يوم">اجازة قطع يوم</option>
 <option value="زمنية">زمنية</option>
 <option value="اجازة مرضية">اجازة مرضية</option>
 </select>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Reason</label>
 <textarea 
 value={absenceReason}
 onChange={e => setAbsenceReason(e.target.value)}
 placeholder="e.g. Sickness, personal reasons, unexcused..."
 className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none"
 />
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-xs uppercase tracking-widest text-quaternary font-bold">Attach Photo (Optional)</label>
 <div className="flex items-center justify-center w-full">
 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-surface-elevated border-dashed rounded-lg cursor-pointer bg-canvas hover:bg-surface transition-colors relative overflow-hidden">
 {absencePhoto ? (
 <img 
   src={absencePhoto} 
   alt="Uploaded" 
   className="absolute inset-0 w-full h-full object-cover cursor-pointer" 
   onClick={(e) => {
     e.preventDefault();
     setZoomedImage(absencePhoto);
   }}
 />
 ) : (
 <div className="flex flex-col items-center justify-center pt-5 pb-6">
 <Upload className="w-8 h-8 mb-3 text-quaternary" />
 <p className="mb-2 text-sm text-quinary"><span className="font-semibold text-blue-400">Click to upload</span></p>
 <p className="text-xs text-quaternary">SVG, PNG, JPG or GIF</p>
 </div>
 )}
 <input 
 type="file" 
 className="hidden" 
 accept="image/*"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setAbsencePhoto(reader.result as string);
 };
 reader.readAsDataURL(file);
 }
 }} 
 />
 </label>
 </div>
 {absencePhoto && (
 <button type="button" onClick={() => setAbsencePhoto(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove photo</button>
 )}
 </div>
 </div>
 
 <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 bg-canvas/50">
 <button type="button" onClick={() => setIsAbsence(false)} className="px-4 py-2 bg-surface hover:bg-surface-elevated text-muted text-sm rounded-lg transition-colors border border-surface-elevated">Cancel</button>
 <button type="button" 
 onClick={handleLogAbsence} 
 disabled={!absenceReason.trim()}
 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-quaternary/40 text-white-fixed text-sm rounded-lg transition-colors font-bold"
 >
 Log Absence
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Slide-over Profile Drawer */}

 {selectedWorker && (
 <>
 <div 
 className="fixed inset-0 z-40 bg-canvas/60 backdrop-blur-sm transition-opacity" 
 onClick={() => { setSelectedWorkerId(null); setIsEditing(false); }}
 ></div>
 <div className="fixed inset-y-0 right-0 z-50 w-[450px] bg-canvas border-l border-divider shadow-2xl flex flex-col text-muted">
 {/* Header */}
 <div className="px-6 py-5 border-b border-divider flex items-center justify-between bg-surface/50">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-full bg-surface border border-surface-elevated flex items-center justify-center text-quinary">
 <User className="w-6 h-6" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-primary"><bdi dir="auto">{selectedWorker.name}</bdi></h3>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-xs font-mono text-blue-400">{selectedWorker.id}</span>
 <span className="text-[10px] uppercase text-quaternary">&bull;</span>
 <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedWorker.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
 {selectedWorker.status}
 </span>
 </div>
 </div>
 </div>
 <button type="button" 
 onClick={() => { setSelectedWorkerId(null); setIsEditing(false); }}
 className="p-2 text-quinary hover:text-secondary hover:bg-surface rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Profile Content */}
 <div className="flex-1 overflow-y-auto">
 <div className="p-6 space-y-8">
 {isEditing ? (
 <div className="space-y-6">
 <section>
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary mb-4 border-b border-divider-subtle pb-2">Edit Core Identity</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Worker Code</label>
 <input type="text" value={editForm.id} onChange={e => setEditForm({...editForm, id: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Name</label>
 <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Job Title</label>
 <select value={editForm.jobTitle} onChange={e => setEditForm({...editForm, jobTitle: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 <option value="">Select Job Title</option>
 {jobTitles.map((title: string) => (
   <option key={title} value={title}>{title}</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Mobile</label>
 <input type="text" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Start Date</label>
 <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary dark:[color-scheme:dark]" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Shift</label>
 <select value={editForm.shift} onChange={e => setEditForm({...editForm, shift: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 {shifts.map((s: string) => <option key={s} value={s}>Shift {s}</option>)}
 
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Marital Status</label>
 <select value={editForm.maritalStatus} onChange={e => setEditForm({...editForm, maritalStatus: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 <option value="">Select</option>
 <option value="Single">Single</option>
 <option value="Married">Married</option>
 <option value="Divorced">Divorced</option>
 <option value="Widowed">Widowed</option>
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Education</label>
 <input type="text" value={editForm.education} onChange={e => setEditForm({...editForm, education: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 <div className="flex flex-col gap-1 col-span-2">
 <label className="text-xs text-quinary">Address</label>
 <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 </div>
 </section>

 <section>
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary mb-4 border-b border-divider-subtle pb-2">Edit PPE & Equipment</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Shirt Size</label>
 <select value={editForm.ppe.shirt} onChange={e => setEditForm({...editForm, ppe: {...editForm.ppe, shirt: e.target.value}})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary">
 <option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option>
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs text-quinary">Shoe Size (EU)</label>
 <input type="number" value={editForm.ppe.shoes} onChange={e => setEditForm({...editForm, ppe: {...editForm.ppe, shoes: Number(e.target.value)}})} className="w-full bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary" />
 </div>
 </div>
 </section>


 </div>
 ) : (
 <>
 {/* Core Properties */}
 <section>
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary mb-4 border-b border-divider-subtle pb-2">Core Identity</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Mobile</span>
 <Phone className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary">{selectedWorker.mobile}</div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Job Title</span>
 <User className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary"><bdi dir="auto">{selectedWorker.jobTitle || '-'}</bdi></div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Start Date</span>
 <Calendar className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary flex justify-between items-center">
  <span>{selectedWorker.startDate || '-'}</span>
  {selectedWorker.startDate && (
    <span className="text-xs bg-surface-elevated px-1.5 py-0.5 rounded-lg text-quaternary">
      {Math.max(0, Math.floor((new Date().getTime() - new Date(selectedWorker.startDate).getTime()) / (1000 * 60 * 60 * 24)))} days
    </span>
  )}
 </div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Shift</span>
 <User className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-blue-400">{selectedWorker.shift}</div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Marital Status</span>
 <Heart className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary">{selectedWorker.maritalStatus || '-'}</div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Education</span>
 <GraduationCap className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary"><bdi dir="auto">{selectedWorker.education || '-'}</bdi></div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle col-span-2">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Address</span>
 <MapPin className="w-3 h-3 text-quaternary" />
 </div>
 <div className="text-sm font-medium text-secondary truncate" title={selectedWorker.address || '-'}><bdi dir="auto">{selectedWorker.address || '-'}</bdi></div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Absences</span>
 <Calendar className="w-3 h-3 text-quaternary" />
 </div>
 <div className="flex items-center gap-1 mt-2">
 {[...Array(3)].map((_, i) => (
 <span 
 key={i} 
 className={`w-3 h-3 rounded-sm ${i < (selectedWorker.absences || 0) ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'bg-surface-elevated/50 border border-surface-strong/30'}`}
 ></span>
 ))}
 <span className="text-xs font-medium text-quinary ml-2">{selectedWorker.absences || 0} / 3</span>
 </div>
 </div>
 <div className="bg-surface/30 p-3 rounded-lg border border-divider-subtle">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-quinary">Alerts / Warnings</span>
 <ShieldAlert className="w-3 h-3 text-quaternary" />
 </div>
 <div className={`text-sm font-medium ${selectedWorker.alerts > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
 {selectedWorker.alerts} Active
 </div>
 </div>
 </div>
 </section>

 {/* Logistics */}
 <section>
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary mb-4 border-b border-divider-subtle pb-2">PPE & Equipment</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex items-center justify-between bg-surface/30 p-3 rounded-lg border border-divider-subtle text-xs">
 <div className="flex items-center gap-2 text-quinary"><Shirt className="w-3 h-3" /> Shirt Size</div>
 <span className="font-bold text-secondary">{selectedWorker.ppe.shirt}</span>
 </div>
 <div className="flex items-center justify-between bg-surface/30 p-3 rounded-lg border border-divider-subtle text-xs">
 <div className="flex items-center gap-2 text-quinary"><Shirt className="w-3 h-3" /> Shoe Size</div>
 <span className="font-bold text-secondary">{selectedWorker.ppe.shoes} EU</span>
 </div>
 </div>
 </section>



 {/* Disciplinary History */}
 <section>
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary mb-4 border-b border-divider-subtle pb-2">Disciplinary History</h4>
 {(selectedWorker.actionHistory || []).filter((a:any) => a.type !== 'Absence').length > 0 ? (
 <div className="space-y-3">
 {(selectedWorker.actionHistory || [])
 .map((action: any, idx: number) => ({ action, idx }))
 .filter(({ action }: any) => action.type !== 'Absence')
 .map(({ action, idx }: any) => (
 <div key={idx} className={`p-3 rounded-lg border relative group ${action.type === 'Termination' || action.type === 'System Note' ? 'bg-surface/40 border-slate-300/50' : 'bg-amber-500/10 border-amber-500/20'}`}>
 <div className="flex justify-between items-center mb-1">
 <span className={`text-xs font-bold ${action.type === 'Termination' ? 'text-red-400' : action.type === 'System Note' ? 'text-blue-400' : 'text-amber-400'}`}>{action.type}</span>
 <span className="text-[10px] text-quaternary font-mono">{action.date}</span>
 </div>
 <div className="text-xs text-muted pr-6">{action.reason}</div>
 
 <button type="button" 
 onClick={() => handleRemoveWarning(idx)}
 className="absolute top-3 right-3 text-quaternary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" 
 title="Delete this record"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
 Clean record. No disciplinary actions found.
 </div>
 )}
 </section>

 {/* Absence History */}
 <section className="mt-8">
 <div className="flex items-center justify-between mb-4 border-b border-divider-subtle pb-2">
 <h4 className="text-[10px] uppercase font-bold tracking-widest text-quaternary">Absence History</h4>
 <button type="button" onClick={() => setIsAbsence(true)} className="text-[10px] flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20">
 <PlusCircle className="w-3 h-3" /> Log Absence
 </button>
 </div>
 {(selectedWorker.actionHistory || []).filter((a:any) => a.type === 'Absence').length > 0 ? (
 <div className="space-y-3">
 {(selectedWorker.actionHistory || [])
 .map((action: any, idx: number) => ({ action, idx }))
 .filter(({ action }: any) => action.type === 'Absence')
 .map(({ action, idx }: any) => (
 <div key={idx} className="p-3 rounded-lg border relative group bg-indigo-500/10 border-indigo-500/20">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs font-bold text-indigo-400">{action.type}{action.absenceType ? ` - ${action.absenceType}` : ''}</span>
 <span className="text-[10px] text-quaternary font-mono">{action.date}</span>
 </div>
 <div className="text-xs text-muted pr-6 mb-2">{action.reason}</div>
 
 {action.photo && (
 <img 
   src={action.photo} 
   alt="Absence" 
   className="max-w-[120px] rounded-lg border border-surface-elevated mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
   onClick={() => setZoomedImage(action.photo)}
 />
 )}
 
 <button type="button" 
 onClick={() => handleRemoveWarning(idx)}
 className="absolute top-3 right-3 text-quaternary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" 
 title="Delete this record"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-xs text-quinary bg-surface/30 border border-divider-subtle p-3 rounded-lg">
 No absences recorded.
 </div>
 )}
 </section>
 </>
 )}
 </div>
 </div>
 
 {/* Footer Actions */}
  <div className="p-5 border-t border-divider bg-canvas flex justify-between items-center shrink-0">
    <div className="flex gap-3">
      {!isEditing && (
        <button type="button" 
          onClick={handleDeleteWorker}
          className="px-4 py-2 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white-fixed transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete Worker
        </button>
      )}
    </div>
    <div className="flex gap-3 text-secondary">
 {isEditing ? (
 <>
 <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-surface border border-surface-elevated rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors">
 Cancel
 </button>
 <button type="button" onClick={handleSaveEdit} className="px-4 py-2 bg-emerald-600 text-white-fixed rounded-lg text-xs font-medium hover:bg-emerald-500 transition-colors flex items-center gap-2">
 <Save className="w-4 h-4" /> Save Changes
 </button>
 </>
 ) : (
 <>
 <button type="button" onClick={handleOpenEdit} className="px-4 py-2 bg-surface border border-surface-elevated rounded-lg text-xs font-medium text-secondary hover:bg-surface-elevated transition-colors">
 Edit Profile
 </button>
 {selectedWorker.status === 'Active' ? (
 <button type="button" onClick={() => setIsWarning(true)} className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500 hover:text-white-fixed transition-colors">
 Issue Disciplinary Action
 </button>
 ) : (
 <button type="button" onClick={handleRevokeTermination} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500 hover:text-white-fixed transition-colors flex items-center gap-2">
 <RefreshCw className="w-3.5 h-3.5" /> Revoke Termination
 </button>
 )}
 </>
  )}
    </div>
  </div>
</div>
</>
)}

   {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img 
            src={zoomedImage} 
            alt="Zoomed preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" 
          />
        </div>
      )}
    </div>
  );
}
