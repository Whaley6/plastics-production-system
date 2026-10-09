export interface DowntimeSubReason {
  id: string;
  reason: string;
  durationMinutes: number;
  type?: string; // Type from rainbow legend (e.g. قالب, روبوت, ماكنة, etc.)
  timeEntered?: string;
  notes?: string;
}

export interface DowntimeRecord {
  id: string;
  machineId: string;
  machineName: string; // e.g. "MK 1"
  date: string; // DD/MM/YYYY or YYYY-MM-DD
  rawReasonsText: string; // The original combined text with "+"
  reasons: DowntimeSubReason[]; // Reason 1, Reason 2, Reason 3
  totalDowntimeMinutes: number;
  technician?: string;
  resolutionDetails?: string;
  status: 'Resolved' | 'In Progress' | 'Monitoring';
}

export interface DowntimeTypeLegend {
  id: string;
  name: string; // Arabic name
  color: string; // Hex color
  textColor: string; // High contrast text color
  argb: string; // For ExcelJS argb
}

export const DOWNTIME_TYPES: DowntimeTypeLegend[] = [
  { id: 'mold', name: 'قالب', color: '#FF0000', textColor: '#FFFFFF', argb: 'FFFF0000' },
  { id: 'cnc', name: 'CNC', color: '#C00000', textColor: '#FFFFFF', argb: 'FFC00000' },
  { id: 'robot', name: 'روبوت', color: '#FFFF00', textColor: '#000000', argb: 'FFFFFF00' },
  { id: 'machine', name: 'ماكنة', color: '#92D050', textColor: '#000000', argb: 'FF92D050' },
  { id: 'no_order', name: 'لا توجد طلبية', color: '#7030A0', textColor: '#FFFFFF', argb: 'FF7030A0' },
  { id: 'startup', name: 'بداية تشغيل', color: '#3F48CC', textColor: '#FFFFFF', argb: 'FF3F48CC' },
  { id: 'change_order', name: 'تغيير طلبية', color: '#B2A1C7', textColor: '#000000', argb: 'FFB2A1C7' },
  { id: 'no_workers', name: 'لا يوجد عمال', color: '#FFC000', textColor: '#000000', argb: 'FFFFC000' },
  { id: 'bad_label', name: 'تالف ليبل', color: '#00B0F0', textColor: '#000000', argb: 'FF00B0F0' },
  { id: 'no_label', name: 'لا يوجد ليبل', color: '#0070C0', textColor: '#FFFFFF', argb: 'FF0070C0' },
  { id: 'no_granules', name: 'لا توجد حبيبات', color: '#C55A11', textColor: '#FFFFFF', argb: 'FFC55A11' },
  { id: 'no_preform', name: 'لا يوجد امبول/فرز امبول', color: '#F4B084', textColor: '#000000', argb: 'FFF4B084' },
  { id: 'ups', name: 'UPS', color: '#00B050', textColor: '#FFFFFF', argb: 'FF00B050' },
  { id: 'compressor', name: 'مكومبريسر', color: '#9BC2E6', textColor: '#000000', argb: 'FF9BC2E6' },
  { id: 'chiller', name: 'Chiller', color: '#1F4E79', textColor: '#FFFFFF', argb: 'FF1F4E79' },
  { id: 'generator', name: 'مولدة', color: '#595959', textColor: '#FFFFFF', argb: 'FF595959' },
  { id: 'other', name: 'اخرى', color: '#D9D9D9', textColor: '#000000', argb: 'FFD9D9D9' }
];

export function getTypeStyle(typeName?: string): DowntimeTypeLegend {
  if (!typeName) return { id: 'none', name: '-', color: '#334155', textColor: '#94A3B8', argb: 'FF334155' };
  const found = DOWNTIME_TYPES.find(t => t.name.trim().toLowerCase() === typeName.trim().toLowerCase() || t.id === typeName.toLowerCase());
  if (found) return found;
  return { id: 'custom', name: typeName, color: '#3B82F6', textColor: '#FFFFFF', argb: 'FF3B82F6' };
}

/**
 * Orders machines according to factory hierarchy:
 * 1. MK machines (MK 1, MK 2, MK 3... MK 26, MK 30, MK 31, MK 32)
 * 2. LABEL machines (LABEL 1, LABEL 2...)
 * 3. BLOW machines (BLOW 1, BLOW 2, BLOW 3... BLOW 7)
 * 4. Others
 */
