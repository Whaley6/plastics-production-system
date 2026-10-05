const fs = require('fs');

const code = `import localforage from 'localforage';
import ExcelJS from 'exceljs';
import { formatDistanceToNow } from 'date-fns';
import { INITIAL_PRODUCTION_ORDERS } from '../pages/ProductionOrders';
import { INITIAL_CNC_TICKETS } from '../pages/CncMoldTickets';
import { INITIAL_MAINTENANCE_WORK_ORDERS, INITIAL_MAINTENANCE_PROCUREMENT_ORDERS } from '../pages/MaintenanceOrders';

function getTimeElapsed(dateString?: string) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    let diffMs = Date.now() - date.getTime();
    if (diffMs < 0) diffMs = 0;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);
    let parts = [];
    if (days > 0) {
      parts.push(\`\${days}d\`);
    }
    parts.push(\`\${String(hours).padStart(2, '0')}h\`);
    parts.push(\`\${String(minutes).padStart(2, '0')}m\`);
    return parts.join(' ');
  } catch {
    return '-';
  }
}

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
      let data = await localforage.getItem(key);
      if (data === null) {
        const lsItem = localStorage.getItem(key);
        if (lsItem) {
          try { data = JSON.parse(lsItem); } catch { data = lsItem; }
        }
      }
      return Array.isArray(data) ? data : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // 1. Production Orders
  if (currentRole.permissions.production !== false) {
    const productionOrders = await loadData('production_orders_v11', INITIAL_PRODUCTION_ORDERS);
    const activeProd = productionOrders.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled');
    if (activeProd.length > 0) {
      const ws = wb.addWorksheet('Active Production');
      ws.columns = [
        { key: 'id', width: 15 },
        { key: 'itemName', width: 40 },
        { key: 'granulesType', width: 25 },
        { key: 'status', width: 15 },
        { key: 'quantity', width: 15 },
        { key: 'unit', width: 10 },
        { key: 'dateEntered', width: 15 },
      ];
      const groupedByMachine = activeProd.reduce((acc: any, order: any) => {
        const machine = order.assignedMachine || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(order);
        return acc;
      }, {});
      Object.keys(groupedByMachine).sort().forEach(machine => {
        const titleRow = ws.addRow([\`Machine: \${machine}\`]);
        titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        ws.mergeCells(\`A\${titleRow.number}:G\${titleRow.number}\`);
        const headerRow = ws.addRow(['Order ID', 'Item Name', 'Granules', 'Status', 'Quantity', 'Unit', 'Date Entered']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        groupedByMachine[machine].forEach((p: any) => {
          ws.addRow({
            id: p.id || '-',
            itemName: p.itemName || '-',
            granulesType: p.granulesType || '-',
            status: p.status || '-',
            quantity: p.quantity || '-',
            unit: p.unit || '-',
            dateEntered: p.dateEntered || '-'
          });
        });
        ws.addRow([]);
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
        { key: 'id', width: 15 },
        { key: 'moldName', width: 40 },
        { key: 'state', width: 25 },
        { key: 'dateSent', width: 15 },
      ];
      const groupedCnc = activeCnc.reduce((acc: any, ticket: any) => {
        const machine = ticket.machineNumber || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(ticket);
        return acc;
      }, {});
      Object.keys(groupedCnc).sort().forEach(machine => {
        const titleRow = ws.addRow([\`Machine: \${machine}\`]);
        titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
        ws.mergeCells(\`A\${titleRow.number}:D\${titleRow.number}\`);
        const headerRow = ws.addRow(['Ticket ID', 'Mold Name', 'State', 'Date Sent']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        groupedCnc[machine].forEach((t: any) => {
          ws.addRow({
            id: t.id || '-',
            moldName: t.moldName || '-',
            state: t.state || '-',
            dateSent: t.dateSent || '-'
          });
        });
        ws.addRow([]);
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
        { key: 'id', width: 15 },
        { key: 'taskName', width: 40 },
        { key: 'status', width: 15 },
        { key: 'priority', width: 15 },
        { key: 'timeElapsed', width: 20 },
        { key: 'dateReported', width: 15 },
      ];
      const groupedMaint = activeMaintenance.reduce((acc: any, mo: any) => {
        const machine = mo.machineName || mo.equipmentId || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(mo);
        return acc;
      }, {});
      Object.keys(groupedMaint).sort().forEach(machine => {
        const titleRow = ws.addRow([\`Machine/Equipment: \${machine}\`]);
        titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
        ws.mergeCells(\`A\${titleRow.number}:F\${titleRow.number}\`);
        const headerRow = ws.addRow(['ID', 'Task/Issue', 'Status', 'Priority', 'Time Elapsed', 'Date Reported']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        groupedMaint[machine].forEach((mo: any) => {
          ws.addRow({
            id: mo.id || '-',
            taskName: mo.taskName || mo.issue || '-',
            status: mo.status || '-',
            priority: mo.priority || '-',
            timeElapsed: getTimeElapsed(mo.dateReported),
            dateReported: mo.dateReported || '-'
          });
        });
        ws.addRow([]);
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
        { key: 'id', width: 15 },
        { key: 'taskName', width: 40 },
        { key: 'status', width: 15 },
        { key: 'priority', width: 15 },
        { key: 'timeElapsed', width: 20 },
        { key: 'dateReported', width: 15 },
      ];
      const groupedProc = activeProc.reduce((acc: any, po: any) => {
        const machine = po.machineName || po.equipmentId || 'Unassigned';
        if (!acc[machine]) acc[machine] = [];
        acc[machine].push(po);
        return acc;
      }, {});
      Object.keys(groupedProc).sort().forEach(machine => {
        const titleRow = ws.addRow([\`Machine/Equipment: \${machine}\`]);
        titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } };
        ws.mergeCells(\`A\${titleRow.number}:F\${titleRow.number}\`);
        const headerRow = ws.addRow(['ID', 'Task/Order', 'Status', 'Priority', 'Time Elapsed', 'Date']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
        groupedProc[machine].forEach((po: any) => {
          ws.addRow({
            id: po.id || '-',
            taskName: po.taskName || 'Procurement Request',
            status: po.status || '-',
            priority: po.priority || '-',
            timeElapsed: getTimeElapsed(po.dateReported || po.dateRequested),
            dateReported: po.dateReported || po.dateRequested || '-'
          });
        });
        ws.addRow([]);
      });
    }
  }

  if (wb.worksheets.length === 0) {
    const ws = wb.addWorksheet('Daily Report Summary');
    ws.getCell('A1').value = 'No active tasks or issues requiring attention today.';
    ws.getRow(1).font = { bold: true };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = \`Daily_Report_\${today}.xlsx\`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
`;
fs.writeFileSync('src/utils/dailyReport.ts', code);
