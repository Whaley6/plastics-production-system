import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  FileSpreadsheet, 
  Eye,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
  FileText,
  ClipboardPaste,
  Check,
  CheckSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Zap,
  Award,
  TrendingUp,
  Settings2,
  ShieldCheck,
  Percent,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { logAction } from '../utils/logger';
import { 
  DowntimeRecord, 
  DowntimeSubReason, 
  DOWNTIME_TYPES, 
  getTypeStyle, 
  splitReasonsText, 
  guessTypeFromReasonText,
  sortMachineNames,
  INITIAL_DOWNTIME_RECORDS,
  DailyProductionRecord,
  DayOeeResult,
  MonthOeeSummary,
  CAPABILITY_EXCLUDED_CATEGORIES,
  isCapabilityExclusionReason,
  calculateDayOee,
  calculateMonthOee,
  INITIAL_DAILY_PRODUCTION 
} from '../types/machineHealth';
import { 
  parseExcelDowntimeFile, 
  parsePastedDailyText, 
  DailyImportItem, 
  DailyImportResult 
} from '../utils/excelDowntimeParser';
import { 
  exportRainbowMachineHealthExcel, 
  exportAllMachinesWorkbook,
  exportMachineHealthCSV,
  getReasonGroupColors 
} from '../utils/machineHealthExport';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const parseRecordDate = (dateStr: string) => {
  if (!dateStr) return { raw: '', day: '', month: '', year: '', monthKey: '', monthDisplay: '', formattedDate: '' };
  const raw = String(dateStr).trim();
  const parts = raw.split(/[\/\-.]/);
  let day = '';
  let month = '';
  let year = '';

  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      // DD/MM/YYYY
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    }
  } else if (parts.length === 2) {
    // MM/YYYY or YYYY-MM
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
    } else {
      month = parts[0].padStart(2, '0');
      year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    }
  } else if (/^day\s*\d+/i.test(raw)) {
    const num = raw.replace(/\D/g, '');
    day = num.padStart(2, '0');
  }

  const monthKey = month && year ? `${year}-${month}` : (month || '');
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = monthIdx >= 0 && monthIdx < 12 ? MONTH_NAMES[monthIdx] : '';
  const monthDisplay = monthName && year ? `${monthName} ${year}` : (month && year ? `${month}/${year}` : (monthName || raw));
  const formattedDate = day && month && year ? `${day}/${month}/${year}` : raw;

  return { raw, day, month, year, monthKey, monthDisplay, formattedDate };
};