export function sortMachineNames(a: string, b: string): number {
  const getCategoryAndNumber = (name: string) => {
    const s = String(name || '').trim().toUpperCase();

    // Priority 1: MK machines (e.g. "MK 1", "MK1", "M1", or plain numeric "1")
    if (s.startsWith('MK') || s.startsWith('M ') || (/^\d+$/.test(s) && !s.includes('BL') && !s.includes('LA'))) {
      const numMatch = s.match(/\d+/);
      return { priority: 1, num: numMatch ? parseInt(numMatch[0], 10) : 999, raw: s };
    }

    // Priority 2: LABEL machines (e.g. "LABEL 1", "LBEL1", "LBL 1")
    if (s.includes('LABEL') || s.includes('LBEL') || s.includes('LBL')) {
      const numMatch = s.match(/\d+/);
      return { priority: 2, num: numMatch ? parseInt(numMatch[0], 10) : 999, raw: s };
    }

    // Priority 3: BLOW machines (e.g. "BLOW 1", "BLW01", "BLW 1", "B1")
    if (s.includes('BLOW') || s.includes('BLW')) {
      const numMatch = s.match(/\d+/);
      return { priority: 3, num: numMatch ? parseInt(numMatch[0], 10) : 999, raw: s };
    }

    // Priority 4: Others
    const numMatch = s.match(/\d+/);
    return { priority: 4, num: numMatch ? parseInt(numMatch[0], 10) : 999, raw: s };
  };

  const itemA = getCategoryAndNumber(a);
  const itemB = getCategoryAndNumber(b);

  if (itemA.priority !== itemB.priority) {
    return itemA.priority - itemB.priority;
  }
  if (itemA.num !== itemB.num) {
    return itemA.num - itemB.num;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * Automatically splits a string containing reasons separated by "+"
 * Example: "بقاء المنتج في القالب + خلل في الروبوت + نظوح ماء"
 * Returns: ["بقاء المنتج في القالب", "خلل في الروبوت", "نظوح ماء"]
 */
export function splitReasonsText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];
  // Split on + or ＋ (fullwidth plus)
  return rawText
    .split(/[+＋]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Auto-detect likely Type based on reason keywords if type is not provided
 */
export function guessTypeFromReasonText(reason: string): string {
  const r = reason.toLowerCase().trim();

  // 1. CNC
  if (r.includes('cnc')) return 'CNC';

  // 2. No Order ("لا توجد طلبية") - Must be checked BEFORE "تغيير طلبية"!
  if (
    r.includes('لا توجد طلب') || 
    r.includes('لا يوجد طلب') || 
    r.includes('عدم توفر طلب') || 
    r.includes('عدم وجود طلب') || 
    r.includes('انعدام طلب') ||
    r.includes('بدون طلب') ||
    r.includes('ماكو طلب') ||
    r.includes('مافي طلب') ||
    r.includes('انتهاء طلب') ||
    r.includes('انتهاء الطلب')
  ) {
    return 'لا توجد طلبية';
  }

  // 3. Change Order ("تغيير طلبية")
  if (
    r.includes('تغيير طلب') || 
    r.includes('تبديل طلب') || 
    r.includes('تعديل طلب') ||
    r.includes('تغيير الطلب') ||
    r.includes('تبديل الطلب')
  ) {
    return 'تغيير طلبية';
  }

  // 4. Robot ("روبوت")
  if (r.includes('روبوت') || r.includes('robot') || r.includes('بوربرين') || r.includes('ستاتك')) {
    return 'روبوت';
  }

  // 5. Mold ("قالب")
  if (r.includes('قالب') || r.includes('اجكتر') || r.includes('ابرة') || r.includes('إبرة') || r.includes('اسطمبة')) {
    return 'قالب';
  }

  // 6. No Workers ("لا يوجد عمال")
  if (r.includes('عمال') || r.includes('عامل') || r.includes('عدم توفر عمال') || r.includes('عدم وجود عمال')) {
    return 'لا يوجد عمال';
  }

  // 7. Labels: Damaged vs No Label
  if (
    r.includes('تالف ليبل') || 
    r.includes('ليبل تالف') || 
    r.includes('تلف ليبل') || 
    r.includes('لاصق تالف') || 
    r.includes('عيارات الليبل') ||
    r.includes('عيارات ليبل')
  ) {
    return 'تالف ليبل';
  }
  if (
    r.includes('لا يوجد ليبل') || 
    r.includes('لا توجد ليبل') || 
    r.includes('عدم توفر ليبل') || 
    r.includes('بدون ليبل')
  ) {
    return 'لا يوجد ليبل';
  }
  if (r.includes('ليبل') || r.includes('لاصق')) {
    return 'تالف ليبل';
  }

  // 8. Granules / Raw Material ("لا توجد حبيبات")
  if (r.includes('حبيبات') || r.includes('مادة خام') || r.includes('مواد خام')) {
    return 'لا توجد حبيبات';
  }

  // 9. Preform / Ampoules ("لا يوجد امبول/فرز امبول")
  if (r.includes('امبول') || r.includes('فرز') || r.includes('أنبول') || r.includes('انبول')) {
    return 'لا يوجد امبول/فرز امبول';
  }

  // 10. Startup ("بداية تشغيل")
  if (
    r.includes('بداية تشغيل') || 
    r.includes('بدء تشغيل') || 
    r.includes('بدء التشغيل') || 
    r.includes('احماء') || 
    r.includes('تسخين')
  ) {
    return 'بداية تشغيل';
  }

  // 11. Utilities: Chiller, Compressor, Generator, UPS
  if (r.includes('chiller') || r.includes('تبريد') || r.includes('مبرد') || r.includes('تشيلر')) return 'Chiller';
  if (r.includes('كمبروسر') || r.includes('مكومبريسر') || r.includes('ضاغط') || r.includes('كومبريسر')) return 'مكومبريسر';
  if (r.includes('مولد') || r.includes('قاطع')) return 'مولدة';
  if (r.includes('ups') || r.includes('كهرباء') || r.includes('تحويل')) return 'UPS';

  // 12. Machine ("ماكنة")
  if (
    r.includes('ماكن') || 
    r.includes('منكن') || 
    r.includes('ماطور') || 
    r.includes('موتور') || 
    r.includes('نوزل') || 
    r.includes('هيدروليك') || 
    r.includes('هواء') || 
    r.includes('انبوب') || 
    r.includes('أنبوب') || 
    r.includes('فالف') || 
    r.includes('حرارة') || 
    r.includes('بار') || 
    r.includes('سير') || 
    r.includes('حزام') || 
    r.includes('تسريب') ||
    r.includes('عيارات')
  ) {
    return 'ماكنة';
  }

  // 13. Fallbacks
  if (r.includes('توقف') || r.includes('اخرى') || r.includes('أخرى')) return 'اخرى';

  return 'قالب';
}

// 30 days of actual data from user's image for MK 1
export const INITIAL_DOWNTIME_RECORDS: DowntimeRecord[] = [
  {
    id: 'MK1-01',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '01/09/2026',
    rawReasonsText: 'بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'بقاء المنتج في القالب', durationMinutes: 8, type: 'قالب' }
    ],
    totalDowntimeMinutes: 8,
    status: 'Resolved'
  },
  {
    id: 'MK1-02',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '02/09/2026',
    rawReasonsText: 'بقاء المنتج في القالب + خلل في الروبوت',
    reasons: [
      { id: '1', reason: 'بقاء المنتج في القالب', durationMinutes: 34, type: 'روبوت' },
      { id: '2', reason: 'خلل في الروبوت', durationMinutes: 78, type: 'روبوت' }
    ],
    totalDowntimeMinutes: 112,
    status: 'Resolved'
  },
  {
    id: 'MK1-03',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '03/09/2026',
    rawReasonsText: 'لايوجد توقف',
    reasons: [
      { id: '1', reason: 'لايوجد توقف', durationMinutes: 64, type: 'قالب' }
    ],
    totalDowntimeMinutes: 64,
    status: 'Resolved'
  },
  {
    id: 'MK1-04',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '04/09/2026',
    rawReasonsText: 'بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'بقاء المنتج في القالب', durationMinutes: 235, type: 'قالب' }
    ],
    totalDowntimeMinutes: 235,
    status: 'Resolved'
  },
  {
    id: 'MK1-05',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '05/09/2026',
    rawReasonsText: 'تنظيف اجكتر بسبب خروج دهن في المنتج سطل 1,2 + تبديل طلبية',
    reasons: [
      { id: '1', reason: 'تنظيف اجكتر بسبب خروج دهن في المنتج سطل 1,2', durationMinutes: 45, type: 'قالب' },
      { id: '2', reason: 'تبديل طلبية', durationMinutes: 566, type: 'بداية تشغيل' }
    ],
    totalDowntimeMinutes: 611,
    status: 'Resolved'
  },
  {
    id: 'MK1-06',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '06/09/2026',
    rawReasonsText: 'لايوجد توقف',
    reasons: [
      { id: '1', reason: 'لايوجد توقف', durationMinutes: 6, type: 'قالب' }
    ],
    totalDowntimeMinutes: 6,
    status: 'Resolved'
  },
  {
    id: 'MK1-07',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '07/09/2026',
    rawReasonsText: 'خلل في هواء رقم 1 + بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'خلل في هواء رقم 1', durationMinutes: 2, type: 'ماكنة' },
      { id: '2', reason: 'بقاء المنتج في القالب', durationMinutes: 332, type: 'قالب' }
    ],
    totalDowntimeMinutes: 334,
    status: 'Resolved'
  },
  {
    id: 'MK1-08',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '08/09/2026',
    rawReasonsText: 'بقاء المواد في القالب + نظوح ماء من ابرة القالب + خلل في القالب تم ارساله الى CNC لغرض الصيانة',
    reasons: [
      { id: '1', reason: 'بقاء المواد في القالب', durationMinutes: 67, type: 'بداية تشغيل' },
      { id: '2', reason: 'نظوح ماء من ابرة القالب', durationMinutes: 456, type: 'قالب' },
      { id: '3', reason: 'خلل في القالب تم ارساله الى CNC لغرض الصيانة', durationMinutes: 43, type: 'CNC' }
    ],
    totalDowntimeMinutes: 566,
    status: 'Resolved'
  },
  {
    id: 'MK1-09',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '09/09/2026',
    rawReasonsText: 'بقاء منتج في قالب',
    reasons: [
      { id: '1', reason: 'بقاء منتج في قالب', durationMinutes: 254, type: 'لا يوجد عمال' }
    ],
    totalDowntimeMinutes: 254,
    status: 'Resolved'
  },
  {
    id: 'MK1-10',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '10/09/2026',
    rawReasonsText: 'كسر دفاع اجكتر القالب',
    reasons: [
      { id: '1', reason: 'كسر دفاع اجكتر القالب', durationMinutes: 14, type: 'تالف ليبل' }
    ],
    totalDowntimeMinutes: 14,
    status: 'Resolved'
  },
  {
    id: 'MK1-11',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '11/09/2026',
    rawReasonsText: 'بقاء المواد في القالب',
    reasons: [
      { id: '1', reason: 'بقاء المواد في القالب', durationMinutes: 78, type: 'قالب' }
    ],
    totalDowntimeMinutes: 78,
    status: 'Resolved'
  },
  {
    id: 'MK1-12',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '12/09/2026',
    rawReasonsText: 'خلل في اجكتر بقاء منتج في قالب',
    reasons: [
      { id: '1', reason: 'خلل في اجكتر بقاء منتج في قالب', durationMinutes: 55, type: 'روبوت' }
    ],
    totalDowntimeMinutes: 55,
    status: 'Resolved'
  },
  {
    id: 'MK1-13',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '13/09/2026',
    rawReasonsText: 'توقف بسبب اعمال الصيانه على أنبوب الهواء 10 بار رئيسي',
    reasons: [
      { id: '1', reason: 'توقف بسبب اعمال الصيانه على أنبوب الهواء 10 بار رئيسي', durationMinutes: 463, type: 'ماكنة' }
    ],
    totalDowntimeMinutes: 463,
    status: 'Resolved'
  },
  {
    id: 'MK1-14',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '14/09/2026',
    rawReasonsText: 'بقاء مواد في القالب',
    reasons: [
      { id: '1', reason: 'بقاء مواد في القالب', durationMinutes: 25, type: 'لا توجد طلبية' }
    ],
    totalDowntimeMinutes: 25,
    status: 'Resolved'
  },
  {
    id: 'MK1-15',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '15/09/2026',
    rawReasonsText: 'بقاء مواد في القالب +خروج دهن في منتج',
    reasons: [
      { id: '1', reason: 'بقاء مواد في القالب', durationMinutes: 42, type: 'بداية تشغيل' },
      { id: '2', reason: 'خروج دهن في منتج', durationMinutes: 14, type: 'قالب' }
    ],
    totalDowntimeMinutes: 56,
    status: 'Resolved'
  },
  {
    id: 'MK1-16',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '16/09/2026',
    rawReasonsText: 'عدم سحب المنتج',
    reasons: [
      { id: '1', reason: 'عدم سحب المنتج', durationMinutes: 342, type: 'تغيير طلبية' }
    ],
    totalDowntimeMinutes: 342,
    status: 'Resolved'
  },
  {
    id: 'MK1-17',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '17/09/2026',
    rawReasonsText: 'بقاء مواد في القالب',
    reasons: [
      { id: '1', reason: 'بقاء مواد في القالب', durationMinutes: 525, type: 'لا يوجد عمال' }
    ],
    totalDowntimeMinutes: 525,
    status: 'Resolved'
  },
  {
    id: 'MK1-18',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '18/09/2026',
    rawReasonsText: 'تبديل ليبل',
    reasons: [
      { id: '1', reason: 'تبديل ليبل', durationMinutes: 65, type: 'تالف ليبل' }
    ],
    totalDowntimeMinutes: 65,
    status: 'Resolved'
  },
  {
    id: 'MK1-19',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '19/09/2026',
    rawReasonsText: 'تنظيف اجكتر + بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'تنظيف اجكتر', durationMinutes: 24, type: 'لا يوجد ليبل' },
      { id: '2', reason: 'بقاء المنتج في القالب', durationMinutes: 45, type: 'قالب' }
    ],
    totalDowntimeMinutes: 69,
    status: 'Resolved'
  },
  {
    id: 'MK1-20',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '20/09/2026',
    rawReasonsText: 'بقاء مواد في القالب',
    reasons: [
      { id: '1', reason: 'بقاء مواد في القالب', durationMinutes: 55, type: 'لا يوجد حبيبات' }
    ],
    totalDowntimeMinutes: 55,
    status: 'Resolved'
  },
  {
    id: 'MK1-21',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '21/09/2026',
    rawReasonsText: 'لايوجد توقف',
    reasons: [
      { id: '1', reason: 'لايوجد توقف', durationMinutes: 45, type: 'لا يوجد امبول/فرز امبول' }
    ],
    totalDowntimeMinutes: 45,
    status: 'Resolved'
  },
  {
    id: 'MK1-22',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '22/09/2026',
    rawReasonsText: 'تنظيف الماكله + خلل في قاطع المولده مما ادى الى عدم تحويل كهرباء',
    reasons: [
      { id: '1', reason: 'تنظيف الماكله', durationMinutes: 865, type: 'UPS' },
      { id: '2', reason: 'خلل في قاطع المولده مما ادى الى عدم تحويل كهرباء', durationMinutes: 234, type: 'ماكنة' }
    ],
    totalDowntimeMinutes: 1099,
    status: 'Resolved'
  },
  {
    id: 'MK1-23',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '23/09/2026',
    rawReasonsText: 'بقاء مواد في القالب + معالجة الدهن في المنتج',
    reasons: [
      { id: '1', reason: 'بقاء مواد في القالب', durationMinutes: 356, type: 'مكومبريسر' },
      { id: '2', reason: 'معالجة الدهن في المنتج', durationMinutes: 64, type: 'قالب' }
    ],
    totalDowntimeMinutes: 420,
    status: 'Resolved'
  },
  {
    id: 'MK1-24',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '24/09/2026',
    rawReasonsText: 'خلل في حساس روبوت',
    reasons: [
      { id: '1', reason: 'خلل في حساس روبوت', durationMinutes: 1440, type: 'Chiller' }
    ],
    totalDowntimeMinutes: 1440,
    status: 'Resolved'
  },
  {
    id: 'MK1-25',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '25/09/2026',
    rawReasonsText: 'توقف كهرباء مولدة + قالب',
    reasons: [
      { id: '1', reason: 'توقف كهرباء مولدة', durationMinutes: 120, type: 'مولدة' },
      { id: '2', reason: 'بقاء مواد في القالب', durationMinutes: 75, type: 'قالب' }
    ],
    totalDowntimeMinutes: 195,
    status: 'Resolved'
  },
  {
    id: 'MK1-26',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '26/09/2026',
    rawReasonsText: 'خلل في حساس الروبوت +تنظيف الروبوت + بقاء مواد في القالب',
    reasons: [
      { id: '1', reason: 'خلل في حساس الروبوت', durationMinutes: 34, type: 'اخرى' },
      { id: '2', reason: 'تنظيف الروبوت', durationMinutes: 234, type: 'روبوت' },
      { id: '3', reason: 'بقاء مواد في القالب', durationMinutes: 243, type: 'قالب' }
    ],
    totalDowntimeMinutes: 511,
    status: 'Resolved'
  },
  {
    id: 'MK1-27',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '27/09/2026',
    rawReasonsText: 'خلل في مولدة +',
    reasons: [
      { id: '1', reason: 'خلل في مولدة', durationMinutes: 56, type: 'CNC' }
    ],
    totalDowntimeMinutes: 56,
    status: 'Resolved'
  },
  {
    id: 'MK1-28',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '28/09/2026',
    rawReasonsText: 'بسبب ثقب في اليدة + بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'بسبب ثقب في اليدة', durationMinutes: 13, type: 'روبوت' },
      { id: '2', reason: 'بقاء المنتج في القالب', durationMinutes: 234, type: 'قالب' }
    ],
    totalDowntimeMinutes: 247,
    status: 'Resolved'
  },
  {
    id: 'MK1-29',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '29/09/2026',
    rawReasonsText: 'بقاء المنتج في القالب',
    reasons: [
      { id: '1', reason: 'بقاء المنتج في القالب', durationMinutes: 445, type: 'لا يوجد امبول/فرز امبول' }
    ],
    totalDowntimeMinutes: 445,
    status: 'Resolved'
  },
  {
    id: 'MK1-30',
    machineId: 'mk-1',
    machineName: 'MK 1',
    date: '30/09/2026',
    rawReasonsText: 'لايوجد توقف',
    reasons: [
      { id: '1', reason: 'لايوجد توقف', durationMinutes: 0, type: 'قالب' }
    ],
    totalDowntimeMinutes: 0,
    status: 'Resolved'
  }
];

