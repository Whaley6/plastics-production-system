import ExcelJS from 'exceljs';
import { DowntimeRecord, DOWNTIME_TYPES, getTypeStyle, sortMachineNames } from '../types/machineHealth';

export const REASON_GROUP_PALETTE = [
  { header: 'FF1F4E79', sub: 'FF2F5597', bgHex: '#1F4E79', subHex: '#2F5597' }, // Reason 1: Blue
  { header: 'FF70AD47', sub: 'FF548235', bgHex: '#70AD47', subHex: '#548235' }, // Reason 2: Green
  { header: 'FF7030A0', sub: 'FF5B2082', bgHex: '#7030A0', subHex: '#5B2082' }, // Reason 3: Purple
  { header: 'FFC55A11', sub: 'FFA04000', bgHex: '#C55A11', subHex: '#A04000' }, // Reason 4: Amber/Orange
  { header: 'FF008080', sub: 'FF006666', bgHex: '#008080', subHex: '#006666' }, // Reason 5: Teal
  { header: 'FF9F1239', sub: 'FF881337', bgHex: '#9F1239', subHex: '#881337' }, // Reason 6: Rose
  { header: 'FF3730A3', sub: 'FF312E81', bgHex: '#3730A3', subHex: '#312E81' }, // Reason 7: Indigo
  { header: 'FF475569', sub: 'FF334155', bgHex: '#475569', subHex: '#334155' }  // Reason 8+: Slate
];

