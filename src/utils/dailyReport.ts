import localforage from 'localforage';
import ExcelJS from 'exceljs';
import { formatDistanceToNow } from 'date-fns';
import { INITIAL_PRODUCTION_ORDERS } from '../pages/ProductionOrders';
import { INITIAL_CNC_TICKETS } from '../pages/CncMoldTickets';
import { INITIAL_MAINTENANCE_WORK_ORDERS, INITIAL_MAINTENANCE_PROCUREMENT_ORDERS } from '../pages/MaintenanceOrders';

export const sortMachines = (a: string, b: string): number => {
  const parseMachine = (name: string) => {
    const raw = (name || '').trim();
    const clean = raw.toUpperCase();

    // 1. MK machines: MK 1 to MK 26
    const mkMatch = clean.match(/^MK\s*[-_]?\s*(\d+)/i);
    if (mkMatch) {
      return { priority: 1, num: parseInt(mkMatch[1], 10), raw };
    }

    // 2. LABEL machines: LABEL 1, LABEL 2, etc.
    const labelMatch = clean.match(/^(?:LABEL|LBL)\s*[-_]?\s*(\d+)/i);
    if (labelMatch) {
      return { priority: 2, num: parseInt(labelMatch[1], 10), raw };
    }

    // 3. BLOW machines: BLOW 1 (or Blow01) to BLOW 7 (or Blow07)
    const blowMatch = clean.match(/^(?:BLOW|B)\s*[-_]?\s*(\d+)/i);
    if (blowMatch) {
      return { priority: 3, num: parseInt(blowMatch[1], 10), raw };
    }

    // Unassigned or unknown
    if (clean === 'UNASSIGNED' || !clean) {
      return { priority: 99, num: 9999, raw };
    }

    return { priority: 10, num: 0, raw };
  };

  const ma = parseMachine(a);
  const mb = parseMachine(b);

  if (ma.priority !== mb.priority) {
    return ma.priority - mb.priority;
  }
  if (ma.num !== mb.num) {
    return ma.num - mb.num;
  }
  return ma.raw.localeCompare(mb.raw, undefined, { numeric: true, sensitivity: 'base' });
};

function getTimeElapsed(dateString?: string, endDateString?: string, isFinished?: boolean) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    let diffMs = 0;
    if (endDateString) {
      diffMs = new Date(endDateString).getTime() - date.getTime();
    } else if (isFinished) {
      return 'Finished';
    } else {
      diffMs = Date.now() - date.getTime();
    }
    if (diffMs < 0) diffMs = 0;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);
    let parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    parts.push(`${String(hours).padStart(2, '0')}h`);
    parts.push(`${String(minutes).padStart(2, '0')}m`);
    return parts.join(' ');
  } catch {
    return '-';
  }
}

const formatDateValue = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const clean = dateStr.trim();
    if (clean.includes('T')) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      }
    }
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return `${d}/${m}/${y}`;
      }
    }
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      return `${dObj.getDate()}/${dObj.getMonth() + 1}/${dObj.getFullYear()}`;
    }
    return clean;
  } catch {
    return dateStr || '-';
  }
};

const getExpectedEndDateTime = (orderObj: any) => {
  if (!orderObj || orderObj.isContinuous) return null;
  let totalDurationMs = 0;
  
  const isCycleMethod = orderObj.productionRateMethod === 'cycle' || 
                        (!orderObj.productionRateMethod && orderObj.cycleTime) || 
                        (orderObj.cycleTime && orderObj.cavities);

  if (isCycleMethod || !orderObj.hourlyRate) {
    const safeCycle = orderObj.cycleTime || 12;
    const safeCavities = orderObj.cavities || 1;
    const totalShots = Math.ceil((orderObj.quantity || 1000) / safeCavities);
    totalDurationMs = totalShots * safeCycle * 1000;
  } else {
    const safeHourlyRate = orderObj.hourlyRate || 1000;
    const totalHours = (orderObj.quantity || 1000) / safeHourlyRate;
    totalDurationMs = totalHours * 3600 * 1000;
  }

  if (orderObj.status === 'In Progress' && orderObj.actualStartTime) {
    const startMs = new Date(orderObj.actualStartTime).getTime();
    return new Date(startMs + totalDurationMs - (orderObj.accumulatedTimeMs || 0));
  } else if (orderObj.startDate || orderObj.dateEntered) {
    return new Date(new Date(orderObj.startDate || orderObj.dateEntered).getTime() + totalDurationMs);
  }
  return null;
};