// ==========================================
// OEE (OVERALL EQUIPMENT EFFECTIVENESS) TYPES & LOGIC
// ==========================================

export interface DailyProductionRecord {
  production: number; // Good pieces, e.g. 15,582
  waste: number; // Waste/scrap pieces, e.g. 632
  customRunTimeMinutes?: number; // Optional manual override, default: 1440 - totalDowntime
  isWorkingDay: boolean; // false if stopped/non-working day (excluded from month average)
  notes?: string;
}

export interface DayOeeResult {
  date: string;
  isWorkingDay: boolean;
  totalDowntimeMinutes: number;
  excludedDowntimeMinutes: number;
  internalDowntimeMinutes: number;
  dailyCapability: number;
  capabilityReduction: number;
  adjustedCapability: number;
  runTimeMinutes: number;
  plannedMinutes: number;
  goodProduction: number;
  waste: number;
  totalProduction: number;
  availability: number; // 0..100
  performance: number; // 0..100
  quality: number; // 0..100
  oee: number; // 0..100
  excludedReasons: string[];
}

export interface MonthOeeSummary {
  totalCalendarDays: number;
  workingDaysCount: number;
  stoppedDaysCount: number;
  averageOee: number;
  averageAvailability: number;
  averagePerformance: number;
  averageQuality: number;
  totalGoodProduction: number;
  totalWaste: number;
  totalRunTimeMinutes: number;
  totalDowntimeMinutes: number;
  totalExcludedMinutes: number;
  totalAdjustedCapability: number;
  dailyResults: DayOeeResult[];
}

