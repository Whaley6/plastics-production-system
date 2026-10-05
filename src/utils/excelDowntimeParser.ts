import * as XLSX from 'xlsx';
import { 
  DowntimeRecord, 
  DowntimeSubReason, 
  splitReasonsText, 
  guessTypeFromReasonText,
  sortMachineNames
} from '../types/machineHealth';

export interface DailyImportItem {
  machineName: string;
  rawText: string;
  targetTotalMinutes?: number;
  reasons: {
    id: string;
    reason: string;
    durationMinutes: number;
    type: string;
  }[];
  isNoDowntime: boolean;
}

export interface DailyImportResult {
  date: string;
  items: DailyImportItem[];
  totalMachines: number;
}

export interface ParseResult {
  records: DowntimeRecord[];
  dailyResult?: DailyImportResult;
  sheetNames: string[];
  totalParsed: number;
  formatType: 'daily_all_machines' | 'monthly_per_machine';
}

/**
 * Standardize machine names from various formats in Excel:
 * e.g. "1" -> "MK 1", "MK1" -> "MK 1", "LBEL1" -> "LABEL 1", "BLW01" -> "BLOW 1"
 */
export function normalizeMachineName(raw: string | number): string {
  const s = String(raw).trim().toUpperCase();
  if (!s) return 'UNKNOWN';

  // Plain number: 1 -> MK 1, 26 -> MK 26
  if (/^\d+$/.test(s)) {
    return `MK ${parseInt(s, 10)}`;
  }

  // MK prefix with optional space or dash
  const mkMatch = s.match(/^MK\s*[-_]?\s*(\d+)/i);
  if (mkMatch) {
    return `MK ${parseInt(mkMatch[1], 10)}`;
  }

  // Label machines: LBEL1, LABEL1, LBL 1
  const labelMatch = s.match(/^(?:LABEL|LBEL|LBL)\s*[-_]?\s*(\d+)/i);
  if (labelMatch) {
    return `LABEL ${parseInt(labelMatch[1], 10)}`;
  }

  // Blow machines: BLW01, BLOW 1, B1
  const blowMatch = s.match(/^(?:BLOW|BLW|B)\s*[-_]?\s*(\d+)/i);
  if (blowMatch) {
    return `BLOW ${parseInt(blowMatch[1], 10)}`;
  }

  return s;
}

/**
 * Main parser that handles both:
 * 1. The Daily Multi-Machine format (image: date 2026-01, NO.MK, S.T. MIN, REASON with +)
 * 2. The Monthly Per-Machine format (image 1: Date, reasons, reason 1, reason 2, Reason 3)
 */