export default function MachineHealthAnalytics() {
  const { user } = useAuth();
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles[0];
  const isReadOnly = currentRole?.permissions?.machines_readonly === true;

  // Stored downtime records (pre-loaded with MK 1 real data)
  const [storedRecords, setRecords] = useLocalStorage<DowntimeRecord[]>('machine_downtime_records_v2', INITIAL_DOWNTIME_RECORDS);
  const [productionMachines] = useLocalStorage<any[]>('production_machines_v11', []);

  // Guarantee strictly unique records (deduplicate by id or machine+date)
  const records = useMemo(() => {
    const seen = new Set<string>();
    const unique: DowntimeRecord[] = [];
    (storedRecords || []).forEach(r => {
      const key = r.id || `${r.machineName}_${r.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    });
    return unique;
  }, [storedRecords]);

  // Clean up localStorage if duplicates ever existed
  useEffect(() => {
    if (storedRecords && storedRecords.length !== records.length) {
      setRecords(records);
    }
  }, [storedRecords, records, setRecords]);

  // UI state
  const [selectedMachine, setSelectedMachine] = useState<string>('MK 1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [showLegendPanel, setShowLegendPanel] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'analytics'>('spreadsheet');

  // Daily Pop-up Tab state (when uploading the daily excel with NO.MK and REASON)
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState<boolean>(false);
  const [dailyImportData, setDailyImportData] = useState<DailyImportResult | null>(null);
  const [dailyFilter, setDailyFilter] = useState<'all' | 'with_reasons' | 'no_downtime'>('all');

  // Single Record Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<DowntimeRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DowntimeRecord | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [pasteDate, setPasteDate] = useState<string>(new Date().toLocaleDateString('en-GB'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart Form State with + Separator support (Single entry)
  const [draftMachine, setDraftMachine] = useState<string>('MK 1');
  const [draftDate, setDraftDate] = useState<string>(new Date().toLocaleDateString('en-GB'));
  const [draftCombinedReasons, setDraftCombinedReasons] = useState<string>('');
  const [draftSubReasons, setDraftSubReasons] = useState<DowntimeSubReason[]>([
    { id: '1', reason: 'بقاء المنتج في القالب', durationMinutes: 30, type: 'قالب' }
  ]);

  // Selection & Bulk Actions state
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    keys: string[];
    title: string;
    description: string;
  } | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Machine Capabilities configuration (e.g. MK 1 = 23,000 pcs / day)
  const [machineCapabilities, setMachineCapabilities] = useLocalStorage<Record<string, number>>(
    'machine_capabilities_v1',
    { 'MK 1': 23000 }
  );

  // Daily Production & Waste data (persisted per machine and date)
  const [dailyProductionData, setDailyProductionData] = useLocalStorage<Record<string, Record<string, DailyProductionRecord>>>(
    'machine_daily_production_v2',
    INITIAL_DAILY_PRODUCTION
  );

  // OEE Configuration Modal state
  const [isOeeConfigModalOpen, setIsOeeConfigModalOpen] = useState<boolean>(false);
  const [oeeModalTab, setOeeModalTab] = useState<'single' | 'month'>('single');
  const [oeeDraftDate, setOeeDraftDate] = useState<string>('25/09/2026');
  const [oeeDraftProd, setOeeDraftProd] = useState<number>(15582);
  const [oeeDraftWaste, setOeeDraftWaste] = useState<number>(632);
  const [oeeDraftRunTime, setOeeDraftRunTime] = useState<number>(1245);
  const [oeeDraftIsWorking, setOeeDraftIsWorking] = useState<boolean>(true);
  const [oeeDraftCapability, setOeeDraftCapability] = useState<number>(23000);

  const getRecordKey = (r: DowntimeRecord) => r.id || `${r.machineName}_${r.date}`;

  const handleExportAllMachines = async () => {
    try {
      setIsExporting(true);
      await exportAllMachinesWorkbook(records, machineList);
      logAction('Export Excel', `Exported full factory multi-tab workbook with ${machineList.length} machines`, 'info');
    } catch (err) {
      console.error('Failed to export workbook:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setSelectedRecordKeys(new Set());
    setLastSelectedIndex(null);
  }, [selectedMachine]);

  // Combined machine names sorted by MK first, then LABEL, then BLOW
  const machineList = useMemo(() => {
    const set = new Set<string>();
    set.add('MK 1');
    productionMachines.forEach(m => { if (m.name) set.add(m.name); });
    records.forEach(r => { if (r.machineName) set.add(r.machineName); });
    return Array.from(set).sort(sortMachineNames);
  }, [productionMachines, records]);

  // Records filtered by selected machine
  const machineRecords = useMemo(() => {
    if (selectedMachine === 'all') return records;
    return records.filter(r => r.machineName.trim().toUpperCase() === selectedMachine.trim().toUpperCase());
  }, [records, selectedMachine]);

  // Distinct months available for current machine scope
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    machineRecords.forEach(r => {
      const { monthKey, monthDisplay } = parseRecordDate(r.date);
      if (monthKey) {
        const existing = map.get(monthKey);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(monthKey, { key: monthKey, label: monthDisplay, count: 1 });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [machineRecords]);

  // Distinct days available: dynamically filtered to selected month if one is chosen
  const availableDays = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; dateStr?: string }>();
    machineRecords.forEach(r => {
      const { day, monthKey, formattedDate } = parseRecordDate(r.date);
      if (!day) return;

      if (selectedMonthFilter !== 'all' && monthKey !== selectedMonthFilter) {
        return;
      }

      const dayKey = day;
      const existing = map.get(dayKey);
      if (existing) {
        existing.count += 1;
      } else {
        const label = selectedMonthFilter !== 'all' 
          ? `Day ${parseInt(day, 10)} (${formattedDate})` 
          : `Day ${parseInt(day, 10)}`;
        map.set(dayKey, { key: dayKey, label, count: 1, dateStr: formattedDate });
      }
    });

    return Array.from(map.values()).sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10));
  }, [machineRecords, selectedMonthFilter]);

  // Auto-reset day filter if selected day does not exist in newly chosen month
  useEffect(() => {
    if (selectedDayFilter !== 'all') {
      const exists = availableDays.some(d => d.key === selectedDayFilter);
      if (!exists) {
        setSelectedDayFilter('all');
      }
    }
  }, [selectedMonthFilter, availableDays, selectedDayFilter]);

  // Search, type, month, and day filtered records (sorted by MK first, then LABEL, then BLOW)
  const filteredRecords = useMemo(() => {
    return machineRecords.filter(r => {
      const { day, monthKey } = parseRecordDate(r.date);

      const matchSearch = searchQuery.trim() === '' || 
        r.date.includes(searchQuery) ||
        r.machineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rawReasonsText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reasons.some(sub => sub.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedTypeFilter === 'all' || 
        r.reasons.some(sub => sub.type === selectedTypeFilter);

      const matchMonth = selectedMonthFilter === 'all' || monthKey === selectedMonthFilter;

      const matchDay = selectedDayFilter === 'all' || day === selectedDayFilter || r.date === selectedDayFilter;

      return matchSearch && matchType && matchMonth && matchDay;
    }).sort((a, b) => {
      const cmp = sortMachineNames(a.machineName, b.machineName);
      if (cmp !== 0) return cmp;
      return a.date.localeCompare(b.date, undefined, { numeric: true });
    });
  }, [machineRecords, searchQuery, selectedTypeFilter, selectedMonthFilter, selectedDayFilter]);

  // Machine records filtered by active month and day (used for charts and donut distribution)
  const dateScopedRecords = useMemo(() => {
    return machineRecords.filter(r => {
      const { day, monthKey } = parseRecordDate(r.date);
      const matchMonth = selectedMonthFilter === 'all' || monthKey === selectedMonthFilter;
      const matchDay = selectedDayFilter === 'all' || day === selectedDayFilter || r.date === selectedDayFilter;
      return matchMonth && matchDay;
    });
  }, [machineRecords, selectedMonthFilter, selectedDayFilter]);

  // Pagination for "All Machines" tab (supports up to 100 records per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Auto-reset page to 1 when filters, machine, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMachine, searchQuery, selectedTypeFilter, selectedMonthFilter, selectedDayFilter, pageSize]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Paginated records: slice into pages when viewing "All Machines", or show all when on a single machine
  const displayedRecords = useMemo(() => {
    if (selectedMachine !== 'all') return filteredRecords;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredRecords, selectedMachine, startIndex, pageSize]);

  // Unique calendar dates in the currently filtered view
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    filteredRecords.forEach(r => {
      if (r.date) dates.add(r.date);
    });
    return Array.from(dates).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredRecords]);

  // Unique machines in the currently filtered view
  const uniqueMachinesInView = useMemo(() => {
    const m = new Set<string>();
    filteredRecords.forEach(r => {
      if (r.machineName) m.add(r.machineName);
    });
    return Array.from(m).sort(sortMachineNames);
  }, [filteredRecords]);

  // Dynamically calculate the maximum number of reasons across the current records (at least 3, can be 4, 5, 6, N...)
  const maxReasonsCount = useMemo(() => {
    if (filteredRecords.length === 0) return 3;
    const maxInRecords = Math.max(...filteredRecords.map(r => r.reasons?.length || 0));
    return Math.max(3, maxInRecords);
  }, [filteredRecords]);

  // Total Downtime Minutes & Events (filtered specifically to the active stoppage type when selected)
  const totalMinutes = useMemo(() => {
    return filteredRecords.reduce((sum, r) => {
      const activeReasons = selectedTypeFilter === 'all'
        ? (r.reasons || [])
        : (r.reasons || []).filter(sub => sub.type === selectedTypeFilter);
      const reasonsTotal = activeReasons.reduce((s, sub) => s + (Number(sub.durationMinutes) || 0), 0);
      return sum + reasonsTotal;
    }, 0);
  }, [filteredRecords, selectedTypeFilter]);

  // Downtime breakdown by Type for the active machine (keeps the full donut intact even when one is selected!)
  const typeDistributionData = useMemo(() => {
    const map: { [type: string]: number } = {};
    dateScopedRecords.forEach(r => {
      r.reasons.forEach(sub => {
        const typeName = sub.type || 'قالب';
        map[typeName] = (map[typeName] || 0) + (Number(sub.durationMinutes) || 0);
      });
    });

    return Object.entries(map).map(([typeName, mins]) => {
      const style = getTypeStyle(typeName);
      return {
        name: typeName,
        value: mins,
        color: style.color,
        textColor: style.textColor
      };
    }).sort((a, b) => b.value - a.value);
  }, [dateScopedRecords]);

  // Timeline chart data: when selectedTypeFilter is active, shows the daily graph specifically for that color/type!
  const timelineData = useMemo(() => {
    return dateScopedRecords.map(r => {
      if (selectedTypeFilter !== 'all') {
        const typeMins = r.reasons
          .filter(sub => sub.type === selectedTypeFilter)
          .reduce((sum, sub) => sum + (Number(sub.durationMinutes) || 0), 0);

        return {
          date: r.date,
          minutes: typeMins,
          type: selectedTypeFilter,
          reasons: r.reasons.filter(sub => sub.type === selectedTypeFilter).map(s => s.reason).join(' + ')
        };
      }

      const totalRecMins = (r.reasons || []).reduce((s, sub) => s + (Number(sub.durationMinutes) || 0), 0);
      return {
        date: r.date,
        minutes: totalRecMins > 0 ? totalRecMins : (Number(r.totalDowntimeMinutes) || 0),
        type: 'Total',
        reasons: r.rawReasonsText || r.reasons.map(s => s.reason).join(' + ')
      };
    });
  }, [dateScopedRecords, selectedTypeFilter]);

  // Active color for the daily graph (matches the selected color from the donut!)
  const activeColor = useMemo(() => {
    if (selectedTypeFilter !== 'all') {
      const style = getTypeStyle(selectedTypeFilter);
      return style?.color || '#3B82F6';
    }
    return '#3B82F6';
  }, [selectedTypeFilter]);

  // Active selected type total minutes
  const activeTypeTotalMinutes = useMemo(() => {
    if (selectedTypeFilter === 'all') return totalMinutes;
    return timelineData.reduce((sum, d) => sum + d.minutes, 0);
  }, [selectedTypeFilter, timelineData, totalMinutes]);

  // ==========================================
  // OEE CALCULATION ENGINE & MEMOIZATIONS
  // ==========================================

  // Active Machine nominal daily capability (defaults to 23,000 pcs / day)
  const activeMachineCapability = machineCapabilities[selectedMachine] || 23000;

  // Active machine's daily production map (date => DailyProductionRecord)
  const machineProductionMap = useMemo(() => {
    return dailyProductionData[selectedMachine] || {};
  }, [dailyProductionData, selectedMachine]);

  // Is viewing a single specific day?
  const isSingleDayView = selectedDayFilter !== 'all';

  // Map of all downtime records by date for fast lookup
  const downtimeMap = useMemo(() => {
    const map = new Map<string, DowntimeRecord>();
    machineRecords.forEach(r => {
      if (r.date) map.set(r.date, r);
    });
    return map;
  }, [machineRecords]);

  // Distinct dates in the current month scope (combining downtime records and production logs)
  const currentMonthCalendarDates = useMemo(() => {
    const datesSet = new Set<string>();
    machineRecords.forEach(r => {
      const { monthKey } = parseRecordDate(r.date);
      if (selectedMonthFilter === 'all' || monthKey === selectedMonthFilter) {
        if (r.date) datesSet.add(r.date);
      }
    });
    Object.keys(machineProductionMap).forEach(d => {
      const { monthKey } = parseRecordDate(d);
      if (selectedMonthFilter === 'all' || monthKey === selectedMonthFilter) {
        datesSet.add(d);
      }
    });
    return Array.from(datesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [machineRecords, machineProductionMap, selectedMonthFilter]);

  // Month-level OEE summary (calculates average ONLY across operational working days!)
  // Non-working/stopped days are NOT counted as 0; they are excluded from the denominator.
  const monthOeeSummary = useMemo(() => {
    return calculateMonthOee(
      currentMonthCalendarDates,
      downtimeMap,
      machineProductionMap,
      activeMachineCapability
    );
  }, [currentMonthCalendarDates, downtimeMap, machineProductionMap, activeMachineCapability]);

  // Active single-day OEE result (when a specific day is selected)
  const singleDayOeeResult = useMemo(() => {
    if (!isSingleDayView) return null;
    // Find target date matching selectedDayFilter
    const targetDate = dateScopedRecords[0]?.date || 
      (availableDays.find(d => d.key === selectedDayFilter)?.dateStr) || 
      currentMonthCalendarDates.find(d => {
        const { day } = parseRecordDate(d);
        return day === selectedDayFilter || d === selectedDayFilter;
      }) || selectedDayFilter;

    const rec = downtimeMap.get(targetDate);
    const prod = machineProductionMap[targetDate];
    return calculateDayOee(targetDate, rec, prod, activeMachineCapability);
  }, [isSingleDayView, dateScopedRecords, availableDays, selectedDayFilter, currentMonthCalendarDates, downtimeMap, machineProductionMap, activeMachineCapability]);

  // Active OEE values for display (switches between single day vs month average)
  const displayedOee = isSingleDayView
    ? (singleDayOeeResult?.oee || 0)
    : monthOeeSummary.averageOee;

  const displayedAvailability = isSingleDayView
    ? (singleDayOeeResult?.availability || 0)
    : monthOeeSummary.averageAvailability;

  const displayedPerformance = isSingleDayView
    ? (singleDayOeeResult?.performance || 0)
    : monthOeeSummary.averagePerformance;

  const displayedQuality = isSingleDayView
    ? (singleDayOeeResult?.quality || 0)
    : monthOeeSummary.averageQuality;

  const displayedGoodProd = isSingleDayView
    ? (singleDayOeeResult?.goodProduction || 0)
    : monthOeeSummary.totalGoodProduction;

  const displayedWaste = isSingleDayView
    ? (singleDayOeeResult?.waste || 0)
    : monthOeeSummary.totalWaste;

  const displayedRunTime = isSingleDayView
    ? (singleDayOeeResult?.runTimeMinutes || 0)
    : monthOeeSummary.totalRunTimeMinutes;

  const displayedPlannedTime = isSingleDayView
    ? (singleDayOeeResult?.plannedMinutes || 1440)
    : Math.max(0, (monthOeeSummary.workingDaysCount * 1440) - monthOeeSummary.totalExcludedMinutes);

  const displayedExpectedOutput = isSingleDayView
    ? Math.round(displayedRunTime * (activeMachineCapability / 1440))
    : Math.round(monthOeeSummary.totalRunTimeMinutes * (activeMachineCapability / 1440));

  const displayedExcludedMins = isSingleDayView
    ? (singleDayOeeResult?.excludedDowntimeMinutes || 0)
    : monthOeeSummary.totalExcludedMinutes;

  const displayedExcludedReduction = isSingleDayView
    ? (singleDayOeeResult?.capabilityReduction || 0)
    : Math.round((monthOeeSummary.totalExcludedMinutes / 1440) * activeMachineCapability);

  const displayedAdjCap = isSingleDayView
    ? (singleDayOeeResult?.adjustedCapability || activeMachineCapability)
    : monthOeeSummary.totalAdjustedCapability;

  const displayedExcludedReasonNames = isSingleDayView
    ? singleDayOeeResult?.excludedReasons.join(', ')
    : '';

  const activeDateLabel = isSingleDayView
    ? (singleDayOeeResult?.date || `Day ${selectedDayFilter}`)
    : 'Selected Scope';

  const getOeeColor = (val: number) => {
    if (val >= 80) return '#10B981'; // Emerald
    if (val >= 65) return '#F59E0B'; // Amber
    return '#EF4444'; // Rose
  };

  // Open OEE modal helper
  const handleOpenOeeConfig = (targetDate?: string) => {
    const dateToUse = targetDate || (isSingleDayView ? (singleDayOeeResult?.date || '25/09/2026') : '25/09/2026');
    setOeeDraftDate(dateToUse);
    const existing = machineProductionMap[dateToUse] || {
      production: 15582,
      waste: 632,
      customRunTimeMinutes: 1245,
      isWorkingDay: true
    };
    setOeeDraftProd(existing.production);
    setOeeDraftWaste(existing.waste);
    setOeeDraftRunTime(existing.customRunTimeMinutes ?? 1245);
    setOeeDraftIsWorking(existing.isWorkingDay);
    setOeeDraftCapability(activeMachineCapability);
    setIsOeeConfigModalOpen(true);
  };

  const handleOeeModalDateChange = (newDate: string) => {
    setOeeDraftDate(newDate);
    const existing = machineProductionMap[newDate] || {
      production: 15582,
      waste: 632,
      customRunTimeMinutes: 1245,
      isWorkingDay: true
    };
    setOeeDraftProd(existing.production);
    setOeeDraftWaste(existing.waste);
    setOeeDraftRunTime(existing.customRunTimeMinutes ?? 1245);
    setOeeDraftIsWorking(existing.isWorkingDay);
  };

  const handleAutoFillRunTime = () => {
    const rec = downtimeMap.get(oeeDraftDate);
    const downtime = Number(rec?.totalDowntimeMinutes) || 0;
    setOeeDraftRunTime(Math.max(0, 1440 - downtime));
  };

  const handleSaveOeeConfig = () => {
    setMachineCapabilities(prev => ({
      ...prev,
      [selectedMachine]: Number(oeeDraftCapability) || 23000
    }));

    setDailyProductionData(prev => {
      const machineData = { ...(prev[selectedMachine] || {}) };
      machineData[oeeDraftDate] = {
        production: Number(oeeDraftProd) || 0,
        waste: Number(oeeDraftWaste) || 0,
        customRunTimeMinutes: Number(oeeDraftRunTime) || 0,
        isWorkingDay: oeeDraftIsWorking
      };
      return { ...prev, [selectedMachine]: machineData };
    });

    logAction('OEE Updated', `Updated capability (${oeeDraftCapability}) and production for ${selectedMachine} on ${oeeDraftDate}`, 'info');
    setIsOeeConfigModalOpen(false);
  };

  const handleToggleDayWorking = (dateKey: string, currentVal: boolean) => {
    setDailyProductionData(prev => {
      const machineData = { ...(prev[selectedMachine] || {}) };
      const current = machineData[dateKey] || { production: 15582, waste: 632, customRunTimeMinutes: 1245, isWorkingDay: true };
      machineData[dateKey] = {
        ...current,
        isWorkingDay: !currentVal,
        production: !currentVal ? (current.production || 15582) : 0,
        waste: !currentVal ? (current.waste || 632) : 0,
        customRunTimeMinutes: !currentVal ? (current.customRunTimeMinutes || 1245) : 0
      };
      return { ...prev, [selectedMachine]: machineData };
    });
  };

  const handleResetOeeToBenchmark = () => {
    setMachineCapabilities(prev => ({
      ...prev,
      [selectedMachine]: 23000
    }));
    setDailyProductionData(prev => ({
      ...prev,
      [selectedMachine]: INITIAL_DAILY_PRODUCTION['MK 1'] || {}
    }));
    setOeeDraftCapability(23000);
    setOeeDraftProd(15582);
    setOeeDraftWaste(632);
    setOeeDraftRunTime(1245);
    setOeeDraftIsWorking(true);
    logAction('OEE Reset', `Reset ${selectedMachine} production benchmark to 26 working days & 4 stopped days`, 'info');
  };

  // Handle live typing in the "Combined Reasons with +" box
  const handleCombinedReasonsChange = (val: string) => {
    setDraftCombinedReasons(val);
    const parsedPieces = splitReasonsText(val);
    
    if (parsedPieces.length === 0) {
      setDraftSubReasons([{ id: '1', reason: '', durationMinutes: 0, type: 'قالب' }]);
      return;
    }

    setDraftSubReasons(prev => {
      return parsedPieces.map((piece, idx) => {
        const existing = prev[idx];
        return {
          id: String(idx + 1),
          reason: piece,
          durationMinutes: existing && existing.durationMinutes > 0 ? existing.durationMinutes : (idx === 0 ? 30 : 15),
          type: existing && existing.type ? existing.type : guessTypeFromReasonText(piece)
        };
      });
    });
  };

  // Open modal
  const handleOpenModal = (record?: DowntimeRecord) => {
    if (record) {
      setEditingRecord(record);
      setDraftMachine(record.machineName);
      setDraftDate(record.date);
      setDraftCombinedReasons(record.rawReasonsText || record.reasons.map(r => r.reason).join(' + '));
      setDraftSubReasons([...record.reasons]);
    } else {
      setEditingRecord(null);
      setDraftMachine(selectedMachine !== 'all' ? selectedMachine : 'MK 1');
      setDraftDate(new Date().toLocaleDateString('en-GB'));
      const initialText = 'بقاء المنتج في القالب + خلل في الروبوت';
      setDraftCombinedReasons(initialText);
      const parts = splitReasonsText(initialText);
      setDraftSubReasons(parts.map((p, idx) => ({
        id: String(idx + 1),
        reason: p,
        durationMinutes: idx === 0 ? 34 : 78,
        type: guessTypeFromReasonText(p)
      })));
    }
    setIsLogModalOpen(true);
  };

  // Save single record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const activeReasons = draftSubReasons.filter(r => r.reason.trim() !== '');
    if (activeReasons.length === 0) {
      alert('Please enter at least one reason.');
      return;
    }

    const calculatedTotal = activeReasons.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0);
    const rawText = draftCombinedReasons.trim() || activeReasons.map(r => r.reason).join(' + ');

    const newRecord: DowntimeRecord = {
      id: editingRecord ? editingRecord.id : `${draftMachine.replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`,
      machineId: draftMachine.toLowerCase().replace(/\s+/g, '-'),
      machineName: draftMachine,
      date: draftDate,
      rawReasonsText: rawText,
      reasons: activeReasons,
      totalDowntimeMinutes: calculatedTotal,
      status: 'Resolved'
    };

    if (editingRecord) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r));
      logAction('Downtime Updated', `Updated entry for ${draftMachine} (${calculatedTotal}m)`, 'info');
    } else {
      setRecords([newRecord, ...records]);
      logAction('Downtime Logged', `Logged entry for ${draftMachine} with ${activeReasons.length} separated reasons (${calculatedTotal}m)`, 'success');
    }

    setIsLogModalOpen(false);
  };

  // Handle Excel file upload (.xlsx, .xls, .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelDowntimeFile(buffer, selectedMachine !== 'all' ? selectedMachine : 'MK 1');

      if (result.formatType === 'daily_all_machines' && result.dailyResult) {
        // Daily multi-machine sheet detected! Open the Pop-up Tab as requested!
        setDailyImportData(result.dailyResult);
        setIsDailyReviewOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (result.records.length === 0) {
        alert('Could not find downtime rows in the uploaded file. Please ensure it contains machine names and reasons.');
        return;
      }

      // Monthly sheet fallback
      setRecords(prev => [...result.records, ...prev]);
      logAction('Excel Imported', `Imported ${result.totalParsed} downtime records from ${file.name}.`, 'success');
      alert(`Successfully imported ${result.totalParsed} records from "${file.name}"!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      alert(`Error reading Excel file: ${err?.message || 'Invalid format'}`);
    }
  };

  // Handle Pasted Daily Text
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const result = parsePastedDailyText(pastedText, pasteDate);
    if (result.items.length === 0) {
      alert('Could not parse machine rows. Please ensure you copied both columns (NO.MK and REASON).');
      return;
    }
    setDailyImportData(result);
    setIsPasteModalOpen(false);
    setIsDailyReviewOpen(true);
  };

  // Update a sub-reason in the Daily Import Pop-up
  const handleUpdateDailySubReason = (itemIdx: number, subIdx: number, field: keyof DowntimeSubReason, value: any) => {
    if (!dailyImportData) return;
    const updatedItems = [...dailyImportData.items];
    const item = { ...updatedItems[itemIdx] };
    const reasons = [...item.reasons];
    reasons[subIdx] = { ...reasons[subIdx], [field]: value };
    item.reasons = reasons;
    updatedItems[itemIdx] = item;
    setDailyImportData({ ...dailyImportData, items: updatedItems });
  };

  // Auto-allocate remaining minutes into the last reason or first 0 reason
  const handleAutoAllocateRemaining = (itemIdx: number, diff: number) => {
    if (!dailyImportData || diff <= 0) return;
    const updatedItems = [...dailyImportData.items];
    const item = { ...updatedItems[itemIdx] };
    const reasons = [...item.reasons];
    if (reasons.length === 0) return;

    let targetIdx = reasons.findIndex(r => (Number(r.durationMinutes) || 0) === 0);
    if (targetIdx === -1) targetIdx = reasons.length - 1;

    const currentVal = Number(reasons[targetIdx].durationMinutes) || 0;
    reasons[targetIdx] = {
      ...reasons[targetIdx],
      durationMinutes: currentVal + diff
    };

    item.reasons = reasons;
    updatedItems[itemIdx] = item;
    setDailyImportData({ ...dailyImportData, items: updatedItems });
  };

  // Split target equally across all sub-reasons
  const handleSplitEqually = (itemIdx: number, targetTotal: number) => {
    if (!dailyImportData || targetTotal <= 0) return;
    const updatedItems = [...dailyImportData.items];
    const item = { ...updatedItems[itemIdx] };
    const reasons = [...item.reasons];
    if (reasons.length === 0) return;

    const perReason = Math.floor(targetTotal / reasons.length);
    const remainder = targetTotal % reasons.length;

    const updatedReasons = reasons.map((r, i) => ({
      ...r,
      durationMinutes: perReason + (i === 0 ? remainder : 0)
    }));

    item.reasons = updatedReasons;
    updatedItems[itemIdx] = item;
    setDailyImportData({ ...dailyImportData, items: updatedItems });
  };

  // Save the entire Daily batch into the Monthly stop times!
  const handleApplyDailyToMonthly = () => {
    if (!dailyImportData) return;

    const newRecordsToInsert: DowntimeRecord[] = [];
    const dateStr = dailyImportData.date;

    dailyImportData.items.forEach(item => {
      const activeReasons = item.reasons.filter(r => r.reason.trim() !== '');
      const totalMinutes = activeReasons.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0);
      
      const record: DowntimeRecord = {
        id: `${item.machineName.replace(/\s+/g, '')}-${dateStr.replace(/[\/\-]/g, '')}`,
        machineId: item.machineName.toLowerCase().replace(/\s+/g, '-'),
        machineName: item.machineName,
        date: dateStr,
        rawReasonsText: item.rawText || activeReasons.map(r => r.reason).join(' + '),
        reasons: activeReasons.length > 0 ? activeReasons : [{ id: '1', reason: 'لا يوجد توقف', durationMinutes: 0, type: 'قالب' }],
        totalDowntimeMinutes: totalMinutes,
        status: 'Resolved'
      };

      newRecordsToInsert.push(record);
    });

    // Merge: for each machine and date, replace if existing, otherwise append
    setRecords(prev => {
      const filtered = prev.filter(r => {
        return !newRecordsToInsert.some(n => n.machineName === r.machineName && n.date === r.date);
      });
      return [...newRecordsToInsert, ...filtered];
    });

    logAction(
      'Daily Batch Applied', 
      `Inserted daily stoppage times for ${dailyImportData.items.length} machines on ${dateStr} into monthly records.`, 
      'success'
    );

    alert(`Successfully applied downtime records for ${dailyImportData.items.length} machines on ${dateStr} to the monthly stop times!`);
    setIsDailyReviewOpen(false);
    setDailyImportData(null);
  };

  // Execute delete (single or bulk) cleanly in state and storage
  const executeDeleteRecords = (keysToRemove: string[]) => {
    const toRemoveSet = new Set(keysToRemove);
    setRecords(prev => prev.filter(r => !toRemoveSet.has(getRecordKey(r))));
    setSelectedRecordKeys(prev => {
      const next = new Set(prev);
      keysToRemove.forEach(k => next.delete(k));
      return next;
    });
    logAction('Downtime Deleted', `Deleted ${keysToRemove.length} record(s).`, 'warning');
    setDeleteConfirmModal(null);
  };

  const handleRequestDeleteSingle = (record: DowntimeRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = getRecordKey(record);
    setDeleteConfirmModal({
      open: true,
      keys: [key],
      title: `Delete record for ${record.machineName} (${record.date})?`,
      description: `This will permanently remove the downtime entry (${record.totalDowntimeMinutes} min) on ${record.date}.`
    });
  };

  const handleRequestDeleteSelected = () => {
    if (selectedRecordKeys.size === 0) return;
    setDeleteConfirmModal({
      open: true,
      keys: Array.from(selectedRecordKeys),
      title: `Delete ${selectedRecordKeys.size} selected record(s)?`,
      description: `Are you sure you want to permanently delete these ${selectedRecordKeys.size} selected downtime entries?`
    });
  };

  const handleRequestDeleteAllForMachine = () => {
    if (filteredRecords.length === 0) return;
    const allKeys = filteredRecords.map(r => getRecordKey(r));
    setDeleteConfirmModal({
      open: true,
      keys: allKeys,
      title: `Delete all records for ${selectedMachine}?`,
      description: `Are you sure you want to permanently delete all ${filteredRecords.length} downtime entries for ${selectedMachine}?`
    });
  };

  // Toggle single selection (supports Shift-Click range selection)
  const handleToggleSelectRecord = (recordKey: string, index: number, isShiftKey: boolean) => {
    const next = new Set(selectedRecordKeys);

    if (isShiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        if (filteredRecords[i]) {
          next.add(getRecordKey(filteredRecords[i]));
        }
      }
    } else {
      if (next.has(recordKey)) {
        next.delete(recordKey);
      } else {
        next.add(recordKey);
      }
      setLastSelectedIndex(index);
    }

    setSelectedRecordKeys(next);
  };

  // Toggle select all on current visible view/page
  const isAllSelected = displayedRecords.length > 0 && displayedRecords.every(r => selectedRecordKeys.has(getRecordKey(r)));
  const isSomeSelected = selectedRecordKeys.size > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedRecordKeys);
      displayedRecords.forEach(r => next.delete(getRecordKey(r)));
      setSelectedRecordKeys(next);
    } else {
      const next = new Set(selectedRecordKeys);
      displayedRecords.forEach(r => next.add(getRecordKey(r)));
      setSelectedRecordKeys(next);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full pb-6 text-primary">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 border-b border-divider pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Machine Downtime & Multi-Reason Matrix
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              Daily Sheet Auto-Organizer
            </span>
          </div>
          <p className="text-xs text-tertiary mt-1">
            Upload your daily Excel sheet with <code className="text-cyan-400 font-mono">NO.MK</code> & <code className="text-amber-400 font-mono">REASON</code>. The app organizes it, opens a review pop-up tab to add time and type for each separated reason, and inserts it into the total monthly stop times!
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Excel Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Upload daily Excel sheet with NO.MK and REASON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Daily Excel (.xlsx)</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />

          {/* Paste Daily Text Button */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-elevated border border-divider rounded-lg text-xs font-medium text-secondary transition-colors cursor-pointer"
            title="Paste directly from Excel table"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-400" />
            <span>Paste Table</span>
          </button>

          {/* Export All Machines (.xlsx with a sheet tab for every machine) */}
          <button
            type="button"
            onClick={handleExportAllMachines}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Download full multi-tab Excel workbook containing a sheet for every machine"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export All Machines (.xlsx)'}</span>
            <span className="bg-black/25 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {machineList.length} Tabs
            </span>
          </button>

          {/* Export Current Selected Machine Excel */}
          <button
            type="button"
            onClick={() => exportRainbowMachineHealthExcel(
              selectedMachine === 'all' ? records : records.filter(r => r.machineName === selectedMachine), 
              selectedMachine !== 'all' ? selectedMachine : 'All_Machines'
            )}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary hover:text-primary rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title={`Download Excel sheet for ${selectedMachine}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export {selectedMachine !== 'all' ? selectedMachine : 'Current'}</span>
          </button>

          {/* Standard CSV */}
          <button
            type="button"
            onClick={() => exportMachineHealthCSV(filteredRecords)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-elevated border border-divider rounded-lg text-xs font-medium text-secondary transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV</span>
          </button>

          {/* Single Entry */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Single Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Machine Selector Tabs & View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Machine Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin max-w-full">
          <button
            type="button"
            onClick={() => setSelectedMachine('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedMachine === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-surface hover:bg-surface-elevated border border-divider text-secondary'
            }`}
          >
            All Machines
          </button>

          {machineList.map(name => (
            <button
              type="button"
              key={name}
              onClick={() => setSelectedMachine(name)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedMachine === name
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-surface hover:bg-surface-elevated border border-divider text-secondary'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center gap-1 p-1 bg-surface border border-divider rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('spreadsheet')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'spreadsheet' ? 'bg-surface-elevated text-primary font-bold shadow-xs' : 'text-tertiary hover:text-secondary'
            }`}
          >
            Monthly Sheet View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'analytics' ? 'bg-surface-elevated text-primary font-bold shadow-xs' : 'text-tertiary hover:text-secondary'
            }`}
          >
            Charts & Trends
          </button>
        </div>
      </div>

      {/* High-Level Machine Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface border border-divider rounded-xl p-4 shadow-xs">
        <div>
          <span className="text-[11px] text-tertiary block">
            {selectedMachine === 'all' ? 'Active Scope' : 'Active Machine'}
          </span>
          <span className="text-xl font-bold font-mono text-primary">
            {selectedMachine === 'all' ? 'All Machines' : selectedMachine}
          </span>
          <span className="text-[11px] text-tertiary block mt-0.5">
            {selectedMachine === 'all' 
              ? `${uniqueMachinesInView.length} machines logged` 
              : 'Individual machine logs'}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-tertiary block">
            {selectedTypeFilter !== 'all'
              ? `Days with "${selectedTypeFilter}"`
              : (selectedMachine === 'all' ? 'Calendar Dates Logged' : 'Recorded Days in Month')}
          </span>
          <span className="text-xl font-bold font-mono text-primary tabular-nums">
            {uniqueDates.length} {uniqueDates.length === 1 ? 'Date' : 'Dates'}
          </span>
          <span className="text-[11px] text-tertiary block mt-0.5 truncate" title={uniqueDates.join(', ')}>
            {uniqueDates.length === 1 
              ? `Date: ${uniqueDates[0]} (${filteredRecords.length} records)` 
              : `${uniqueDates.length} calendar days (${filteredRecords.length} records)`}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-tertiary block">
            {selectedTypeFilter !== 'all'
              ? `Total Stop Time (${selectedTypeFilter})`
              : (selectedMachine === 'all' ? 'Total Plant Stop Time' : 'Total Monthly Stop Time')}
          </span>
          <span className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            {totalMinutes} min
          </span>
          <span className="text-[11px] text-tertiary block mt-0.5">
            {(totalMinutes / 60).toFixed(1)} hrs {selectedTypeFilter !== 'all' ? 'filtered' : 'total'} stoppage
          </span>
        </div>

        <div>
          <span className="text-[11px] text-tertiary block">
            {selectedTypeFilter !== 'all'
              ? `Avg Daily (${selectedTypeFilter})`
              : (selectedMachine === 'all' ? 'Average per Machine' : 'Average Daily Downtime')}
          </span>
          <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
            {selectedMachine === 'all' 
              ? `${uniqueMachinesInView.length > 0 ? Math.round(totalMinutes / uniqueMachinesInView.length) : 0} min / machine`
              : `${uniqueDates.length > 0 ? Math.round(totalMinutes / uniqueDates.length) : 0} min / day`}
          </span>
          <span className="text-[11px] text-tertiary block mt-0.5">
            {selectedTypeFilter !== 'all'
              ? `Across ${uniqueDates.length} operational days with ${selectedTypeFilter}`
              : (selectedMachine === 'all' && uniqueDates.length > 0
                ? `${Math.round(totalMinutes / uniqueDates.length)} min total / date`
                : `Across ${uniqueDates.length} operational days`)}
          </span>
        </div>
      </div>

      {/* SPREADSHEET VIEW (Exact layout matching user's Image 1 & 2) */}
      {viewMode === 'spreadsheet' && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Main Table Container */}
          <div className="flex-1 bg-surface border border-divider rounded-xl shadow-xs overflow-hidden flex flex-col w-full">
            {/* Table Control Bar */}
            <div className="px-5 py-3.5 border-b border-divider flex flex-wrap justify-between items-center gap-3 bg-surface-elevated/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">
                  {selectedMachine === 'all' ? 'All Machines Stoppage Matrix' : `${selectedMachine} Monthly Downtime Matrix`}
                </span>
                <span className="text-xs text-tertiary font-mono">
                  {selectedMachine === 'all' 
                    ? `(${filteredRecords.length} entries • Page ${safeCurrentPage} of ${totalPages})` 
                    : `(${uniqueDates.length} days logged)`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search machine, date, reason..."
                    className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Page Size Selector when viewing All Machines */}
                {selectedMachine === 'all' && (
                  <div className="flex items-center gap-1.5 bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs">
                    <span className="text-tertiary text-[11px] font-medium">Show:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-primary font-bold focus:outline-none cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                      aria-label="Show entries per page"
                    >
                      <option value={10} className="bg-surface text-primary">10</option>
                      <option value={25} className="bg-surface text-primary">25</option>
                      <option value={50} className="bg-surface text-primary">50</option>
                      <option value={100} className="bg-surface text-primary">100</option>
                    </select>
                  </div>
                )}

                {/* Filter by Month */}
                {availableMonths.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <select
                      value={selectedMonthFilter}
                      onChange={e => setSelectedMonthFilter(e.target.value)}
                      className="bg-transparent text-primary font-medium focus:outline-none cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                      aria-label="Filter by Month"
                    >
                      <option value="all" className="bg-surface text-primary">All Months ({availableMonths.length})</option>
                      {availableMonths.map(m => (
                        <option key={m.key} value={m.key} className="bg-surface text-primary">{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filter by Day */}
                {availableDays.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <select
                      value={selectedDayFilter}
                      onChange={e => setSelectedDayFilter(e.target.value)}
                      className="bg-transparent text-primary font-medium focus:outline-none cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                      aria-label="Filter by Day"
                    >
                      <option value="all" className="bg-surface text-primary">All Days ({availableDays.length})</option>
                      {availableDays.map(d => (
                        <option key={d.key} value={d.key} className="bg-surface text-primary">{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filter by Type */}
                <select
                  value={selectedTypeFilter}
                  onChange={e => setSelectedTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-canvas border border-divider rounded-lg text-xs text-primary focus:outline-none [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                >
                  <option value="all" className="bg-surface text-primary">All Types (All Colors)</option>
                  {DOWNTIME_TYPES.map(t => (
                    <option key={t.id} value={t.name} className="bg-surface text-primary">{t.name}</option>
                  ))}
                </select>

                {/* Reset Filters button if any filter is active */}
                {(selectedMonthFilter !== 'all' || selectedDayFilter !== 'all' || selectedTypeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonthFilter('all');
                      setSelectedDayFilter('all');
                      setSelectedTypeFilter('all');
                    }}
                    className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset Month, Day, and Type filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}

                {/* Toggle Legend button */}
                <button
                  type="button"
                  onClick={() => setShowLegendPanel(!showLegendPanel)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    showLegendPanel 
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                      : 'bg-surface hover:bg-surface-elevated text-secondary border-divider'
                  }`}
                >
                  {showLegendPanel ? 'Hide Legend' : 'Show Legend'}
                </button>

                {/* Quick Delete All for Current Machine */}
                {!isReadOnly && filteredRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRequestDeleteAllForMachine}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Delete all ${filteredRecords.length} records for ${selectedMachine}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All ({filteredRecords.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Selection Action Banner */}
            {selectedRecordKeys.size > 0 && (
              <div className="bg-blue-600/15 border-b border-blue-500/30 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-primary">
                    {selectedRecordKeys.size} {selectedRecordKeys.size === 1 ? 'record' : 'records'} selected
                  </span>
                  <span className="text-tertiary hidden sm:inline">
                    (Tip: hold Shift while clicking to select a range)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecordKeys(new Set(filteredRecords.map(r => getRecordKey(r))))}
                    className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-divider rounded text-secondary hover:text-primary transition-colors cursor-pointer text-xs"
                  >
                    Select All ({filteredRecords.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRecordKeys(new Set())}
                    className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-divider rounded text-secondary hover:text-primary transition-colors cursor-pointer text-xs"
                  >
                    Deselect All
                  </button>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleRequestDeleteSelected}
                      className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold shadow-xs transition-colors cursor-pointer text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedRecordKeys.size})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Table mimicking Excel Sheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Row 1 Group Headers */}
                  <tr className="text-white text-center font-bold">
                    {/* Checkbox Column */}
                    <th className="bg-[#002060] py-2 px-2 border border-divider text-center w-10 shrink-0" rowSpan={2}>
                      <input 
                        type="checkbox"
                        aria-label="Select all records"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-divider text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </th>
                    {selectedMachine === 'all' && (
                      <th className="bg-[#002060] py-2 px-3 border border-divider text-center min-w-[90px]" rowSpan={2}>
                        Machine
                      </th>
                    )}
                    <th className="bg-[#002060] py-2 px-3 border border-divider" rowSpan={2}>
                      Date
                    </th>
                    <th className="bg-[#002060] py-2 px-4 border border-divider min-w-[280px]" rowSpan={2}>
                      reasons (Combined with +)
                    </th>
                    {/* Dynamic Reason Group Headers (Reason 1, Reason 2, Reason 3, Reason 4, Reason 5...) */}
                    {Array.from({ length: maxReasonsCount }).map((_, i) => {
                      const color = getReasonGroupColors(i);
                      return (
                        <th 
                          key={`th-grp-${i}`}
                          className="py-2 px-3 border border-divider text-center font-bold" 
                          style={{ backgroundColor: color.bgHex }}
                          colSpan={3}
                        >
                          Reason {i + 1}
                        </th>
                      );
                    })}
                    <th className="bg-[#0F172A] py-2 px-3 border border-divider text-center" rowSpan={2}>
                      Total Time
                    </th>
                    <th className="bg-[#0F172A] py-2 px-2 border border-divider text-right" rowSpan={2}>
                      Actions
                    </th>
                  </tr>

                  {/* Row 2 Subheaders */}
                  <tr className="text-white text-center font-semibold text-[11px]">
                    {Array.from({ length: maxReasonsCount }).map((_, i) => {
                      const color = getReasonGroupColors(i);
                      return (
                        <React.Fragment key={`sub-grp-${i}`}>
                          <th className="py-1.5 px-3 border border-divider min-w-[140px]" style={{ backgroundColor: color.subHex }}>
                            The reason
                          </th>
                          <th className="py-1.5 px-2 border border-divider w-14" style={{ backgroundColor: color.subHex }}>
                            Time
                          </th>
                          <th className="py-1.5 px-2 border border-divider w-24" style={{ backgroundColor: color.subHex }}>
                            Type
                          </th>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-divider font-sans">
                  {displayedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={(selectedMachine === 'all' ? 6 : 5) + maxReasonsCount * 3} className="py-12 text-center text-tertiary">
                        No records found for this view. Upload a daily sheet to populate!
                      </td>
                    </tr>
                  ) : (
                    displayedRecords.map((r, rowIdx) => {
                      const recKey = getRecordKey(r);
                      const isSelected = selectedRecordKeys.has(recKey);
                      const globalIdx = selectedMachine === 'all' ? startIndex + rowIdx : rowIdx;

                      return (
                        <tr 
                          key={`${r.id || 'rec'}_${r.machineName}_${r.date}_${rowIdx}`} 
                          className={`transition-colors ${isSelected ? 'bg-blue-600/15' : 'hover:bg-surface-elevated/40'}`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-2.5 px-2 text-center border-r border-divider">
                            <input 
                              type="checkbox"
                              aria-label={`Select record ${r.id || rowIdx}`}
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectRecord(recKey, globalIdx, (e.nativeEvent as MouseEvent).shiftKey)}
                              className="w-4 h-4 rounded border-divider text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                          </td>

                          {/* Machine Column when in 'all' view */}
                          {selectedMachine === 'all' && (
                            <td className="py-2.5 px-3 text-center border-r border-divider font-mono">
                              <span className="inline-block px-2.5 py-0.5 rounded font-bold text-xs bg-blue-500/15 border border-blue-500/30 text-blue-300 shadow-xs">
                                {r.machineName}
                              </span>
                            </td>
                          )}

                          {/* Date */}
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-secondary whitespace-nowrap border-r border-divider">
                            <bdi>{r.date}</bdi>
                          </td>

                          {/* Combined reasons with + highlighted */}
                          <td className="py-2.5 px-4 text-center font-medium text-primary border-r border-divider max-w-xs truncate" title={r.rawReasonsText}>
                            <bdi dir="auto">{r.rawReasonsText || '-'}</bdi>
                          </td>

                          {/* Dynamic Reasons (Reason 1, Reason 2, Reason 3, Reason 4, Reason 5...) */}
                          {Array.from({ length: maxReasonsCount }).map((_, i) => {
                            const sub = r.reasons[i];
                            const subStyle = sub?.type ? getTypeStyle(sub.type) : null;

                            return (
                              <React.Fragment key={`row-${recKey}-reason-${i}`}>
                                {/* Reason Text */}
                                <td className="py-2.5 px-3 text-center text-primary border-r border-divider max-w-[200px] truncate" title={sub?.reason}>
                                  <bdi dir="auto">{sub?.reason || ''}</bdi>
                                </td>
                                {/* Reason Time */}
                                <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-primary border-r border-divider">
                                  {sub && sub.durationMinutes !== undefined ? sub.durationMinutes : ''}
                                </td>
                                {/* Reason Type with Color Badge */}
                                <td className="py-2.5 px-2 text-center border-r border-divider">
                                  {subStyle && subStyle.name !== '-' && (
                                    <span 
                                      className="inline-block px-2 py-0.5 rounded text-[11px] font-bold shadow-xs whitespace-nowrap"
                                      style={{ backgroundColor: subStyle.color, color: subStyle.textColor }}
                                    >
                                      {subStyle.name}
                                    </span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Total Time */}
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-rose-400 border-r border-divider">
                            {r.totalDowntimeMinutes}m
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenModal(r)}
                                className="p-1 text-tertiary hover:text-blue-400 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRequestDeleteSingle(r, e)}
                                className="p-1 text-tertiary hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer (Active in All Machines tab) */}
            {selectedMachine === 'all' && totalItems > 0 && (
              <div className="px-5 py-3 border-t border-divider bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                {/* Left side: Rows per page & entry counter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-secondary font-medium">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs text-primary font-bold focus:outline-none focus:border-blue-500 cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                    >
                      <option value={10} className="bg-surface text-primary">10</option>
                      <option value={25} className="bg-surface text-primary">25</option>
                      <option value={50} className="bg-surface text-primary">50</option>
                      <option value={100} className="bg-surface text-primary">100</option>
                    </select>
                  </div>

                  <span className="text-tertiary">
                    Showing <span className="font-semibold font-mono text-primary">{startIndex + 1}</span>–<span className="font-semibold font-mono text-primary">{endIndex}</span> of <span className="font-semibold font-mono text-primary">{totalItems}</span> entries
                  </span>
                </div>

                {/* Right side: Page navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-divider bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-secondary hover:text-primary transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-divider bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-secondary hover:text-primary transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Pill Buttons */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }).map((_, pIdx) => {
                      const pageNum = pIdx + 1;
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        Math.abs(pageNum - safeCurrentPage) <= 1
                      ) {
                        return (
                          <button
                            key={`page-btn-${pageNum}`}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-w-7 h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              safeCurrentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-surface hover:bg-surface-elevated text-secondary border border-divider'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === 2 && safeCurrentPage > 3) {
                        return <span key="ellipsis-1" className="text-tertiary px-0.5">...</span>;
                      }
                      if (pageNum === totalPages - 1 && safeCurrentPage < totalPages - 2) {
                        return <span key="ellipsis-2" className="text-tertiary px-0.5">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-divider bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-secondary hover:text-primary transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-divider bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-secondary hover:text-primary transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RAINBOW COLOR LEGEND (Exact match to Image 1 right-side panel) */}
          {showLegendPanel && (
            <div className="w-full lg:w-48 bg-surface border border-divider rounded-xl p-3 shadow-xs shrink-0 flex flex-col gap-1.5">
              <div className="text-xs font-bold text-primary pb-2 border-b border-divider flex items-center justify-between">
                <span>Color Legend</span>
                <span className="text-[10px] text-tertiary">الرموز</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto pr-1">
                {DOWNTIME_TYPES.map(typeItem => (
                  <button
                    key={typeItem.id}
                    type="button"
                    onClick={() => setSelectedTypeFilter(selectedTypeFilter === typeItem.name ? 'all' : typeItem.name)}
                    className={`py-1.5 px-3 rounded text-center text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                      selectedTypeFilter === typeItem.name ? 'ring-2 ring-white ring-offset-1 scale-102' : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: typeItem.color,
                      color: typeItem.textColor,
                      borderColor: typeItem.color
                    }}
                  >
                    {typeItem.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS & TRENDS VIEW */}
      {viewMode === 'analytics' && (
        <div className="flex flex-col gap-4">
          {/* Analytics Date Filter Toolbar */}
          <div className="bg-surface border border-divider rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-primary">Charts Date Filter:</span>
              <span className="text-xs text-tertiary font-mono">
                {selectedMonthFilter !== 'all' 
                  ? (availableMonths.find(m => m.key === selectedMonthFilter)?.label || selectedMonthFilter)
                  : 'All Months'}
                {selectedDayFilter !== 'all' ? ` • Day ${parseInt(selectedDayFilter, 10)}` : ''}
              </span>
              {(selectedMonthFilter !== 'all' || selectedDayFilter !== 'all' || selectedTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthFilter('all');
                    setSelectedDayFilter('all');
                    setSelectedTypeFilter('all');
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold ml-1 cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Month Filter */}
              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1.5 bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    value={selectedMonthFilter}
                    onChange={e => setSelectedMonthFilter(e.target.value)}
                    className="bg-transparent text-primary font-medium focus:outline-none cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                    aria-label="Filter charts by Month"
                  >
                    <option value="all" className="bg-surface text-primary">All Months ({availableMonths.length})</option>
                    {availableMonths.map(m => (
                      <option key={m.key} value={m.key} className="bg-surface text-primary">{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day Filter */}
              {availableDays.length > 0 && (
                <div className="flex items-center gap-1.5 bg-canvas border border-divider rounded-lg px-2.5 py-1 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    value={selectedDayFilter}
                    onChange={e => setSelectedDayFilter(e.target.value)}
                    className="bg-transparent text-primary font-medium focus:outline-none cursor-pointer [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                    aria-label="Filter charts by Day"
                  >
                    <option value="all" className="bg-surface text-primary">All Days ({availableDays.length})</option>
                    {availableDays.map(d => (
                      <option key={d.key} value={d.key} className="bg-surface text-primary">{d.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stoppage Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-1 bg-canvas border border-divider rounded-lg text-xs text-primary focus:outline-none [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                aria-label="Filter charts by Stoppage Type"
              >
                <option value="all" className="bg-surface text-primary">All Types (All Colors)</option>
                {DOWNTIME_TYPES.map(t => (
                  <option key={t.id} value={t.name} className="bg-surface text-primary">{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline Chart (Left side) */}
          <div className="lg:col-span-8 bg-surface border border-divider rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: activeColor }} />
                  <span>
                    Daily Downtime Timeline for {selectedMachine}
                    {selectedTypeFilter !== 'all' ? ` — ${selectedTypeFilter}` : ''}
                  </span>
                </h2>
                <p className="text-xs text-tertiary mt-0.5">
                  {selectedTypeFilter !== 'all' 
                    ? `Showing daily downtime minutes specifically caused by "${selectedTypeFilter}"`
                    : 'Minutes lost per operational day across all stoppage causes'}
                </p>
              </div>

              {selectedTypeFilter !== 'all' && (
                <div className="flex items-center gap-2">
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs border"
                    style={{ 
                      backgroundColor: activeColor, 
                      color: getTypeStyle(selectedTypeFilter).textColor,
                      borderColor: activeColor
                    }}
                  >
                    <span>{selectedTypeFilter}</span>
                    <span className="opacity-90 font-mono">({activeTypeTotalMinutes} min)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('all')}
                    className="flex items-center gap-1 text-xs text-tertiary hover:text-primary px-2 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-divider transition-colors cursor-pointer"
                    title="Show all downtime causes"
                  >
                    <X className="w-3 h-3" />
                    <span>Show All</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradDynamic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeColor} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={activeColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit="m" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [
                      `${val} minutes`, 
                      selectedTypeFilter !== 'all' ? selectedTypeFilter : 'Total Downtime'
                    ]}
                    labelFormatter={(label: any, payload: any[]) => {
                      const item = payload?.[0]?.payload;
                      return item?.reasons ? `${label} (${item.reasons})` : label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="minutes" 
                    stroke={activeColor} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#areaGradDynamic)" 
                    dot={{ r: 4, fill: activeColor, stroke: '#0F172A', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: activeColor, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ============================================================== */}
            {/* OVERALL EQUIPMENT EFFECTIVENESS (OEE) ENGINE                   */}
            {/* ============================================================== */}
            <div className="mt-5 pt-4 border-t border-divider/80">
              {/* OEE Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <span>Overall Equipment Effectiveness (OEE)</span>
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        displayedOee >= 80 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : displayedOee >= 65 
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}>
                        {displayedOee >= 80 ? 'World Class / Excellent' : displayedOee >= 65 ? 'Operational Target' : 'Needs Optimization'}
                      </span>
                    </div>
                    <p className="text-[11px] text-tertiary">
                      {isSingleDayView 
                        ? `Daily operational performance for ${activeDateLabel}`
                        : `Monthly Average across ${monthOeeSummary.workingDaysCount} working days (${monthOeeSummary.stoppedDaysCount} stopped days excluded)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSingleDayView && (
                    <button
                      type="button"
                      onClick={() => setSelectedDayFilter('all')}
                      className="px-2.5 py-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>View Month Average</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenOeeConfig()}
                    className="px-3 py-1.5 text-xs font-semibold text-primary bg-surface hover:bg-surface-elevated border border-divider hover:border-blue-500/40 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Configure OEE & Production</span>
                  </button>
                </div>
              </div>

              {/* 4 Cards: OEE, Availability, Performance, Quality */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Overall OEE Card */}
                <div className="bg-canvas border border-divider rounded-xl p-3.5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Overall OEE</span>
                    <Percent className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="my-1">
                    <div className="text-2xl font-black font-mono tracking-tight tabular-nums" style={{ color: getOeeColor(displayedOee) }}>
                      {displayedOee.toFixed(1)}%
                    </div>
                    <div className="w-full bg-surface-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, displayedOee))}%`, backgroundColor: getOeeColor(displayedOee) }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-tertiary mt-1 flex justify-between items-center">
                    <span>A × P × Q</span>
                    <span className="font-mono font-medium text-secondary">Target: 80%+</span>
                  </div>
                </div>

                {/* 2. Availability (A) Card */}
                <div className="bg-canvas border border-divider rounded-xl p-3.5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Availability (A)</span>
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="my-1">
                    <div className="text-2xl font-black font-mono tracking-tight text-sky-400 tabular-nums">
                      {displayedAvailability.toFixed(1)}%
                    </div>
                    <div className="w-full bg-surface-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, displayedAvailability))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-tertiary mt-1 flex justify-between items-center">
                    <span className="font-mono">{displayedRunTime.toLocaleString()}m run</span>
                    <span className="font-mono text-secondary">/ {displayedPlannedTime.toLocaleString()}m plan</span>
                  </div>
                </div>

                {/* 3. Performance (P) Card */}
                <div className="bg-canvas border border-divider rounded-xl p-3.5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Performance (P)</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="my-1">
                    <div className="text-2xl font-black font-mono tracking-tight text-amber-400 tabular-nums">
                      {displayedPerformance.toFixed(1)}%
                    </div>
                    <div className="w-full bg-surface-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, displayedPerformance))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-tertiary mt-1 flex justify-between items-center">
                    <span className="font-mono">{(displayedGoodProd + displayedWaste).toLocaleString()} pcs</span>
                    <span className="font-mono text-secondary">/ {displayedExpectedOutput.toLocaleString()} exp</span>
                  </div>
                </div>

                {/* 4. Quality (Q) Card */}
                <div className="bg-canvas border border-divider rounded-xl p-3.5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Quality (Q)</span>
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="my-1">
                    <div className="text-2xl font-black font-mono tracking-tight text-emerald-400 tabular-nums">
                      {displayedQuality.toFixed(1)}%
                    </div>
                    <div className="w-full bg-surface-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, displayedQuality))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-tertiary mt-1 flex justify-between items-center">
                    <span className="font-mono text-emerald-400">{displayedGoodProd.toLocaleString()} good</span>
                    <span className="font-mono text-rose-400">{displayedWaste.toLocaleString()} waste</span>
                  </div>
                </div>
              </div>

              {/* Machine Capability Adjustment Banner (User Rule Callout) */}
              <div className="mt-3 p-3 bg-canvas/80 border border-divider rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary">Daily Machine Capability:</span>
                      <span className="font-mono font-bold text-secondary">{activeMachineCapability.toLocaleString()} pcs/day</span>
                      <span className="text-tertiary font-mono">({(activeMachineCapability / 24).toFixed(1)}/hr)</span>
                      {displayedExcludedReduction > 0 && (
                        <>
                          <span className="text-tertiary">➜</span>
                          <span className="text-rose-400 font-mono font-bold">-{displayedExcludedReduction.toLocaleString()} pcs</span>
                          <span className="text-tertiary">➜</span>
                          <span className="text-emerald-400 font-mono font-bold">Adjusted: {displayedAdjCap.toLocaleString()} pcs</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-tertiary mt-0.5">
                      {displayedExcludedMins > 0 ? (
                        <span>
                          <span className="text-amber-400 font-semibold">{displayedExcludedMins} min ({(displayedExcludedMins / 60).toFixed(1)} hrs)</span> excluded via reasons ({displayedExcludedReasonNames || 'مولدة, etc.'})
                        </span>
                      ) : (
                        <span>No capability-reducing stop reasons recorded. Full capability retained.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-divider text-secondary font-mono">
                    {isSingleDayView ? `Run: ${displayedRunTime}m` : `${monthOeeSummary.workingDaysCount} Days Active`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenOeeConfig()}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Month Daily Trend Strip (Visible when viewing month average) */}
              {!isSingleDayView && monthOeeSummary.dailyResults.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-divider/60">
                  <div className="flex items-center justify-between mb-1.5 text-[11px]">
                    <span className="font-semibold text-secondary flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                      <span>Daily OEE Breakdown across month:</span>
                    </span>
                    <span className="text-tertiary">
                      Click any day to view its detailed OEE breakdown
                    </span>
                  </div>
                  <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1">
                    {monthOeeSummary.dailyResults.map((dayRes) => {
                      const { day } = parseRecordDate(dayRes.date);
                      const isStopped = !dayRes.isWorkingDay;

                      return (
                        <button
                          key={dayRes.date}
                          type="button"
                          onClick={() => setSelectedDayFilter(day || dayRes.date)}
                          title={`${dayRes.date}: ${isStopped ? 'STOPPED (Excluded from average)' : `OEE: ${dayRes.oee.toFixed(1)}%`}`}
                          className={`flex flex-col items-center justify-center p-1 rounded-md border text-[10px] transition-all cursor-pointer ${
                            isStopped
                              ? 'bg-surface-elevated/40 border-dashed border-divider text-tertiary hover:border-amber-500/50'
                              : dayRes.oee >= 80
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : dayRes.oee >= 65
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          <span className="font-mono font-bold text-[9px]">{day ? parseInt(day, 10) : ''}</span>
                          <span className="font-mono text-[9px] tabular-nums">
                            {isStopped ? '⏸️' : `${dayRes.oee.toFixed(0)}%`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Downtime by Rainbow Type (Right side) */}
          <div className="lg:col-span-4 bg-surface border border-divider rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Downtime Share by Type</span>
              </h2>
              {selectedTypeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedTypeFilter('all')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer font-bold"
                >
                  Reset Filter
                </button>
              )}
            </div>
            <p className="text-xs text-tertiary mb-2">Click any color slice to show its daily graph on the left</p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(entry: any) => {
                      const clickedType = entry?.name;
                      if (clickedType) {
                        setSelectedTypeFilter(prev => prev === clickedType ? 'all' : clickedType);
                      }
                    }}
                  >
                    {typeDistributionData.map((entry, index) => {
                      const isSelected = selectedTypeFilter === entry.name;
                      const isDimmed = selectedTypeFilter !== 'all' && !isSelected;

                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={isSelected ? '#FFFFFF' : '#0F172A'}
                          strokeWidth={isSelected ? 3 : 1}
                          opacity={isDimmed ? 0.35 : 1}
                          className="transition-all cursor-pointer hover:opacity-95"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} minutes`, 'Time']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 space-y-1 max-h-44 overflow-y-auto pr-1">
              {typeDistributionData.map((item) => {
                const isSelected = selectedTypeFilter === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedTypeFilter(selectedTypeFilter === item.name ? 'all' : item.name)}
                    className={`w-full flex justify-between items-center text-xs p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-surface-elevated border-blue-500 ring-1 ring-blue-500/50 shadow-xs' 
                        : 'hover:bg-surface-elevated/60 border-transparent text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3.5 h-3.5 rounded-sm shrink-0 shadow-xs" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-amber-400/90 tabular-nums font-bold text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {typeDistributionData.reduce((s, d) => s + d.value, 0) > 0
                          ? ((item.value / typeDistributionData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)
                          : '0'}%
                      </span>
                      <span className="font-mono text-tertiary tabular-nums font-bold">{item.value} min</span>
                      {isSelected && (
                        <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* POP-UP TAB: DAILY IMPORT & MULTI-REASON TIME/TYPE ASSIGNMENT */}
      {isDailyReviewOpen && dailyImportData && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 lg:p-6 overflow-hidden">
          <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">
                    Daily Downtime Review & Time/Type Assignment
                  </h3>
                  <p className="text-xs text-tertiary">
                    Parsed from uploaded sheet. Add time (minutes) and select type for each separated reason before inserting into the monthly stop times.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDailyReviewOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Toolbar: Date & Filter */}
            <div className="px-6 py-3 border-b border-divider flex flex-wrap justify-between items-center gap-3 bg-surface-elevated/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Target Date:</span>
                </div>
                <input
                  type="text"
                  value={dailyImportData.date}
                  onChange={e => setDailyImportData({ ...dailyImportData, date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="px-3 py-1 bg-surface border border-divider rounded-lg text-xs font-mono font-bold text-primary focus:outline-none focus:border-blue-500 w-32 text-center"
                />
                <span className="text-xs text-tertiary">
                  ({dailyImportData.items.length} machines detected)
                </span>
              </div>

              {/* Segmented Filter */}
              <div className="flex items-center gap-1 p-0.5 bg-surface border border-divider rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setDailyFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dailyFilter === 'all' ? 'bg-surface-elevated text-primary font-bold shadow-xs' : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  All ({dailyImportData.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDailyFilter('with_reasons')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dailyFilter === 'with_reasons' ? 'bg-surface-elevated text-primary font-bold shadow-xs' : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  With Stoppages ({dailyImportData.items.filter(i => !i.isNoDowntime).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDailyFilter('no_downtime')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dailyFilter === 'no_downtime' ? 'bg-surface-elevated text-primary font-bold shadow-xs' : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  No Stoppage ({dailyImportData.items.filter(i => i.isNoDowntime).length})
                </button>
              </div>
            </div>

            {/* Scrollable Machines List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {dailyImportData.items
                .map((item, originalIdx) => ({ item, originalIdx }))
                .filter(({ item }) => {
                  if (dailyFilter === 'with_reasons') return !item.isNoDowntime;
                  if (dailyFilter === 'no_downtime') return item.isNoDowntime;
                  return true;
                })
                .map(({ item, originalIdx }) => {
                  const subTotalMins = item.reasons.reduce((s, r) => s + (Number(r.durationMinutes) || 0), 0);

                  return (
                    <div 
                      key={`${item.machineName}-${originalIdx}`} 
                      className={`p-4 rounded-xl border transition-all ${
                        item.isNoDowntime 
                          ? 'bg-surface/50 border-divider opacity-75' 
                          : 'bg-surface border-divider shadow-xs hover:border-blue-500/40'
                      }`}
                    >
                      {/* Machine Header */}
                      <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-divider">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 bg-surface-elevated border border-divider rounded-lg font-mono font-bold text-xs text-primary">
                            {item.machineName}
                          </span>
                          <span className="text-xs font-medium text-secondary truncate max-w-xs md:max-w-sm" title={item.rawText}>
                            <bdi dir="auto">{item.rawText || 'لا يوجد توقف'}</bdi>
                          </span>
                        </div>

                        {/* Stoppage Time Allocation Status (Directly addressing user's red box!) */}
                        {item.targetTotalMinutes !== undefined ? (
                          <div className="flex items-center gap-2">
                            {item.reasons.length <= 1 ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-secondary font-medium">Auto-Filled Target:</span>
                                <span className="font-mono font-bold text-emerald-400">{item.targetTotalMinutes} min</span>
                              </div>
                            ) : (
                              (() => {
                                const diff = item.targetTotalMinutes - subTotalMins;
                                if (diff === 0) {
                                  return (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">
                                        Fully Allocated ({item.targetTotalMinutes} min)
                                      </span>
                                    </div>
                                  );
                                }
                                if (diff > 0) {
                                  return (
                                    <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                      <span className="text-secondary font-medium">
                                        Target: <b className="font-mono text-primary">{item.targetTotalMinutes}m</b>
                                      </span>
                                      <span className="text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                                        Time Left: <span className="font-mono text-sm underline">{diff} min</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAutoAllocateRemaining(originalIdx, diff)}
                                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[11px] transition-colors cursor-pointer"
                                        title="Auto-fill remaining time into the reason"
                                      >
                                        + Fill Left ({diff}m)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSplitEqually(originalIdx, item.targetTotalMinutes!)}
                                        className="px-2 py-0.5 bg-surface hover:bg-surface-elevated text-secondary hover:text-primary rounded text-[11px] border border-divider cursor-pointer"
                                        title="Split total target equally across all reasons"
                                      >
                                        Split
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Exceeded by <b className="font-mono text-rose-200">{Math.abs(diff)} min</b></span>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-tertiary">Machine Total:</span>
                          <span className="font-mono font-bold text-xs text-rose-400 tabular-nums">
                            {subTotalMins} min
                          </span>
                        </div>
                      </div>

                      {/* Reasons List: Separated into Reason 1, Reason 2, Reason 3... */}
                      <div className="mt-3 space-y-2.5">
                        {item.reasons.map((sub, subIdx) => {
                          const style = getTypeStyle(sub.type);

                          return (
                            <div key={`daily-sub-${item.machineName}-${originalIdx}-${subIdx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-2 rounded-lg bg-canvas border border-divider-subtle">
                              {/* Reason label & badge */}
                              <div className="md:col-span-6 flex items-center gap-2">
                                <span className="text-[11px] font-bold text-blue-400 shrink-0">
                                  R{subIdx + 1}:
                                </span>
                                <input
                                  type="text"
                                  dir="auto"
                                  value={sub.reason}
                                  onChange={e => handleUpdateDailySubReason(originalIdx, subIdx, 'reason', e.target.value)}
                                  className="w-full bg-surface border border-divider rounded-md px-2.5 py-1 text-xs text-primary focus:outline-none"
                                />
                              </div>

                              {/* Time input + quick buttons */}
                              <div className="md:col-span-3 flex items-center gap-1.5">
                                <div className="relative w-24 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sub.durationMinutes}
                                    onChange={e => handleUpdateDailySubReason(originalIdx, subIdx, 'durationMinutes', Number(e.target.value) || 0)}
                                    className="w-full bg-surface border border-divider rounded-md px-2 py-1 text-xs font-mono font-bold text-primary focus:outline-none"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-tertiary">m</span>
                                </div>

                                <div className="flex items-center gap-0.5">
                                  {[15, 30, 60].map(mins => (
                                    <button
                                      type="button"
                                      key={mins}
                                      onClick={() => handleUpdateDailySubReason(originalIdx, subIdx, 'durationMinutes', mins)}
                                      className="px-1.5 py-0.5 bg-surface-elevated hover:bg-surface-strong border border-divider rounded text-[10px] font-mono text-tertiary hover:text-primary cursor-pointer"
                                    >
                                      {mins}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Rainbow Type Selector */}
                              <div className="md:col-span-3">
                                <select
                                  value={sub.type || 'قالب'}
                                  onChange={e => handleUpdateDailySubReason(originalIdx, subIdx, 'type', e.target.value)}
                                  className="w-full rounded-md px-2 py-1 text-xs font-bold border transition-colors shadow-xs focus:outline-none"
                                  style={{
                                    backgroundColor: style.color,
                                    color: style.textColor,
                                    borderColor: style.color
                                  }}
                                >
                                  {DOWNTIME_TYPES.map(t => (
                                    <option 
                                      key={t.id} 
                                      value={t.name}
                                      style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}
                                    >
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 border-t border-divider bg-surface/70 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-secondary font-medium">Total Daily Stop Time Across All Machines:</span>
                <span className="font-mono font-bold text-sm text-rose-400 tabular-nums">
                  {dailyImportData.items.reduce((sum, item) => {
                    return sum + item.reasons.reduce((s, r) => s + (Number(r.durationMinutes) || 0), 0);
                  }, 0)} minutes (
                  {(dailyImportData.items.reduce((sum, item) => {
                    return sum + item.reasons.reduce((s, r) => s + (Number(r.durationMinutes) || 0), 0);
                  }, 0) / 60).toFixed(1)} hrs)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDailyReviewOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDailyToMonthly}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Insert to Monthly Stop Times (حفظ في سجل الشهر)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Paste Daily Table directly from Excel */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-primary">Paste Daily Excel Table</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Target Date</label>
                <input
                  type="text"
                  value={pasteDate}
                  onChange={e => setPasteDate(e.target.value)}
                  placeholder="DD/MM/YYYY e.g. 01/09/2026"
                  className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Paste Columns (NO.MK and REASON)
                </label>
                <p className="text-[11px] text-tertiary mb-2">
                  Copy both columns directly from Excel and paste here. The app will separate them and open the review pop-up!
                </p>
                <textarea
                  rows={8}
                  dir="auto"
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder={"1\tبقاء المنتج في القالب\n2\tخروج نقاط اسود في المنتج\n11\tبسبب خلل في المواد + خلل في الروبوت\nLBEL1\tانتهاء الطلبية"}
                  className="w-full bg-surface border border-divider rounded-lg p-3 text-xs font-mono text-primary focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  Process & Open Review Tab
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ENTRY MODAL: Live + Separator Entry */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-base text-primary">
                  {editingRecord ? 'Edit Downtime Record' : 'Log Single Downtime Entry (with +)'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Machine & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Machine</label>
                  <select
                    value={draftMachine}
                    onChange={e => setDraftMachine(e.target.value)}
                    className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs text-primary focus:outline-none focus:border-blue-500 [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                  >
                    {machineList.map(m => (
                      <option key={m} value={m} className="bg-surface text-primary">{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Date (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    required
                    value={draftDate}
                    onChange={e => setDraftDate(e.target.value)}
                    placeholder="e.g. 02/09/2026"
                    className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Combined Reasons Input with + */}
              <div className="p-4 bg-surface border border-blue-500/40 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-blue-400 mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Combined Reasons Box (Type or Paste with + between reasons)
                </label>
                <p className="text-[11px] text-tertiary">
                  Type reasons separated by <code className="text-rose-400 font-bold px-1 bg-surface-elevated rounded">+</code>. The app will immediately separate them into Reason 1, Reason 2, and Reason 3!
                </p>

                <textarea
                  rows={2}
                  dir="auto"
                  value={draftCombinedReasons}
                  onChange={e => handleCombinedReasonsChange(e.target.value)}
                  placeholder="e.g. بقاء المنتج في القالب + خلل في الروبوت + نظوح ماء"
                  className="w-full bg-canvas border border-divider rounded-lg p-3 text-xs text-primary focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Live Separated Reasons (Reason 1, Reason 2, Reason 3) */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-primary block">
                  Separated Reasons Breakdown ({draftSubReasons.length} reasons identified):
                </span>

                {draftSubReasons.map((sub, idx) => (
                  <div key={`draft-sub-${sub.id || idx}-${idx}`} className="p-3 bg-surface border border-divider rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-400">
                        Reason {idx + 1}
                      </span>
                      {draftSubReasons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = draftSubReasons.filter((_, i) => i !== idx);
                            setDraftSubReasons(updated);
                            setDraftCombinedReasons(updated.map(u => u.reason).join(' + '));
                          }}
                          className="text-tertiary hover:text-rose-400 text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-6">
                        <input
                          type="text"
                          dir="auto"
                          value={sub.reason}
                          onChange={e => {
                            const updated = [...draftSubReasons];
                            updated[idx].reason = e.target.value;
                            setDraftSubReasons(updated);
                            setDraftCombinedReasons(updated.map(u => u.reason).join(' + '));
                          }}
                          placeholder={`Reason ${idx + 1} description`}
                          className="w-full bg-canvas border border-divider rounded-lg px-3 py-1.5 text-xs text-primary focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-3 relative">
                        <input
                          type="number"
                          min="0"
                          value={sub.durationMinutes}
                          onChange={e => {
                            const updated = [...draftSubReasons];
                            updated[idx].durationMinutes = Number(e.target.value) || 0;
                            setDraftSubReasons(updated);
                          }}
                          className="w-full bg-canvas border border-divider rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-primary focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-tertiary">min</span>
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={sub.type || 'قالب'}
                          onChange={e => {
                            const updated = [...draftSubReasons];
                            updated[idx].type = e.target.value;
                            setDraftSubReasons(updated);
                          }}
                          className="w-full bg-canvas border border-divider rounded-lg px-2 py-1.5 text-xs font-bold text-primary focus:outline-none [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                        >
                          {DOWNTIME_TYPES.map(t => (
                            <option key={t.id} value={t.name} className="bg-surface text-primary">{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const nextId = (draftSubReasons.length + 1).toString();
                    setDraftSubReasons([...draftSubReasons, { id: nextId, reason: '', durationMinutes: 15, type: 'قالب' }]);
                  }}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-divider rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Reason
                </button>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-center p-3 bg-surface-elevated/40 rounded-xl text-xs">
                <span className="text-secondary font-medium">Total Stoppage Time:</span>
                <span className="font-mono font-bold text-sm text-rose-400 tabular-nums">
                  {draftSubReasons.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0)} min (
                  {(draftSubReasons.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0) / 60).toFixed(1)} hrs)
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editingRecord ? 'Save Changes' : 'Save Downtime Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OEE CONFIGURATION & PRODUCTION MODAL */}
      {isOeeConfigModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">
                    OEE & Production Configuration — {selectedMachine}
                  </h3>
                  <p className="text-xs text-tertiary">
                    Set daily production, waste, operational status, and baseline capability deductions.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOeeConfigModalOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Machine Capability Setting Box */}
              <div className="p-4 bg-surface border border-divider rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-0.5">
                      Machine Nominal Daily Capability (24 Hours)
                    </label>
                    <p className="text-[11px] text-tertiary">
                      Target production capacity per 24 hours at standard cycle speed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-36">
                      <input
                        type="number"
                        min="1"
                        value={oeeDraftCapability}
                        onChange={e => setOeeDraftCapability(Math.max(1, Number(e.target.value) || 0))}
                        className="w-full bg-canvas border border-divider rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-primary focus:outline-none focus:border-blue-500 text-right pr-9"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-tertiary font-medium">pcs</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary bg-surface-elevated/40 p-2.5 rounded-lg font-mono">
                  <span>Hourly Rate: <strong className="text-primary font-bold">{(oeeDraftCapability / 24).toFixed(1)} pcs/hr</strong></span>
                  <span>•</span>
                  <span>Minute Rate: <strong className="text-primary font-bold">{(oeeDraftCapability / 1440).toFixed(2)} pcs/min</strong></span>
                  <span>•</span>
                  <span className="text-[11px] text-tertiary">2h Stop = -{Math.round((120 / 1440) * oeeDraftCapability).toLocaleString()} pcs deduction</span>
                </div>

                <div className="text-[11px] text-tertiary leading-relaxed bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule-Based Deductions:</strong> When stoppages occur due to external/operational reasons (<span className="text-blue-300">مولدة, لا توجد طلبية, بداية تشغيل, لا يوجد عمال, لا يوجد ليبل, لا توجد حبيبات, امبول, UPS, مكمبريسر, Chiller, اخرى</span>), their duration is excluded from the machine's daily capability instead of penalizing availability.
                  </span>
                </div>
              </div>

              {/* Tab Selector: Single Day vs Month Batch Table */}
              <div className="flex items-center gap-1 p-1 bg-surface border border-divider rounded-lg">
                <button
                  type="button"
                  onClick={() => setOeeModalTab('single')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    oeeModalTab === 'single'
                      ? 'bg-surface-elevated text-primary font-bold shadow-xs'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  Edit Single Day Record
                </button>
                <button
                  type="button"
                  onClick={() => setOeeModalTab('month')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    oeeModalTab === 'month'
                      ? 'bg-surface-elevated text-primary font-bold shadow-xs'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  Full Month Overview & Status ({currentMonthCalendarDates.length} Days)
                </button>
              </div>

              {/* TAB 1: SINGLE DAY EDIT */}
              {oeeModalTab === 'single' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Target Date Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Target Date</label>
                      <select
                        value={oeeDraftDate}
                        onChange={e => handleOeeModalDateChange(e.target.value)}
                        className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono font-bold text-primary focus:outline-none focus:border-blue-500 [&>option]:bg-surface [&>option]:text-primary dark:[color-scheme:dark]"
                      >
                        {currentMonthCalendarDates.map(d => {
                          const { day } = parseRecordDate(d);
                          return (
                            <option key={d} value={d}>
                              {d} {day ? `(Day ${parseInt(day, 10)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Operational Status Toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Machine Operational Status</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOeeDraftIsWorking(true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            oeeDraftIsWorking
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-xs'
                              : 'bg-surface border-divider text-tertiary hover:text-secondary'
                          }`}
                        >
                          🟢 Working Day (Active)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOeeDraftIsWorking(false);
                            setOeeDraftProd(0);
                            setOeeDraftWaste(0);
                            setOeeDraftRunTime(0);
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            !oeeDraftIsWorking
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-xs'
                              : 'bg-surface border-divider text-tertiary hover:text-secondary'
                          }`}
                        >
                          ⏸️ Stopped Day (Exclude from Avg)
                        </button>
                      </div>
                      <p className="text-[10px] text-tertiary mt-1">
                        {!oeeDraftIsWorking
                          ? 'Excluded from monthly average denominator (will NOT count as 0%).'
                          : 'Operational day included in the monthly average calculation.'}
                      </p>
                    </div>
                  </div>

                  {/* Production & Waste Inputs (enabled if working) */}
                  {oeeDraftIsWorking ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Good Production (pcs)</label>
                        <input
                          type="number"
                          min="0"
                          value={oeeDraftProd}
                          onChange={e => setOeeDraftProd(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Waste / Scrap (pcs)</label>
                        <input
                          type="number"
                          min="0"
                          value={oeeDraftWaste}
                          onChange={e => setOeeDraftWaste(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-secondary">Run Time (min)</label>
                          <button
                            type="button"
                            onClick={handleAutoFillRunTime}
                            className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                            title="Auto-calculate: 1440 - Downtime"
                          >
                            Auto from Downtime
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="1440"
                          value={oeeDraftRunTime}
                          onChange={e => setOeeDraftRunTime(Math.min(1440, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-xs font-mono font-bold text-sky-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-surface-elevated/30 border border-divider rounded-xl text-xs text-tertiary text-center">
                      Machine was stopped on this day. Production and Run Time set to 0. This day is excluded from monthly average calculation.
                    </div>
                  )}

                  {/* Real-Time Preview Card for Draft Date */}
                  {(() => {
                    const rec = downtimeMap.get(oeeDraftDate);
                    const previewResult = calculateDayOee(
                      oeeDraftDate,
                      rec,
                      {
                        production: oeeDraftProd,
                        waste: oeeDraftWaste,
                        customRunTimeMinutes: oeeDraftRunTime,
                        isWorkingDay: oeeDraftIsWorking
                      },
                      oeeDraftCapability
                    );

                    return (
                      <div className="p-4 bg-surface border border-divider rounded-xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                            <span>Live OEE Calculation for {oeeDraftDate}:</span>
                          </span>
                          <span className="font-mono font-bold text-sm" style={{ color: getOeeColor(previewResult.oee) }}>
                            OEE: {previewResult.oee.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                          <div className="p-2 bg-canvas rounded-lg border border-divider">
                            <span className="text-[10px] text-tertiary block">Availability</span>
                            <span className="font-mono font-bold text-sky-400">{previewResult.availability.toFixed(1)}%</span>
                          </div>
                          <div className="p-2 bg-canvas rounded-lg border border-divider">
                            <span className="text-[10px] text-tertiary block">Performance</span>
                            <span className="font-mono font-bold text-amber-400">{previewResult.performance.toFixed(1)}%</span>
                          </div>
                          <div className="p-2 bg-canvas rounded-lg border border-divider">
                            <span className="text-[10px] text-tertiary block">Quality</span>
                            <span className="font-mono font-bold text-emerald-400">{previewResult.quality.toFixed(1)}%</span>
                          </div>
                          <div className="p-2 bg-canvas rounded-lg border border-divider">
                            <span className="text-[10px] text-tertiary block">Adjusted Cap</span>
                            <span className="font-mono font-bold text-primary">{previewResult.adjustedCapability.toLocaleString()}</span>
                          </div>
                        </div>

                        {previewResult.excludedDowntimeMinutes > 0 && (
                          <div className="text-[11px] text-amber-300/90 font-mono bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                            Downtime: {previewResult.totalDowntimeMinutes}m • Excluded: {previewResult.excludedDowntimeMinutes}m ({previewResult.excludedReasons.join(', ')}) • Cap Reduction: -{previewResult.capabilityReduction.toLocaleString()} pcs
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: FULL MONTH OVERVIEW & STATUS TABLE */}
              {oeeModalTab === 'month' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-tertiary px-1">
                    <span>
                      Active Working Days: <strong className="text-emerald-400 font-bold">{monthOeeSummary.workingDaysCount}</strong> / {currentMonthCalendarDates.length} • 
                      Stopped Days: <strong className="text-rose-400 font-bold">{monthOeeSummary.stoppedDaysCount}</strong>
                    </span>
                    <span className="font-mono">
                      Month Average OEE: <strong className="text-primary font-bold">{monthOeeSummary.averageOee.toFixed(1)}%</strong>
                    </span>
                  </div>

                  <div className="border border-divider rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-elevated/70 text-[11px] text-tertiary sticky top-0 border-b border-divider font-semibold">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-2 text-center">Status</th>
                          <th className="py-2 px-2 text-right">Production</th>
                          <th className="py-2 px-2 text-right">Waste</th>
                          <th className="py-2 px-2 text-right">Run (min)</th>
                          <th className="py-2 px-2 text-right">Adjusted Cap</th>
                          <th className="py-2 px-3 text-right">OEE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/50 font-mono">
                        {currentMonthCalendarDates.map(d => {
                          const prod = machineProductionMap[d] || {
                            production: 15582,
                            waste: 632,
                            customRunTimeMinutes: 1245,
                            isWorkingDay: true
                          };
                          const rec = downtimeMap.get(d);
                          const dayRes = calculateDayOee(d, rec, prod, oeeDraftCapability);
                          const isStopped = !prod.isWorkingDay;

                          return (
                            <tr key={d} className={`hover:bg-surface-elevated/30 transition-colors ${isStopped ? 'opacity-50 bg-surface-elevated/10' : ''}`}>
                              <td className="py-2 px-3 font-medium text-primary">
                                {d}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDayWorking(d, !isStopped)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                                    !isStopped
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                  }`}
                                >
                                  {!isStopped ? 'Active' : 'Stopped'}
                                </button>
                              </td>
                              <td className="py-2 px-2 text-right text-emerald-400">
                                {prod.isWorkingDay ? prod.production.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-2 text-right text-rose-400">
                                {prod.isWorkingDay ? prod.waste.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-2 text-right text-sky-400">
                                {prod.isWorkingDay ? (prod.customRunTimeMinutes ?? 1245) : '0'}m
                              </td>
                              <td className="py-2 px-2 text-right text-secondary">
                                {dayRes.adjustedCapability.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-bold" style={{ color: isStopped ? '#94A3B8' : getOeeColor(dayRes.oee) }}>
                                {isStopped ? 'Excluded' : `${dayRes.oee.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-3.5 border-t border-divider bg-surface/50 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={handleResetOeeToBenchmark}
                className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-divider text-amber-400 hover:text-amber-300 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                title="Reset to 26 working days & 4 stopped days with user numbers (23,000 cap, 15,582 prod, 632 waste, 1,245 run time)"
              >
                Reset Factory Benchmark (26 Working Days)
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOeeConfigModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOeeConfig}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL (Replaces blocked window.confirm) */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-primary">{deleteConfirmModal.title}</h3>
                <p className="text-xs text-secondary mt-1.5 leading-relaxed">{deleteConfirmModal.description}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-divider">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteRecords(deleteConfirmModal.keys)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Confirm Delete ({deleteConfirmModal.keys.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