/**
 * 11 Stop Reason Categories that exclude/reduce machine capability:
 * 1. "لا توجد طلبية"
 * 2. "مولدة"
 * 3. "بداية تشغيل"
 * 4. "لا يوجد عمال"
 * 5. "لا يوجد ليبل"
 * 6. "لا توجد حبيبات"
 * 7. "لا يوجد امبول/فرز امبول"
 * 8. "UPS"
 * 9. "مكمبريسر" / "مكومبريسر"
 * 10. "Chiller"
 * 11. "اخرى"
 */
export const CAPABILITY_EXCLUDED_CATEGORIES = [
  'لا توجد طلبية',
  'مولدة',
  'بداية تشغيل',
  'لا يوجد عمال',
  'لا يوجد ليبل',
  'لا توجد حبيبات',
  'لا يوجد امبول/فرز امبول',
  'UPS',
  'مكمبريسر',
  'Chiller',
  'اخرى'
] as const;

export function isCapabilityExclusionReason(reasonOrType?: string): boolean {
  if (!reasonOrType) return false;
  const s = reasonOrType.trim().toLowerCase();
  
  if (s.includes('لا توجد طلب') || s.includes('لا يوجد طلب') || s.includes('عدم توفر طلب') || s.includes('عدم وجود طلب') || s.includes('انعدام طلب') || s.includes('بدون طلب') || s.includes('ماكو طلب') || s.includes('no_order')) return true;
  if (s.includes('مولد') || s.includes('generator')) return true;
  if (s.includes('بداية تشغيل') || s.includes('startup')) return true;
  if (s.includes('لا يوجد عمال') || s.includes('عدم توفر عمال') || s.includes('عدم وجود عمال') || s.includes('no_workers')) return true;
  if (s.includes('لا يوجد ليبل') || s.includes('no_label')) return true;
  if (s.includes('لا توجد حبيبات') || s.includes('no_granules')) return true;
  if (s.includes('امبول') || s.includes('فرز امبول') || s.includes('no_preform')) return true;
  if (s.includes('ups')) return true;
  if (s.includes('كمبريسر') || s.includes('كومبريسر') || s.includes('compressor')) return true;
  if (s.includes('chiller') || s.includes('جلر') || s.includes('شلير')) return true;
  if (s.includes('اخرى') || s.includes('أخرى') || s.includes('other')) return true;

  return false;
}