export function getReasonGroupColors(index: number) {
  return REASON_GROUP_PALETTE[index % REASON_GROUP_PALETTE.length];
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

/**
 * Builds the complete Factory 17-Category Matrix and Detailed Log into a given worksheet.
 */
function buildMachineWorksheet(ws: ExcelJS.Worksheet, machineName: string, records: DowntimeRecord[]) {
  // Sort records by date
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date, undefined, { numeric: true }));

  // Collect unique dates or generate full month dates (01 to 30)
  const dateSet = new Set<string>();
  sortedRecords.forEach(r => { if (r.date) dateSet.add(r.date); });
  
  // If dates are fewer than 30, generate standard month dates (01-Sep to 30-Sep or 01 to 30)
  let datesList = Array.from(dateSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (datesList.length === 0) {
    datesList = Array.from({ length: 30 }, (_, i) => `${String(i + 1).padStart(2, '0')}-Sep`);
  }

  // Map each date to a dictionary of category totals
  const dateCategoryMinutes: { [date: string]: { [catName: string]: number } } = {};
  const dateRecordMap: { [date: string]: DowntimeRecord } = {};

  sortedRecords.forEach(record => {
    dateRecordMap[record.date] = record;
    if (!dateCategoryMinutes[record.date]) {
      dateCategoryMinutes[record.date] = {};
    }

    record.reasons.forEach(sub => {
      const typeName = sub.type || 'قالب';
      dateCategoryMinutes[record.date][typeName] = (dateCategoryMinutes[record.date][typeName] || 0) + (Number(sub.durationMinutes) || 0);
    });
  });

  // SECTION 1: THE FACTORY 17-CATEGORY MATRIX
  // Row 1: Merged Title with Machine Name (Cols 1 to 18)
  const r1 = ws.getRow(1);
  r1.height = 30;
  ws.mergeCells(1, 1, 1, 18);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = machineName;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  for (let c = 1; c <= 18; c++) r1.getCell(c).border = thinBorder;

  // Row 2: Headers
  // Col 1: DATE (Dark Red #C00000)
  // Col 2 to 18: The 17 Downtime Types with their exact rainbow colors!
  const r2 = ws.getRow(2);
  r2.height = 24;

  const dateHeader = r2.getCell(1);
  dateHeader.value = 'DATE';
  dateHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dateHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  dateHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
  dateHeader.border = thinBorder;

  DOWNTIME_TYPES.forEach((typeItem, idx) => {
    const col = idx + 2;
    const cell = r2.getCell(col);
    cell.value = typeItem.name;
    cell.font = { 
      name: 'Calibri', 
      size: 9, 
      bold: true, 
      color: { argb: typeItem.textColor === '#FFFFFF' ? 'FFFFFFFF' : 'FF000000' } 
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: typeItem.argb } };
    cell.border = thinBorder;
  });

  // Data Rows: Dates 01 to N
  let curRow = 3;
  const startDataRow = curRow;

  datesList.forEach((dateStr) => {
    const row = ws.getRow(curRow);
    row.height = 18;

    // Date col
    const dateC = row.getCell(1);
    dateC.value = dateStr;
    dateC.font = { name: 'Calibri', size: 9, bold: true };
    dateC.alignment = { vertical: 'middle', horizontal: 'center' };
    dateC.border = thinBorder;

    // Category columns
    const dayMins = dateCategoryMinutes[dateStr] || {};
    DOWNTIME_TYPES.forEach((typeItem, idx) => {
      const col = idx + 2;
      const cell = row.getCell(col);
      const val = dayMins[typeItem.name];
      if (val !== undefined && val > 0) {
        cell.value = val;
      } else {
        cell.value = '';
      }
      cell.font = { name: 'Calibri', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });

    curRow++;
  });

  const endDataRow = curRow - 1;

  // Row: MIN (Sum of minutes per column)
  const minRow = curRow;
  const rowMin = ws.getRow(minRow);
  rowMin.height = 20;

  const minLabel = rowMin.getCell(1);
  minLabel.value = 'MIN';
  minLabel.font = { name: 'Calibri', size: 9, bold: true };
  minLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  minLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  minLabel.border = thinBorder;

  DOWNTIME_TYPES.forEach((_, idx) => {
    const col = idx + 2;
    const colLetter = String.fromCharCode(65 + idx + 1);
    const cell = rowMin.getCell(col);
    cell.value = { formula: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
    cell.font = { name: 'Calibri', size: 9, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    cell.border = thinBorder;
  });

  curRow++;

  // Row: DAYS (Minutes / 1440)
  const daysRow = curRow;
  const rowDays = ws.getRow(daysRow);
  rowDays.height = 20;

  const daysLabel = rowDays.getCell(1);
  daysLabel.value = 'DAYS';
  daysLabel.font = { name: 'Calibri', size: 9, bold: true };
  daysLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  daysLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  daysLabel.border = thinBorder;

  DOWNTIME_TYPES.forEach((_, idx) => {
    const col = idx + 2;
    const colLetter = String.fromCharCode(65 + idx + 1);
    const cell = rowDays.getCell(col);
    cell.value = { formula: `${colLetter}${minRow}/1440` };
    cell.numFmt = '0.000';
    cell.font = { name: 'Calibri', size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    cell.border = thinBorder;
  });

  curRow++;

  // Row: SUM (Total minutes & total days)
  const sumRow1 = curRow;
  const rowSum1 = ws.getRow(sumRow1);
  rowSum1.height = 20;
  
  // SUM label spanning row 1 and row 2 of sum
  ws.mergeCells(sumRow1, 1, sumRow1 + 1, 1);
  const sumLabel = ws.getCell(sumRow1, 1);
  sumLabel.value = 'SUM';
  sumLabel.font = { name: 'Calibri', size: 10, bold: true };
  sumLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  sumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  ws.getCell(sumRow1, 1).border = thinBorder;
  ws.getCell(sumRow1 + 1, 1).border = thinBorder;

  // Merged total minutes
  ws.mergeCells(sumRow1, 2, sumRow1, 18);
  const sumMinCell = ws.getCell(sumRow1, 2);
  sumMinCell.value = { formula: `SUM(B${minRow}:R${minRow})` };
  sumMinCell.font = { name: 'Calibri', size: 10, bold: true };
  sumMinCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sumMinCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  for (let c = 2; c <= 18; c++) rowSum1.getCell(c).border = thinBorder;

  curRow++;

  // Merged total days
  const sumRow2 = curRow;
  const rowSum2 = ws.getRow(sumRow2);
  rowSum2.height = 20;
  ws.mergeCells(sumRow2, 2, sumRow2, 18);
  const sumDaysCell = ws.getCell(sumRow2, 2);
  sumDaysCell.value = { formula: `SUM(B${daysRow}:R${daysRow})` };
  sumDaysCell.numFmt = '0.000';
  sumDaysCell.font = { name: 'Calibri', size: 10, bold: true };
  sumDaysCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sumDaysCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  for (let c = 2; c <= 18; c++) rowSum2.getCell(c).border = thinBorder;

  // RIGHT-SIDE SUMMARY TABLE (percentage | total min | Type)
  // Positioned at columns T, U, V (Cols 20, 21, 22) starting at row 20 matching factory format!
  const summaryHeaderRow = 20;
  const shRow = ws.getRow(summaryHeaderRow);
  
  shRow.getCell(20).value = 'percentage';
  shRow.getCell(21).value = 'total min';
  shRow.getCell(22).value = 'Type';
  for (let c = 20; c <= 22; c++) {
    const hc = shRow.getCell(c);
    hc.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF000000' } };
    hc.alignment = { vertical: 'middle', horizontal: 'center' };
    hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    hc.border = thinBorder;
  }

  DOWNTIME_TYPES.forEach((typeItem, idx) => {
    const sRowIdx = summaryHeaderRow + 1 + idx;
    const sRow = ws.getRow(sRowIdx);
    sRow.height = 18;

    const catColLetter = String.fromCharCode(65 + idx + 1); // B, C, D...

    // percentage: =IF($B${sumRow1}>0, ROUND((U{row}/$B${sumRow1})*100, 2), 0)
    const pctCell = sRow.getCell(20);
    pctCell.value = { formula: `IF($B$${sumRow1}>0, ROUND((U${sRowIdx}/$B$${sumRow1})*100, 2), 0)` };
    pctCell.numFmt = '0.00';
    pctCell.font = { name: 'Calibri', size: 9, bold: true };
    pctCell.alignment = { vertical: 'middle', horizontal: 'center' };
    pctCell.border = thinBorder;

    // total min: references the MIN row
    const minCell = sRow.getCell(21);
    minCell.value = { formula: `${catColLetter}${minRow}` };
    minCell.font = { name: 'Calibri', size: 9, bold: true };
    minCell.alignment = { vertical: 'middle', horizontal: 'center' };
    minCell.border = thinBorder;

    // Type: Colored badge
    const typeCell = sRow.getCell(22);
    typeCell.value = typeItem.name;
    typeCell.font = { 
      name: 'Calibri', 
      size: 9, 
      bold: true, 
      color: { argb: typeItem.textColor === '#FFFFFF' ? 'FFFFFFFF' : 'FF000000' } 
    };
    typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
    typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: typeItem.argb } };
    typeCell.border = thinBorder;
  });

  // SECTION 2: DETAILED MULTI-REASON MATRIX LOG
  // Placed starting at Col 25 (Col Y) alongside the matrix, giving the user the best of both worlds!
  const detailStartCol = 25;
  const maxReasons = Math.max(3, ...sortedRecords.map(r => r.reasons?.length || 0));
  const detailTotalCols = 2 + (maxReasons * 3) + 1; // Date + reasons + maxReasons*3 + Total Time

  // Title Row for Detailed Reasons
  ws.mergeCells(1, detailStartCol, 1, detailStartCol + detailTotalCols - 1);
  const detailTitle = ws.getCell(1, detailStartCol);
  detailTitle.value = `${machineName} - تفاصيل أسباب التوقف وملاحظات الأعطال (Detailed Stoppage Breakdown)`;
  detailTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  detailTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  detailTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
  for (let c = detailStartCol; c < detailStartCol + detailTotalCols; c++) {
    ws.getRow(1).getCell(c).border = thinBorder;
  }

  // Row 2: Top Group Headers for Detail Section
  const dRow2 = ws.getRow(2);
  dRow2.getCell(detailStartCol).value = 'Date';
  dRow2.getCell(detailStartCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
  dRow2.getCell(detailStartCol).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dRow2.getCell(detailStartCol).border = thinBorder;

  dRow2.getCell(detailStartCol + 1).value = 'reasons (Combined with +)';
  dRow2.getCell(detailStartCol + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
  dRow2.getCell(detailStartCol + 1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dRow2.getCell(detailStartCol + 1).border = thinBorder;

  for (let i = 0; i < maxReasons; i++) {
    const sc = detailStartCol + 2 + (i * 3);
    ws.mergeCells(2, sc, 2, sc + 2);
    const colors = getReasonGroupColors(i);
    const grpCell = dRow2.getCell(sc);
    grpCell.value = `Reason ${i + 1}`;
    grpCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    grpCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = sc; c <= sc + 2; c++) {
      dRow2.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
      dRow2.getCell(c).border = thinBorder;
    }
  }

  const totTimeCol = detailStartCol + 2 + (maxReasons * 3);
  dRow2.getCell(totTimeCol).value = 'Total Time';
  dRow2.getCell(totTimeCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  dRow2.getCell(totTimeCol).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dRow2.getCell(totTimeCol).alignment = { vertical: 'middle', horizontal: 'center' };
  dRow2.getCell(totTimeCol).border = thinBorder;

  // Row 3: Subheaders
  const dRow3 = ws.getRow(3);
  dRow3.height = 20;
  dRow3.getCell(detailStartCol).value = '';
  dRow3.getCell(detailStartCol + 1).value = '';
  ws.mergeCells(2, detailStartCol, 3, detailStartCol);
  ws.mergeCells(2, detailStartCol + 1, 3, detailStartCol + 1);
  ws.mergeCells(2, totTimeCol, 3, totTimeCol);

  for (let i = 0; i < maxReasons; i++) {
    const sc = detailStartCol + 2 + (i * 3);
    const colors = getReasonGroupColors(i);
    const subLabels = ['The reason', 'Time', 'Type'];
    subLabels.forEach((label, lIdx) => {
      const c = sc + lIdx;
      const subCell = dRow3.getCell(c);
      subCell.value = label;
      subCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.sub } };
      subCell.border = thinBorder;
    });
  }

  // Populate data rows for Detail Section
  datesList.forEach((dateStr, idx) => {
    const rIdx = 4 + idx;
    const row = ws.getRow(rIdx);
    const rec = dateRecordMap[dateStr];

    const dDateCell = row.getCell(detailStartCol);
    dDateCell.value = dateStr;
    dDateCell.font = { name: 'Calibri', size: 9, bold: true };
    dDateCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dDateCell.border = thinBorder;

    const dReasonsCell = row.getCell(detailStartCol + 1);
    dReasonsCell.value = rec?.rawReasonsText || (rec?.reasons?.map(s => s.reason).join(' + ') || '');
    dReasonsCell.font = { name: 'Calibri', size: 9 };
    dReasonsCell.alignment = { vertical: 'middle', horizontal: 'right' };
    dReasonsCell.border = thinBorder;

    for (let i = 0; i < maxReasons; i++) {
      const sc = detailStartCol + 2 + (i * 3);
      const sub = rec?.reasons?.[i];
      const subStyle = sub?.type ? getTypeStyle(sub.type) : null;

      // Text
      const textCell = row.getCell(sc);
      textCell.value = sub?.reason || '';
      textCell.font = { name: 'Calibri', size: 9 };
      textCell.alignment = { vertical: 'middle', horizontal: 'right' };
      textCell.border = thinBorder;

      // Time
      const timeCell = row.getCell(sc + 1);
      timeCell.value = sub && sub.durationMinutes !== undefined ? sub.durationMinutes : '';
      timeCell.font = { name: 'Calibri', size: 9, bold: true };
      timeCell.alignment = { vertical: 'middle', horizontal: 'center' };
      timeCell.border = thinBorder;

      // Type with Color Fill
      const typeCell = row.getCell(sc + 2);
      typeCell.value = subStyle?.name !== '-' ? subStyle?.name || '' : '';
      typeCell.font = { 
        name: 'Calibri', 
        size: 9, 
        bold: true, 
        color: { argb: subStyle?.textColor === '#FFFFFF' ? 'FFFFFFFF' : 'FF000000' } 
      };
      typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (subStyle && subStyle.id !== 'none' && sub?.type) {
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subStyle.argb } };
      }
      typeCell.border = thinBorder;
    }

    // Total Time
    const dTotCell = row.getCell(totTimeCol);
    dTotCell.value = rec?.totalDowntimeMinutes || '';
    dTotCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFC00000' } };
    dTotCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dTotCell.border = thinBorder;
  });

  // Column Width adjustments
  ws.getColumn(1).width = 12; // Date
  for (let c = 2; c <= 18; c++) ws.getColumn(c).width = 12; // Categories
  ws.getColumn(19).width = 3; // Gap
  ws.getColumn(20).width = 13; // total Hours
  ws.getColumn(21).width = 12; // total min
  ws.getColumn(22).width = 16; // Type
  ws.getColumn(23).width = 3; // Gap
  ws.getColumn(24).width = 3; // Gap
  ws.getColumn(detailStartCol).width = 12; // Detail Date
  ws.getColumn(detailStartCol + 1).width = 36; // Detail reasons
  for (let i = 0; i < maxReasons; i++) {
    const sc = detailStartCol + 2 + (i * 3);
    ws.getColumn(sc).width = 24;
    ws.getColumn(sc + 1).width = 8;
    ws.getColumn(sc + 2).width = 14;
  }
  ws.getColumn(totTimeCol).width = 12;
}