export function parseExcelDowntimeFile(data: ArrayBuffer, defaultMachineName: string = 'MK 1'): ParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const allRecords: DowntimeRecord[] = [];
  let dailyResult: DailyImportResult | undefined = undefined;

  // Check the first worksheet for Daily All-Machines Format
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];

  if (firstSheet) {
    const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
    
    let detectedDate = '';
    let headerRowIdx = -1;
    let mkColIdx = -1;
    let stMinColIdx = -1;
    let reasonColIdx = -1;

    // Scan top rows for "date" header
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      for (let c = 0; c < rawRows[r].length; c++) {
        const cellVal = String(rawRows[r][c]).trim().toLowerCase();
        if (cellVal === 'date' || cellVal.includes('تاريخ')) {
          let val = rawRows[r][c + 1];
          if (!val && r + 1 < rawRows.length) val = rawRows[r + 1][c];
          
          if (val instanceof Date) {
            const d = val.getDate().toString().padStart(2, '0');
            const m = (val.getMonth() + 1).toString().padStart(2, '0');
            const y = val.getFullYear();
            detectedDate = `${d}/${m}/${y}`;
          } else if (val) {
            detectedDate = String(val).trim();
          }
        }
      }
    }

    // Scan for "NO.MK", "S.T. MIN", and "REASON" headers
    for (let r = 0; r < Math.min(8, rawRows.length); r++) {
      rawRows[r].forEach((cell, cIdx) => {
        const s = String(cell).trim().toUpperCase();
        if (s.includes('NO.MK') || s.includes('MK') || s.includes('MACHINE') || s.includes('ماكنة') || s === 'NO.' || s === 'NO') {
          mkColIdx = cIdx;
          headerRowIdx = r;
        }
        if (s.includes('S.T') || s.includes('ST MIN') || s.includes('S.T. MIN') || s.includes('S.T.MIN') || s.includes('STOP') || s.includes('MIN') || s.includes('TIME') || s.includes('دقائق') || s.includes('وقت')) {
          stMinColIdx = cIdx;
          headerRowIdx = r;
        }
        if (s.includes('REASON') || s.includes('سبب') || s.includes('أسباب') || s.includes('اعطال') || s.includes('عطل')) {
          reasonColIdx = cIdx;
          headerRowIdx = r;
        }
        // If header looks like a date/month (e.g. 2026-01 or 01/09/2026)
        if (/^\d{4}[-/]\d{1,2}/.test(s) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s)) {
          if (!detectedDate) detectedDate = s;
          if (reasonColIdx === -1 && cIdx > mkColIdx) {
            reasonColIdx = cIdx;
            headerRowIdx = r;
          }
        }
      });
      if (mkColIdx !== -1 && (reasonColIdx !== -1 || stMinColIdx !== -1)) break;
    }

    // Fallback: If mkColIdx found but reasonColIdx not found, look at remaining columns
    if (mkColIdx !== -1 && reasonColIdx === -1) {
      if (stMinColIdx !== -1 && rawRows[headerRowIdx] && rawRows[headerRowIdx].length > 2) {
        reasonColIdx = 2;
      } else if (rawRows[headerRowIdx] && rawRows[headerRowIdx].length > 1) {
        reasonColIdx = 1;
      }
    }

    // If Daily format detected!
    if (mkColIdx !== -1 && (reasonColIdx !== -1 || stMinColIdx !== -1)) {
      if (!detectedDate) {
        detectedDate = new Date().toLocaleDateString('en-GB');
      }

      const dailyItems: DailyImportItem[] = [];

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const rawMk = row[mkColIdx];
        if (rawMk === undefined || rawMk === '') continue;

        // Parse targetTotalMinutes from S.T. MIN column if present
        let targetTotalMinutes: number | undefined = undefined;
        if (stMinColIdx !== -1) {
          const rawSt = row[stMinColIdx];
          if (rawSt !== undefined && rawSt !== '') {
            const num = Number(rawSt);
            if (!isNaN(num)) targetTotalMinutes = num;
          }
        }

        const rawReason = String(row[reasonColIdx] || '').trim();
        const machineName = normalizeMachineName(rawMk);
        const isNoDowntime = rawReason.includes('لا يوجد توقف') || rawReason.includes('لايوجد توقف') || rawReason === '' || (targetTotalMinutes === 0 && !rawReason);
        
        // Split reasons by +
        const parts = splitReasonsText(rawReason);
        const hasMultipleStops = parts.length > 1;

        let subReasons: { id: string; reason: string; durationMinutes: number; type: string }[] = [];

        if (!hasMultipleStops) {
          // RULE: If the machine has ONLY ONE stop, fill it automatically with targetTotalMinutes!
          const singleReason = parts[0] || rawReason || 'لا يوجد توقف';
          let dur = 0;
          if (targetTotalMinutes !== undefined) {
            dur = targetTotalMinutes;
          } else {
            dur = isNoDowntime ? 0 : 30;
          }
          subReasons = [{
            id: '1',
            reason: singleReason,
            durationMinutes: dur,
            type: guessTypeFromReasonText(singleReason)
          }];
        } else {
          // RULE: If the machine has MORE THAN ONE stop:
          // Keep duration 0 initially so the UI shows the user how much time left they haven't inserted!
          subReasons = parts.map((p, idx) => ({
            id: String(idx + 1),
            reason: p,
            durationMinutes: 0,
            type: guessTypeFromReasonText(p)
          }));
        }

        dailyItems.push({
          machineName,
          rawText: rawReason,
          targetTotalMinutes,
          reasons: subReasons,
          isNoDowntime
        });
      }

      dailyResult = {
        date: detectedDate,
        items: dailyItems.sort((a, b) => sortMachineNames(a.machineName, b.machineName)),
        totalMachines: dailyItems.length
      };

      return {
        records: [],
        dailyResult,
        sheetNames: workbook.SheetNames,
        totalParsed: dailyItems.length,
        formatType: 'daily_all_machines'
      };
    }
  }

  // Otherwise, fallback to Monthly Per-Machine parser
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rows || rows.length < 2) return;

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const rowStr = rows[i].map(c => String(c).toLowerCase().trim()).join(' ');
      if (rowStr.includes('date') || rowStr.includes('reason') || rowStr.includes('تاريخ')) {
        headerRowIndex = i;
        break;
      }
    }

    let detectedMachine = normalizeMachineName(sheetName) || defaultMachineName;
    let dateCol = 0;
    let reasonsCol = 1;
    const startDataRow = headerRowIndex + 2;

    for (let r = startDataRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      let dateVal = row[dateCol];
      if (dateVal instanceof Date) {
        const d = dateVal.getDate().toString().padStart(2, '0');
        const m = (dateVal.getMonth() + 1).toString().padStart(2, '0');
        const y = dateVal.getFullYear();
        dateVal = `${d}/${m}/${y}`;
      } else {
        dateVal = String(dateVal || '').trim();
      }

      const rawReasons = String(row[reasonsCol] || '').trim();
      if (!dateVal && !rawReasons) continue;

      const subReasons: DowntimeSubReason[] = [];

      // Dynamically scan any number of reason triplets (Reason text, Time, Type) starting at column 2
      let hasExplicitCols = false;
      for (let c = 2; c < row.length; c += 3) {
        const rText = String(row[c] || '').trim();
        const rTime = Number(row[c + 1]) || 0;
        const rType = String(row[c + 2] || '').trim();
        if (rText || rTime > 0) {
          hasExplicitCols = true;
          const idx = Math.floor((c - 2) / 3);
          subReasons.push({
            id: String(idx + 1),
            reason: rText || (rawReasons ? splitReasonsText(rawReasons)[idx] || 'توقف' : 'توقف'),
            durationMinutes: rTime,
            type: rType || guessTypeFromReasonText(rText || rawReasons)
          });
        }
      }

      if (!hasExplicitCols && rawReasons) {
        const splitParts = splitReasonsText(rawReasons);
        splitParts.forEach((part, index) => {
          subReasons.push({
            id: String(index + 1),
            reason: part,
            durationMinutes: index === 0 ? 30 : 15,
            type: guessTypeFromReasonText(part)
          });
        });
      }

      if (subReasons.length === 0) {
        subReasons.push({
          id: '1',
          reason: rawReasons || 'لا يوجد توقف',
          durationMinutes: 0,
          type: 'قالب'
        });
      }

      const totalMinutes = subReasons.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

      allRecords.push({
        id: `${detectedMachine.replace(/\s+/g, '')}-${(r - startDataRow + 1).toString().padStart(2, '0')}`,
        machineId: detectedMachine.toLowerCase().replace(/\s+/g, '-'),
        machineName: detectedMachine,
        date: dateVal || `Day ${r - startDataRow + 1}`,
        rawReasonsText: rawReasons || subReasons.map(s => s.reason).join(' + '),
        reasons: subReasons,
        totalDowntimeMinutes: totalMinutes,
        status: 'Resolved'
      });
    }
  });

  return {
    records: allRecords,
    sheetNames: workbook.SheetNames,
    totalParsed: allRecords.length,
    formatType: 'monthly_per_machine'
  };
}