/**
 * Calculates OEE for a single operational day.
 * Formula:
 * - Capability Reduction = (Excluded Downtime Minutes / 1440) * Capability
 * - Adjusted Capability = Capability - Capability Reduction
 * - Availability (A) = Run Time / (1440 - Excluded Downtime Minutes)
 * - Performance (P) = (Good Production + Waste) / (Run Time * Capability / 1440)
 * - Quality (Q) = Good Production / (Good Production + Waste)
 * - Overall OEE = A * P * Q = Good Production / Adjusted Capability
 */
export function calculateDayOee(
  date: string,
  downtimeRecord: DowntimeRecord | undefined,
  productionEntry: DailyProductionRecord | undefined,
  nominalCapability: number
): DayOeeResult {
  const cap = Number(nominalCapability) || 23000;
  const totalDowntimeMinutes = Number(downtimeRecord?.totalDowntimeMinutes) || 0;

  // Determine if it was a working day
  const isWorking = productionEntry?.isWorkingDay !== undefined
    ? productionEntry.isWorkingDay
    : (totalDowntimeMinutes < 1440);

  // Sum excluded downtime minutes
  let excludedMins = 0;
  const excludedReasons: string[] = [];
  (downtimeRecord?.reasons || []).forEach(sub => {
    if (isCapabilityExclusionReason(sub.type) || isCapabilityExclusionReason(sub.reason)) {
      excludedMins += (Number(sub.durationMinutes) || 0);
      excludedReasons.push(sub.reason || sub.type || '');
    }
  });

  // Capability reduction based on user's exact specification:
  // e.g. 2 hrs (120 min) of مولدة on 23,000 cap = 2 * 958.33 = 1,917 pcs reduction => 21,083 pcs adjusted
  const capabilityReduction = Math.round((excludedMins / 1440) * cap);
  const adjustedCapability = Math.max(0, cap - capabilityReduction);

  // Run Time: custom override if user provided, else 1440 - totalDowntimeMinutes
  let runTimeMinutes = productionEntry?.customRunTimeMinutes !== undefined
    ? Number(productionEntry.customRunTimeMinutes)
    : Math.max(0, 1440 - totalDowntimeMinutes);

  if (!isWorking) {
    runTimeMinutes = 0;
  }

  const plannedMinutes = Math.max(0, 1440 - excludedMins);

  const goodProduction = isWorking ? (Number(productionEntry?.production) || 0) : 0;
  const waste = isWorking ? (Number(productionEntry?.waste) || 0) : 0;
  const totalProduction = goodProduction + waste;

  // Availability = Run Time / Planned Operating Time
  const availability = plannedMinutes > 0 && isWorking
    ? Math.min(100, Math.max(0, (runTimeMinutes / plannedMinutes) * 100))
    : 0;

  // Performance = Total Pieces Produced / Expected Output in Run Time
  const expectedOutput = runTimeMinutes * (cap / 1440);
  const performance = expectedOutput > 0 && isWorking
    ? Math.min(100, Math.max(0, (totalProduction / expectedOutput) * 100))
    : 0;

  // Quality = Good Production / Total Pieces Produced
  const quality = totalProduction > 0 && isWorking
    ? Math.min(100, Math.max(0, (goodProduction / totalProduction) * 100))
    : (isWorking ? 100 : 0);

  // Overall OEE = A * P * Q = (goodProduction / adjustedCapability) * 100
  const oee = adjustedCapability > 0 && isWorking
    ? Math.min(100, Math.max(0, (goodProduction / adjustedCapability) * 100))
    : 0;

  return {
    date,
    isWorkingDay: isWorking,
    totalDowntimeMinutes,
    excludedDowntimeMinutes: excludedMins,
    internalDowntimeMinutes: Math.max(0, totalDowntimeMinutes - excludedMins),
    dailyCapability: cap,
    capabilityReduction,
    adjustedCapability,
    runTimeMinutes,
    plannedMinutes,
    goodProduction,
    waste,
    totalProduction,
    availability,
    performance,
    quality,
    oee,
    excludedReasons
  };
}