/**
 * EXPORT ALL MACHINES WORKBOOK
 * Creates an Excel workbook where EACH MACHINE gets its own dedicated sheet tab!
 * Includes the factory 17-category matrix and all stoppage details and times.
 */
export async function exportAllMachinesWorkbook(allRecords: DowntimeRecord[], machineList: string[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Apex Plastics Ops Suite';
  wb.created = new Date();

  // Create an Overview / Summary tab first
  const overviewWs = wb.addWorksheet('Overview Summary', {
    views: [{ showGridLines: true, rightToLeft: false }]
  });

  // Overview Title
  overviewWs.mergeCells('A1:F1');
  const ot = overviewWs.getCell('A1');
  ot.value = 'Apex Plastics - All Machines Monthly Downtime Summary';
  ot.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  ot.alignment = { vertical: 'middle', horizontal: 'center' };
  ot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
  overviewWs.getRow(1).height = 32;

  // Overview Headers
  const plantTotalMins = allRecords.reduce((sum, r) => sum + (Number(r.totalDowntimeMinutes) || 0), 0);
  const ovHeaders = ['#', 'Machine Name', 'Total Stoppage Time (min)', 'percentage', 'Days Recorded', 'Status'];
  const ovRow2 = overviewWs.getRow(2);
  ovRow2.height = 24;
  ovHeaders.forEach((h, i) => {
    const c = ovRow2.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    c.border = thinBorder;
  });

  // Aggregate stats per machine
  const machineStats = machineList.map((mName, idx) => {
    const mRecords = allRecords.filter(r => r.machineName?.trim().toUpperCase() === mName.trim().toUpperCase());
    const totMins = mRecords.reduce((sum, r) => sum + (Number(r.totalDowntimeMinutes) || 0), 0);
    const pct = plantTotalMins > 0 ? Number(((totMins / plantTotalMins) * 100).toFixed(2)) : 0;
    return {
      idx: idx + 1,
      name: mName,
      records: mRecords,
      totalMinutes: totMins,
      percentage: pct,
      daysCount: mRecords.length
    };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes);

  machineStats.forEach((stat, rIdx) => {
    const row = overviewWs.getRow(3 + rIdx);
    row.height = 20;

    row.getCell(1).value = rIdx + 1;
    row.getCell(2).value = stat.name;
    row.getCell(3).value = stat.totalMinutes;
    const pctCell = row.getCell(4);
    pctCell.value = stat.percentage;
    pctCell.numFmt = '0.00"%"';
    row.getCell(5).value = stat.daysCount;
    row.getCell(6).value = stat.totalMinutes > 0 ? 'Active Records' : 'No Downtime';

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
      if (c === 2) cell.font = { name: 'Calibri', size: 10, bold: true };
      if (c === 3) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC00000' } };
      if (c === 4) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
    }
  });

  overviewWs.getColumn(1).width = 6;
  overviewWs.getColumn(2).width = 18;
  overviewWs.getColumn(3).width = 24;
  overviewWs.getColumn(4).width = 16;
  overviewWs.getColumn(5).width = 16;
  overviewWs.getColumn(6).width = 18;

  // Build a dedicated worksheet for EACH machine in order: MK first, then LABEL, then BLOW!
  const createdSheets = new Set<string>();
  const sortedMachineList = [...machineList].sort(sortMachineNames);

  sortedMachineList.forEach(machineName => {
    let safeName = machineName.replace(/[:\\/?*\[\]]/g, '').trim().slice(0, 31);
    if (!safeName) safeName = 'Machine';
    if (createdSheets.has(safeName.toUpperCase())) return;
    createdSheets.add(safeName.toUpperCase());

    const machineRecords = allRecords.filter(r => r.machineName?.trim().toUpperCase() === machineName.trim().toUpperCase());
    const ws = wb.addWorksheet(safeName, {
      views: [{ showGridLines: true, rightToLeft: false }]
    });

    buildMachineWorksheet(ws, machineName, machineRecords);
  });

  // Export buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `All_Machines_Downtime_Monthly_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * EXPORT SINGLE MACHINE EXCEL
 */
export async function exportRainbowMachineHealthExcel(records: DowntimeRecord[], machineName: string = 'MK 1') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Apex Plastics Ops Suite';
  wb.created = new Date();

  const safeName = machineName.replace(/[:\\/?*\[\]]/g, '').trim().slice(0, 31) || 'Machine';
  const ws = wb.addWorksheet(safeName, {
    views: [{ showGridLines: true, rightToLeft: false }]
  });

  buildMachineWorksheet(ws, machineName, records);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${machineName}_Downtime_Reasons_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function exportMachineHealthCSV(records: DowntimeRecord[]) {
  const maxReasons = Math.max(3, ...records.map(r => r.reasons?.length || 0));

  const headers = ['Date', 'reasons'];
  for (let i = 0; i < maxReasons; i++) {
    headers.push(`Reason ${i + 1}`, `Time ${i + 1}`, `Type ${i + 1}`);
  }
  headers.push('Total Downtime (m)');

  const rows = records.map(r => {
    const rowVals = [
      `"${r.date}"`,
      `"${(r.rawReasonsText || '').replace(/"/g, '""')}"`
    ];

    for (let i = 0; i < maxReasons; i++) {
      const sub = r.reasons[i];
      rowVals.push(
        `"${(sub?.reason || '').replace(/"/g, '""')}"`,
        String(sub?.durationMinutes || 0),
        `"${sub?.type || ''}"`
      );
    }

    rowVals.push(String(r.totalDowntimeMinutes || 0));
    return rowVals;
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Downtime_Reasons_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