/**
 * Text parser for directly pasting tab-delimited lines from Excel
 * Supports both 2-column (NO.MK \t REASON) and 3-column (NO.MK \t S.T. MIN \t REASON) formats!
 */
export function parsePastedDailyText(text: string, defaultDate: string): DailyImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const items: DailyImportItem[] = [];

  lines.forEach(line => {
    const upper = line.toUpperCase();
    if (upper.includes('NO.MK') || upper.includes('S.T. MIN') || upper.includes('REASON')) return;

    const parts = line.split(/\t+/);
    if (parts.length >= 2) {
      const rawMk = parts[0].trim();
      let rawReason = '';
      let targetTotalMinutes: number | undefined = undefined;

      // Check if Col 1 is numeric (S.T. MIN)
      if (parts.length >= 3 && !isNaN(Number(parts[1].trim()))) {
        targetTotalMinutes = Number(parts[1].trim());
        rawReason = parts.slice(2).join(' ').trim();
      } else {
        rawReason = parts.slice(1).join(' ').trim();
      }

      if (!rawMk) return;
      const machineName = normalizeMachineName(rawMk);
      const isNoDowntime = rawReason.includes('لا يوجد توقف') || rawReason.includes('لايوجد توقف') || rawReason === '' || (targetTotalMinutes === 0 && !rawReason);
      const reasonPieces = splitReasonsText(rawReason);
      const hasMultipleStops = reasonPieces.length > 1;

      let subReasons: { id: string; reason: string; durationMinutes: number; type: string }[] = [];

      if (!hasMultipleStops) {
        const singleReason = reasonPieces[0] || rawReason || 'لا يوجد توقف';
        let dur = 0;
        if (targetTotalMinutes !== undefined) {
          dur = targetTotalMinutes;
        } else {
          dur = isNoDowntime ? 0 : 30;
        }
        subReasons = [{
          id: '1',
          reason: singleReason,
          durationMinutes: dur,
          type: guessTypeFromReasonText(singleReason)
        }];
      } else {
        subReasons = reasonPieces.map((p, idx) => ({
          id: String(idx + 1),
          reason: p,
          durationMinutes: 0,
          type: guessTypeFromReasonText(p)
        }));
      }

      items.push({
        machineName,
        rawText: rawReason,
        targetTotalMinutes,
        isNoDowntime,
        reasons: subReasons
      });
    }
  });

  return {
    date: defaultDate,
    items: items.sort((a, b) => sortMachineNames(a.machineName, b.machineName)),
    totalMachines: items.length
  };
}