/**
 * Calculates month-level OEE average across OPERATIONAL DAYS ONLY.
 * Non-working/stopped days are NOT counted as 0; they are excluded from the denominator.
 * e.g., in a 30-day month with 4 stopped days, average is calculated strictly over 26 days.
 */
export function calculateMonthOee(
  dates: string[],
  downtimeRecordsMap: Map<string, DowntimeRecord>,
  dailyProductionMap: Record<string, DailyProductionRecord>,
  nominalCapability: number
): MonthOeeSummary {
  const dailyResults: DayOeeResult[] = dates.map(d => {
    const rec = downtimeRecordsMap.get(d);
    const prod = dailyProductionMap[d];
    return calculateDayOee(d, rec, prod, nominalCapability);
  });

  const workingDays = dailyResults.filter(d => d.isWorkingDay);
  const stoppedDays = dailyResults.filter(d => !d.isWorkingDay);

  const averageOee = workingDays.length > 0
    ? workingDays.reduce((sum, d) => sum + d.oee, 0) / workingDays.length
    : 0;

  const averageAvailability = workingDays.length > 0
    ? workingDays.reduce((sum, d) => sum + d.availability, 0) / workingDays.length
    : 0;

  const averagePerformance = workingDays.length > 0
    ? workingDays.reduce((sum, d) => sum + d.performance, 0) / workingDays.length
    : 0;

  const averageQuality = workingDays.length > 0
    ? workingDays.reduce((sum, d) => sum + d.quality, 0) / workingDays.length
    : 0;

  const totalGoodProduction = workingDays.reduce((sum, d) => sum + d.goodProduction, 0);
  const totalWaste = workingDays.reduce((sum, d) => sum + d.waste, 0);
  const totalRunTimeMinutes = workingDays.reduce((sum, d) => sum + d.runTimeMinutes, 0);
  const totalDowntimeMinutes = dailyResults.reduce((sum, d) => sum + d.totalDowntimeMinutes, 0);
  const totalExcludedMinutes = dailyResults.reduce((sum, d) => sum + d.excludedDowntimeMinutes, 0);
  const totalAdjustedCapability = workingDays.reduce((sum, d) => sum + d.adjustedCapability, 0);

  return {
    totalCalendarDays: dates.length,
    workingDaysCount: workingDays.length,
    stoppedDaysCount: stoppedDays.length,
    averageOee,
    averageAvailability,
    averagePerformance,
    averageQuality,
    totalGoodProduction,
    totalWaste,
    totalRunTimeMinutes,
    totalDowntimeMinutes,
    totalExcludedMinutes,
    totalAdjustedCapability,
    dailyResults
  };
}