const getProducedQuantity = (orderObj: any): number => {
  if (!orderObj) return 0;
  if (orderObj.status === 'Completed') {
    return orderObj.producedQuantity !== undefined ? orderObj.producedQuantity : (orderObj.quantity || 0);
  }
  if (orderObj.producedQuantity !== undefined) {
    return orderObj.producedQuantity;
  }
  if (orderObj.status === 'Planned') {
    return 0;
  }
  
  if (orderObj.accumulatedTimeMs) {
    const isCycleMethod = orderObj.productionRateMethod === 'cycle' || 
                          (!orderObj.productionRateMethod && orderObj.cycleTime) || 
                          (orderObj.cycleTime && orderObj.cavities);

    if (isCycleMethod || !orderObj.hourlyRate) {
      const safeCycle = orderObj.cycleTime || 12;
      const safeCavities = orderObj.cavities || 1;
      return Math.floor((orderObj.accumulatedTimeMs / 1000) / safeCycle) * safeCavities;
    } else {
      const safeHourlyRate = orderObj.hourlyRate || 1000;
      return Math.floor((orderObj.accumulatedTimeMs / 3600000) * safeHourlyRate);
    }
  }
  return 0;
};

const formatDateFromObject = (dateObj: Date) => {
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatTimeFromObject = (dateObj: Date) => {
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${ampm} ${hours}:${minutes}`;
};

export async function generateDailyReport() {
  const authStored = localStorage.getItem('auth_user');
  const user = authStored ? JSON.parse(authStored) : null;
  const rolesStored = localStorage.getItem('app_roles');
  const roles = rolesStored ? JSON.parse(rolesStored) : [];
  
  let currentRole = roles.find((r: any) => r.id === user?.role);
  if (!currentRole && user?.role === 'super-admin') {
    currentRole = { permissions: { workers: true, maintenance: true, cnc: true, auxiliary: true, production: true, complaints: true, machines: true, archive: true, settings: true } };
  } else if (!currentRole) {
    currentRole = { permissions: { workers: false, maintenance: false, cnc: false, auxiliary: false, production: true, complaints: false, machines: true, archive: false, settings: false } };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Apex Plastics Ops Suite';
  wb.lastModifiedBy = 'System';
  wb.created = new Date();
  wb.modified = new Date();

  const loadData = async (key: string, defaultValue: any[] = []) => {
    try {
      const lsItem = localStorage.getItem(key);
      if (lsItem) {
        const data = JSON.parse(lsItem);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.error('Failed to parse localStorage', e);
    }
    try {
      const res = await fetch("/api/data/" + encodeURIComponent(key));
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      }
    } catch (e: any) {
      console.warn('Could not load from server, falling back:', e?.message || e);
    }
    try {
      let data = await localforage.getItem(key);
      if (Array.isArray(data)) return data;
    } catch (e) {}
    return defaultValue;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const addBigHeader = (ws: ExcelJS.Worksheet, title: string, subtitle: string, lastColLetter: string) => {
    // Row 1: Big Title "DAILY REPORT"
    const r1 = ws.addRow(['DAILY REPORT']);
    r1.height = 48;
    r1.font = { name: 'Calibri', size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.mergeCells(`A${r1.number}:${lastColLetter}${r1.number}`);

    // Row 2: Subtitle with Section Name & Date
    const r2 = ws.addRow([`${title.toUpperCase()}   •   DATE: ${dateFormatted} (${todayStr})   •   ${subtitle}`]);
    r2.height = 26;
    r2.font = { name: 'Calibri', size: 11.5, bold: true, color: { argb: 'FF334155' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    ws.mergeCells(`A${r2.number}:${lastColLetter}${r2.number}`);

    // Row 3: Spacer
    const r3 = ws.addRow([]);
    r3.height = 14;
  };

  // 1. Production Orders
  if (currentRole.permissions.production !== false) {
    const productionOrders = await loadData('production_orders_v11', INITIAL_PRODUCTION_ORDERS);
    const activeProd = productionOrders.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled');
    if (activeProd.length > 0) {
      const ws = wb.addWorksheet('Active Production');
      ws.columns = [
        { key: 'itemName', width: 42 },
        { key: 'granulesType', width: 26 },
        { key: 'status', width: 16 },
        { key: 'targetQty', width: 18 },
        { key: 'producedQty', width: 22 },
        { key: 'unit', width: 12 },
        { key: 'dateEntered', width: 18 },
        { key: 'endDate', width: 24 },
      ];

      addBigHeader(ws, 'Active Production Orders', `Total Orders: ${activeProd.length}`, 'H');

      const groupedByMachine = activeProd.reduce((acc: any, order: any) => {
        const machine = order.assignedMachine || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(order);
        return acc;
      }, {});

      Object.keys(groupedByMachine).sort(sortMachines).forEach(machine => {
        const titleRow = ws.addRow([`Machine: ${machine}`]);
        titleRow.height = 26;
        titleRow.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(`A${titleRow.number}:H${titleRow.number}`);

        const headerRow = ws.addRow(['Item Name', 'Granules', 'Status', 'Target Qty', 'Total Produced QTY', 'Unit', 'Date Entered', 'Ending Date']);
        headerRow.height = 22;
        headerRow.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FF1E3A8A' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell(c => { c.border = thinBorder; });

        groupedByMachine[machine].forEach((p: any) => {
          const rawEntered = p.dateEntered || p.startDate || p.actualStartTime;
          const enteredDateText = rawEntered ? formatDateValue(rawEntered) : '-';

          let endingDateText = '-';
          if (p.isContinuous) {
            // For continuous production runs, ending date is not applicable until stopped
            endingDateText = '-';
          } else if (p.status === 'In Progress') {
            const expectedEnd = getExpectedEndDateTime(p);
            if (expectedEnd && !isNaN(expectedEnd.getTime())) {
              endingDateText = `${formatDateFromObject(expectedEnd)} ${formatTimeFromObject(expectedEnd)}`;
            } else if (p.endDate) {
              endingDateText = formatDateValue(p.endDate);
            }
          } else if (p.status === 'Completed') {
            endingDateText = p.endDate ? formatDateValue(p.endDate) : '-';
          } else {
            // If the order is in planning/planned, it shows the entered date and the end shows '-'
            endingDateText = '-';
          }

          const targetQtyText = p.isContinuous ? 'Continuous (∞)' : (p.quantity !== undefined ? p.quantity : '-');
          const producedCount = getProducedQuantity(p);
          const producedQtyText = p.isContinuous ? `${producedCount.toLocaleString()} (∞ Continuous)` : (producedCount !== undefined ? producedCount : 0);
          const unitText = p.unit || 'pcs';

          const row = ws.addRow({
            itemName: p.itemName || '-',
            granulesType: p.granulesType || '-',
            status: p.status || '-',
            targetQty: targetQtyText,
            producedQty: producedQtyText,
            unit: unitText,
            dateEntered: enteredDateText,
            endDate: endingDateText
          });
          row.height = 21;
          row.font = { name: 'Calibri', size: 10.5 };
          row.alignment = { vertical: 'middle', horizontal: 'center' };
          const itemCell = row.getCell(1);
          itemCell.alignment = { vertical: 'middle', horizontal: 'left' };
          row.eachCell(c => { c.border = thinBorder; });
        });

        const spacer = ws.addRow([]);
        spacer.height = 12;
      });
    }
  }

  // 2. CNC Mold Tickets
  if (currentRole.permissions.cnc !== false) {
    const cncTickets = await loadData('cnc_mold_tickets_v3', INITIAL_CNC_TICKETS);
    const activeCnc = cncTickets.filter((t: any) => (t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)'));
    if (activeCnc.length > 0) {
      const ws = wb.addWorksheet('Active CNC Tickets');
      ws.columns = [
        { key: 'id', width: 18 },
        { key: 'moldName', width: 42 },
        { key: 'state', width: 26 },
        { key: 'dateSent', width: 18 },
      ];

      addBigHeader(ws, 'Active CNC Mold Tickets', `Total Tickets: ${activeCnc.length}`, 'D');

      const groupedCnc = activeCnc.reduce((acc: any, ticket: any) => {
        const machine = ticket.machineNumber || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(ticket);
        return acc;
      }, {});

      Object.keys(groupedCnc).sort(sortMachines).forEach(machine => {
        const titleRow = ws.addRow([`Machine: ${machine}`]);
        titleRow.height = 26;
        titleRow.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
        titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

        const headerRow = ws.addRow(['Ticket ID', 'Mold Name', 'State', 'Date Sent']);
        headerRow.height = 22;
        headerRow.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FF14532D' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell(c => { c.border = thinBorder; });

        groupedCnc[machine].forEach((t: any) => {
          const row = ws.addRow({
            id: t.id || '-',
            moldName: t.moldName || '-',
            state: t.state || '-',
            dateSent: t.dateSent || '-'
          });
          row.height = 21;
          row.font = { name: 'Calibri', size: 10.5 };
          row.alignment = { vertical: 'middle', horizontal: 'center' };
          const moldCell = row.getCell(2);
          moldCell.alignment = { vertical: 'middle', horizontal: 'left' };
          row.eachCell(c => { c.border = thinBorder; });
        });

        const spacer = ws.addRow([]);
        spacer.height = 12;
      });
    }
  }

  // 3. Maintenance Orders (Machine + Auxiliary)
  if (currentRole.permissions.maintenance !== false) {
    const maintenanceOrders = await loadData('maintenance_work_orders', INITIAL_MAINTENANCE_WORK_ORDERS);
    const auxMaintenance = await loadData('aux_work_orders', []);
    const allMaintenance = [...maintenanceOrders, ...auxMaintenance];
    const activeMaintenance = allMaintenance.filter((mo: any) => mo.status !== 'Completed' && mo.status !== 'Resolved');
    if (activeMaintenance.length > 0) {
      const ws = wb.addWorksheet('Active Maintenance');
      ws.columns = [
        { key: 'id', width: 16 },
        { key: 'taskName', width: 42 },
        { key: 'status', width: 16 },
        { key: 'priority', width: 16 },
        { key: 'timeElapsed', width: 20 },
        { key: 'dateReported', width: 16 },
      ];

      addBigHeader(ws, 'Active Maintenance Work Orders', `Total Orders: ${activeMaintenance.length}`, 'F');

      const groupedMaint = activeMaintenance.reduce((acc: any, mo: any) => {
        const machine = mo.machineName || mo.equipmentId || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(mo);
        return acc;
      }, {});

      Object.keys(groupedMaint).sort(sortMachines).forEach(machine => {
        const titleRow = ws.addRow([`Machine/Equipment: ${machine}`]);
        titleRow.height = 26;
        titleRow.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
        titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

        const headerRow = ws.addRow(['ID', 'Task / Issue', 'Status', 'Priority', 'Time Elapsed', 'Date Reported']);
        headerRow.height = 22;
        headerRow.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FF78350F' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell(c => { c.border = thinBorder; });

        groupedMaint[machine].forEach((mo: any) => {
          const row = ws.addRow({
            id: mo.id || '-',
            taskName: mo.taskName || mo.issue || '-',
            status: mo.status || '-',
            priority: mo.priority || '-',
            timeElapsed: getTimeElapsed(mo.dateReported, mo.dateCompleted, mo.status === 'Completed' || mo.status === 'Finished' || mo.status === 'Resolved'),
            dateReported: mo.dateReported || '-'
          });
          row.height = 21;
          row.font = { name: 'Calibri', size: 10.5 };
          row.alignment = { vertical: 'middle', horizontal: 'center' };
          const taskCell = row.getCell(2);
          taskCell.alignment = { vertical: 'middle', horizontal: 'left' };
          row.eachCell(c => { c.border = thinBorder; });
        });

        const spacer = ws.addRow([]);
        spacer.height = 12;
      });
    }
  }

  // 4. Procurement Orders (Machine Maintenance + Auxiliary)
  if (currentRole.permissions.maintenance !== false) {
    const maintenanceProc = await loadData('maintenance_procurement_orders', INITIAL_MAINTENANCE_PROCUREMENT_ORDERS);
    const auxProc = await loadData('aux_procurement_orders', []);
    const allProc = [...maintenanceProc, ...auxProc];
    const activeProc = allProc.filter((po: any) => po.status !== 'Completed' && po.status !== 'Finished' && po.status !== 'Delivered');
    if (activeProc.length > 0) {
      const ws = wb.addWorksheet('Active Procurement');
      ws.columns = [
        { key: 'id', width: 16 },
        { key: 'taskName', width: 42 },
        { key: 'status', width: 16 },
        { key: 'priority', width: 16 },
        { key: 'timeElapsed', width: 20 },
        { key: 'dateReported', width: 16 },
      ];

      addBigHeader(ws, 'Active Procurement Orders', `Total Orders: ${activeProc.length}`, 'F');

      const groupedProc = activeProc.reduce((acc: any, po: any) => {
        const machine = po.machineName || po.equipmentId || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(po);
        return acc;
      }, {});

      Object.keys(groupedProc).sort(sortMachines).forEach(machine => {
        const titleRow = ws.addRow([`Machine/Equipment: ${machine}`]);
        titleRow.height = 26;
        titleRow.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } };
        titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

        const headerRow = ws.addRow(['ID', 'Task / Order', 'Status', 'Priority', 'Time Elapsed', 'Date']);
        headerRow.height = 22;
        headerRow.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FF581C87' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell(c => { c.border = thinBorder; });

        groupedProc[machine].forEach((po: any) => {
          const row = ws.addRow({
            id: po.id || '-',
            taskName: po.taskName || 'Procurement Request',
            status: po.status || '-',
            priority: po.priority || '-',
            timeElapsed: getTimeElapsed(po.dateReported || po.dateRequested, po.dateCompleted, po.status === 'Completed' || po.status === 'Finished' || po.status === 'Delivered'),
            dateReported: po.dateReported || po.dateRequested || '-'
          });
          row.height = 21;
          row.font = { name: 'Calibri', size: 10.5 };
          row.alignment = { vertical: 'middle', horizontal: 'center' };
          const taskCell = row.getCell(2);
          taskCell.alignment = { vertical: 'middle', horizontal: 'left' };
          row.eachCell(c => { c.border = thinBorder; });
        });

        const spacer = ws.addRow([]);
        spacer.height = 12;
      });
    }
  }

  if (wb.worksheets.length === 0) {
    const ws = wb.addWorksheet('Daily Report Summary');
    addBigHeader(ws, 'Summary', 'No Active Tasks', 'D');
    ws.getCell('A4').value = 'No active tasks or issues requiring attention today.';
    ws.getRow(4).font = { name: 'Calibri', size: 12, bold: true };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Daily_Report_${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