/**
 * Initial 30-day production dataset for MK 1 (September 2026):
 * Exactly 26 operational working days and 4 stopped days (Days 5, 13, 22, 24).
 * Seeded with user's exact figures:
 * - Waste: 632 pcs
 * - Production: 15,582 pcs
 * - Run Time: 1,245 min
 * - Capability: 23,000 pcs (adjusted to 21,083 on Day 25 with 120m مولدة stop)
 */
export const INITIAL_DAILY_PRODUCTION: Record<string, Record<string, DailyProductionRecord>> = {
  'MK 1': {
    '01/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '02/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '03/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '04/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '05/09/2026': { production: 0, waste: 0, customRunTimeMinutes: 0, isWorkingDay: false, notes: 'Machine Stopped' }, // STOPPED DAY 1/4
    '06/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '07/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '08/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '09/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '10/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '11/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '12/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '13/09/2026': { production: 0, waste: 0, customRunTimeMinutes: 0, isWorkingDay: false, notes: 'Maintenance Shutdown' }, // STOPPED DAY 2/4
    '14/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '15/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '16/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '17/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '18/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '19/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '20/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '21/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '22/09/2026': { production: 0, waste: 0, customRunTimeMinutes: 0, isWorkingDay: false, notes: 'Power Line Work' }, // STOPPED DAY 3/4
    '23/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '24/09/2026': { production: 0, waste: 0, customRunTimeMinutes: 0, isWorkingDay: false, notes: 'Full Day Sensor Stoppage (1440m)' }, // STOPPED DAY 4/4
    '25/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true }, // User's 2h مولدة test day!
    '26/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '27/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '28/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '29/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true },
    '30/09/2026': { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true }
  }
};

