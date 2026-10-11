import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { defaultRoles } from './Roles';
import { logAction } from '../utils/logger';
import ExcelJS from 'exceljs';
import BatchCycleCavityModal from '../components/BatchCycleCavityModal';
import { 
  PackageSearch, 
  Search, 
  Plus, 
  Pencil, 
  Box, 
  Settings, 
  ClipboardList, 
  Calendar, 
  X,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  Ban,
  Trash2,
  Factory,
  User,
  Scale,
  ArrowLeft,
  ArrowRight,
  Download,
  Sliders,
  Play,
  RotateCw,
  Zap,
  Infinity,
  Copy,
  ClipboardPaste,
  Sparkles,
  Check,
  Gauge,
  Activity,
  Layers,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  Columns3,
  Filter,
  Cpu,
  Tag,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Wrench,
  RefreshCw
} from 'lucide-react';

export type ProductionOrder = {
  id: string;
  itemName: string;
  weight?: string;
  granulesType: string;
  colorant?: string;
  packagingDetails: string;
  cratesQuantity?: string;
  looseQuantity?: string;
  assignedMachine: string; // references machine name
  startDate?: string;
  endDate?: string;
  dateEntered?: string;
  status: 'Planned' | 'In Progress' | 'Maintenance' | 'Completed' | 'Cancelled';
  quantity: number;
  isContinuous?: boolean; // continuous production with no limit until stopped
  unit: string;
  productionRateMethod?: 'cycle' | 'hourly';
  cycleTime?: number; // seconds
  cavities?: number; // parts per shot
  hourlyRate?: number; // units per hour
  actualStartTime?: string;
  notes?: string;
  accumulatedTimeMs?: number;
  producedQuantity?: number;
};

export interface ProductionMachine {
  id: string;
  m: string; // e.g. "2", "3", "6", "B1", "L1"
  name: string; // e.g. "MK 6", "BLOW 1", "LABEL 2"
  type?: 'injection' | 'blow' | 'label';
  rateMethod?: 'cycle' | 'hourly';
  moldName?: string;
  molds?: string[];
  currentAmps?: number;
  cycleTime?: number;
  cavities?: number;
  hourlyRate?: number; // Bottles or Pcs per hour for Blow & Label machines
}

const formatDuration = (ms: number) => {
   if (ms < 0) return '0s';
   const totalSeconds = Math.floor(ms / 1000);
   const hours = Math.floor(totalSeconds / 3600);
   const minutes = Math.floor((totalSeconds % 3600) / 60);
   const seconds = totalSeconds % 60;
   
   if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
   if (minutes > 0) return `${minutes}m ${seconds}s`;
   return `${seconds}s`;
};

export const getOrderUnit = (order?: { unit?: string } | null): string => {
   if (!order || !order.unit) return 'pcs';
   const u = order.unit.trim().toLowerCase();
   if (u === 'boxes' || u === 'boxs') return 'pcs';
   return order.unit;
};

function ProductionProgressBar({ order }: { order: ProductionOrder }) {
   const method = order.productionRateMethod || 'cycle';
   const isCycle = method === 'cycle' || (!order.productionRateMethod && order.cycleTime) || (order.cycleTime && order.cavities) || (!order.hourlyRate);

   let totalDurationMs = 0;
   if (!order.isContinuous) {
     if (isCycle) {
         const safeCycleTime = order.cycleTime || 10;
         const safeCavities = order.cavities || 1;
         const totalShots = Math.ceil(order.quantity / safeCavities);
         totalDurationMs = totalShots * safeCycleTime * 1000;
     } else {
         const safeHourlyRate = order.hourlyRate || 1000;
         const totalHours = order.quantity / safeHourlyRate;
         totalDurationMs = totalHours * 3600 * 1000;
     }
   }
   
   if (order.status === 'Planned') {
       if (order.isContinuous) {
           return (
              <div className="w-full mt-2">
                <div className="flex justify-between text-[10px] text-tertiary mb-1 font-medium tabular-nums">
                   <span className="text-purple-400 font-semibold flex items-center gap-1">
                     <Infinity className="w-3 h-3" /> Continuous Run
                   </span>
                   <span className="text-tertiary">Until stopped</span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated border border-purple-500/20 rounded-full overflow-hidden">
                   <div className="h-full w-full bg-gradient-to-r from-purple-500/20 via-purple-400/40 to-purple-500/20" />
                </div>
              </div>
           );
       }

       return (
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] text-tertiary mb-1 font-medium tabular-nums">
               <span>Expected time</span>
               <span>{formatDuration(totalDurationMs)}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-elevated border border-divider-subtle rounded-full overflow-hidden">
            </div>
          </div>
       );
   }

   if (order.status === 'In Progress' || order.status === 'Maintenance') {
       const producedCount = order.producedQuantity !== undefined
         ? order.producedQuantity
         : (order.accumulatedTimeMs 
             ? (isCycle 
                 ? Math.floor((order.accumulatedTimeMs / 1000) / (order.cycleTime || 10)) * (order.cavities || 1) 
                 : Math.floor((order.accumulatedTimeMs / 3600000) * (order.hourlyRate || 1000)))
             : 0);

       if (order.isContinuous) {
           return (
              <div className="w-full mt-2">
                <div className="flex justify-between text-[10px] text-tertiary mb-1 font-medium tabular-nums">
                   <span className="text-purple-400 font-bold flex items-center gap-1">
                     {order.status === 'Maintenance' && <span className="text-red-500 mr-1 font-extrabold">PAUSED</span>}
                     {order.status === 'In Progress' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 mr-0.5" />}
                     {producedCount.toLocaleString()} {getOrderUnit(order)} <span className="text-secondary opacity-75 font-normal">(Continuous ∞)</span>
                   </span>
                   <span className="text-secondary font-medium">Manual Update</span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated border border-purple-500/30 rounded-full overflow-hidden relative">
                   <div className={`h-full w-full ${order.status === 'Maintenance' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500'}`} />
                </div>
              </div>
           );
       }

       const progress = order.quantity > 0 ? Math.min(100, Math.max(0, (producedCount / order.quantity) * 100)) : 0;
       const remainingUnits = Math.max(0, order.quantity - producedCount);
       let remainingMs = 0;
       if (isCycle) {
          const safeCycleTime = order.cycleTime || 10;
          const safeCavities = order.cavities || 1;
          const remainingShots = Math.ceil(remainingUnits / safeCavities);
          remainingMs = remainingShots * safeCycleTime * 1000;
       } else {
          const safeHourlyRate = order.hourlyRate || 1000;
          remainingMs = (remainingUnits / safeHourlyRate) * 3600 * 1000;
       }

       return (
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] text-tertiary mb-1 font-medium tabular-nums">
               <span className="text-orange-500 font-bold">
                 {order.status === 'Maintenance' && <span className="text-red-500 mr-1">PAUSED</span>}
                 {progress.toFixed(1)}% <span className="font-medium text-secondary opacity-80 whitespace-nowrap ml-1">({producedCount.toLocaleString()} / {order.quantity.toLocaleString()})</span>
               </span>
               <span>{formatDuration(remainingMs)} left</span>
            </div>
            <div className="h-1.5 w-full bg-surface-elevated border border-divider-subtle rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-300 ease-out ${order.status === 'Maintenance' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
       );
   }

   if (order.status === 'Completed') {
       const producedCount = order.producedQuantity !== undefined ? order.producedQuantity : order.quantity;
       return (
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] text-green-500 font-medium mb-1">
               <span>Done ({producedCount.toLocaleString()} {getOrderUnit(order)})</span>
               <span>{order.isContinuous ? 'Stopped & Completed' : '100%'}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-elevated border border-divider-subtle rounded-full overflow-hidden">
               <div className="h-full bg-green-500" style={{ width: `100%` }} />
            </div>
          </div>
       );
   }

   return null;
}

interface MoldDetailsModalProps {
  data: {
    machId: string;
    machName: string;
    machType?: 'injection' | 'blow' | 'label';
    moldName: string;
    activeOrderId: string | null;
    activeOrderName: string | null;
    rateMethod?: 'cycle' | 'hourly';
    cycleTime: number;
    cavities: number;
    hourlyRate?: number;
    currentAmps: number;
  };
  onClose: () => void;
  onSave: (
    updatedMold: string,
    updatedAmps: number,
    updatedCycle: number,
    updatedCavities: number,
    updatedHourlyRate: number,
    updatedRateMethod: 'cycle' | 'hourly'
  ) => void;
  onApplyToAll?: (
    cycleTime: number,
    cavities: number,
    hourlyRate: number,
    rateMethod: 'cycle' | 'hourly',
    targetGroup: 'all' | 'same_type'
  ) => void;
}

function MoldDetailsModal({ data, onClose, onSave, onApplyToAll }: MoldDetailsModalProps) {
  // Machine category identification
  const nameUpper = data.machName.toUpperCase();
  const isBlow = data.machType === 'blow' || nameUpper.includes('BLOW');
  const isLabel = data.machType === 'label' || nameUpper.includes('LABEL');
  const isInjection = !isBlow && !isLabel;

  const defaultMethod: 'cycle' | 'hourly' = (isBlow || isLabel) ? 'hourly' : (data.rateMethod || 'cycle');

  const [rateMethod, setRateMethod] = useState<'cycle' | 'hourly'>(defaultMethod);
  const [moldName, setMoldName] = useState(data.moldName);
  const [currentAmps, setCurrentAmps] = useState(data.currentAmps);
  const [cycleTime, setCycleTime] = useState(data.cycleTime || 12);
  const [cavities, setCavities] = useState(data.cavities || 1);
  const [hourlyRate, setHourlyRate] = useState<number>(data.hourlyRate || (isBlow ? 2400 : isLabel ? 3500 : 1000));
  const [copiedBadge, setCopiedBadge] = useState(false);

  // Dynamic calculations for Cycle mode
  const shotsPerMinute = cycleTime > 0 ? (60 / cycleTime).toFixed(1) : '0.0';
  const cycleHourlyOutput = cycleTime > 0 ? Math.round((3600 / cycleTime) * cavities) : 0;
  const cycleDailyOutput = cycleTime > 0 ? Math.round(((3600 * 24) / cycleTime) * cavities) : 0;

  // Dynamic calculations for Hourly mode (Bottles / Hour for Blow & Label machines)
  const bottlesPerMinute = hourlyRate > 0 ? (hourlyRate / 60).toFixed(1) : '0.0';
  const secondsPerBottle = hourlyRate > 0 ? (3600 / hourlyRate).toFixed(2) : '0.00';
  const hourlyDailyOutput = Math.round(hourlyRate * 24);
  const hourlyShiftOutput = Math.round(hourlyRate * 12);

  const handleCopySpecs = () => {
    let text = '';
    if (rateMethod === 'hourly') {
      text = `${data.machName}\t${moldName}\t${hourlyRate} bottles/hr`;
    } else {
      text = `${data.machName}\t${moldName}\t${cycleTime}s\t${cavities}cav\t${cycleHourlyOutput}pcs/hr`;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  const getMachineCategoryDetails = () => {
    if (isBlow) return { name: 'Blow Molding', nameAr: 'ماكينة نفخ عبوات', badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
    if (isLabel) return { name: 'Labeling & Sleeve', nameAr: 'ماكينة لصق ليبل', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    return { name: 'Injection Molding', nameAr: 'ماكينة حقن وقوالب', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
  };

  const catDetails = getMachineCategoryDetails();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modern Clean Header */}
        <div className="px-6 py-4 border-b border-divider bg-surface-elevated/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-primary">
                  {isBlow ? 'Blow Machine Settings' : isLabel ? 'Label Machine Settings' : 'Mold & Speed Specifications'}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-elevated border border-divider text-secondary font-mono">
                  {data.machName}
                </span>
              </div>
              <p className="text-xs text-tertiary flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-medium border ${catDetails.badge}`}>
                  {catDetails.name} • {catDetails.nameAr}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-tertiary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Active Order Context Badge */}
          {data.activeOrderId && (
            <div className="px-3.5 py-2 rounded-xl bg-surface-elevated/50 border border-divider flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-tertiary">Active Order:</span>
                <span className="font-semibold text-primary">{data.activeOrderId}</span>
              </div>
              <div className="flex items-center gap-1 text-secondary truncate max-w-[220px]">
                <bdi dir="rtl">{data.activeOrderName}</bdi>
              </div>
            </div>
          )}

          {/* Section 1: Mold / Product Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-secondary">
              {isBlow ? 'Bottle / Mold Name (اسم العبوة أو القالب)' :
               isLabel ? 'Product / Label Spec (نوع الليبل والمنتج)' :
               'Mold Name & Code (اسم وكود القالب)'}
            </label>
            <input
              type="text"
              value={moldName}
              onChange={(e) => setMoldName(e.target.value)}
              placeholder={isBlow ? 'e.g. 1.5L Water Bottle' : isLabel ? 'e.g. 500ml Sleeve Label' : 'e.g. Rectangle Mold 1700'}
              className="w-full px-3.5 py-2.5 bg-canvas text-primary border border-divider rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Section 2: Rate Method Segmented Switch */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-secondary">
              Production Speed Metric (نوع احتساب السرعة)
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-canvas border border-divider rounded-xl">
              <button
                type="button"
                onClick={() => setRateMethod('cycle')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  rateMethod === 'cycle'
                    ? 'bg-surface text-primary shadow-xs border border-divider font-bold text-indigo-400'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Cycle Time & Cavities (ثواني وعيون)</span>
              </button>

              <button
                type="button"
                onClick={() => setRateMethod('hourly')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  rateMethod === 'hourly'
                    ? 'bg-surface text-primary shadow-xs border border-divider font-bold text-cyan-400'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Bottles / Hour (عبوة بالساعة)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Inputs & Live Telemetry Panel */}
          {rateMethod === 'cycle' ? (
            <div className="p-4 bg-surface-elevated/30 border border-divider rounded-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-secondary">
                    Cycle Time (ثواني الدورة)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      max="120"
                      value={cycleTime}
                      onChange={(e) => setCycleTime(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">sec</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-secondary">
                    Active Cavities (عدد العيون)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="128"
                      value={cavities}
                      onChange={(e) => setCavities(Math.max(1, Math.round(Number(e.target.value))))}
                      className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">cav</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Stats Row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-divider text-center">
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">Shots / min</span>
                  <span className="text-xs font-mono font-bold text-secondary">{shotsPerMinute} /min</span>
                </div>
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">Hourly Output</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{cycleHourlyOutput.toLocaleString()} pcs/hr</span>
                </div>
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">Daily Capacity (24h)</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{cycleDailyOutput.toLocaleString()} pcs/day</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-surface-elevated/30 border border-divider rounded-xl space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-secondary">
                  Hourly Production Speed (معدل الإنتاج بالساعة)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    max="50000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">bottles/hr</span>
                </div>
              </div>

              {/* Speed Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-tertiary font-medium mr-1">Presets:</span>
                {[1000, 1500, 2000, 2400, 3000, 3500, 4500, 6000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHourlyRate(preset)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      hourlyRate === preset
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-canvas text-secondary hover:text-primary hover:bg-surface-elevated border-divider'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-divider text-center">
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">Speed / min</span>
                  <span className="text-xs font-mono font-bold text-secondary">{bottlesPerMinute} bpm</span>
                </div>
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">Sec / Bottle</span>
                  <span className="text-xs font-mono font-bold text-secondary">{secondsPerBottle}s</span>
                </div>
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">12h Shift</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{hourlyShiftOutput.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-canvas/60 rounded-lg border border-divider">
                  <span className="text-[10px] text-tertiary block font-medium">24h Output</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{hourlyDailyOutput.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cohesive Modern Footer */}
        <div className="px-6 py-4 border-t border-divider bg-surface-elevated/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCopySpecs}
              className="px-3 py-2 bg-surface hover:bg-surface-elevated border border-divider text-tertiary hover:text-secondary rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              title="Copy specifications to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedBadge ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onApplyToAll && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const groupLabel = isBlow ? 'Blow machines' : isLabel ? 'Label machines' : 'Injection machines';
                    onApplyToAll(cycleTime, cavities, hourlyRate, rateMethod, 'same_type');
                  }}
                  className="px-3.5 py-2 bg-surface-elevated hover:bg-surface-elevated/80 border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Apply specs to all machines in this category"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Apply to All {isBlow ? 'Blow' : isLabel ? 'Label' : 'Injection'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyToAll(cycleTime, cavities, hourlyRate, rateMethod, 'all');
                  }}
                  className="px-3.5 py-2 bg-surface-elevated hover:bg-surface-elevated/80 border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Apply to all factory machines"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Apply to All Factory</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onSave(moldName, currentAmps, cycleTime, cavities, hourlyRate, rateMethod)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const initialMachines: ProductionMachine[] = [
  // MK Machines (Injection Molding)
  { id: 'mk-1', m: '1', name: 'MK 1', type: 'injection', rateMethod: 'cycle', moldName: 'رأس مضخة', cycleTime: 12, cavities: 2, currentAmps: 34 },
  { id: 'mk-2', m: '2', name: 'MK 2', type: 'injection', rateMethod: 'cycle', moldName: 'سليمانية مربع 1700', cycleTime: 14, cavities: 1, currentAmps: 32 },
  { id: 'mk-3', m: '3', name: 'MK 3', type: 'injection', rateMethod: 'cycle', moldName: 'راسان', cycleTime: 10, cavities: 2, currentAmps: 30 },
  { id: 'mk-4', m: '4', name: 'MK 4', type: 'injection', rateMethod: 'cycle', moldName: 'سلندرات', cycleTime: 15, cavities: 1, currentAmps: 32 },
  // skipping MK 5 as requested: "MK 1, MK 2, MK 3, MK4, MK 6,... MK 26"
  { id: 'mk-6', m: '6', name: 'MK 6', type: 'injection', rateMethod: 'cycle', moldName: 'قشطة سليمانية', cycleTime: 10, cavities: 1, currentAmps: 28 },
  { id: 'mk-7', m: '7', name: 'MK 7', type: 'injection', rateMethod: 'cycle', moldName: 'يدة قارورة ازرق', cycleTime: 12, cavities: 4, currentAmps: 35 },
  { id: 'mk-8', m: '8', name: 'MK 8', type: 'injection', rateMethod: 'cycle', moldName: 'سليمانية دائري', cycleTime: 11, cavities: 2, currentAmps: 31 },
  { id: 'mk-9', m: '9', name: 'MK 9', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء 4T', cycleTime: 8, cavities: 8, currentAmps: 33 },
  { id: 'mk-10', m: '10', name: 'MK 10', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء الحدباء', cycleTime: 9, cavities: 6, currentAmps: 30 },
  { id: 'mk-11', m: '11', name: 'MK 11', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء شفاف 500', cycleTime: 10, cavities: 4, currentAmps: 29 },
  { id: 'mk-12', m: '12', name: 'MK 12', type: 'injection', rateMethod: 'cycle', moldName: 'تاج الذهبي', cycleTime: 13, cavities: 2, currentAmps: 32 },
  { id: 'mk-13', m: '13', name: 'MK 13', type: 'injection', rateMethod: 'cycle', moldName: 'سطل شفاف 5 كغم', cycleTime: 18, cavities: 1, currentAmps: 31 },
  { id: 'mk-14', m: '14', name: 'MK 14', type: 'injection', rateMethod: 'cycle', moldName: 'امبول 24 غرام', cycleTime: 12, cavities: 8, currentAmps: 34 },
  { id: 'mk-15', m: '15', name: 'MK 15', type: 'injection', rateMethod: 'cycle', moldName: 'يدة سطل برتقالي', cycleTime: 11, cavities: 2, currentAmps: 30 },
  { id: 'mk-16', m: '16', name: 'MK 16', type: 'injection', rateMethod: 'cycle', moldName: 'سطل دائري كبير', cycleTime: 16, cavities: 1, currentAmps: 33 },
  { id: 'mk-17', m: '17', name: 'MK 17', type: 'injection', rateMethod: 'cycle', moldName: 'علبة قشطة 150', cycleTime: 9, cavities: 4, currentAmps: 28 },
  { id: 'mk-18', m: '18', name: 'MK 18', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء سطل برتقالي', cycleTime: 10, cavities: 2, currentAmps: 31 },
  { id: 'mk-19', m: '19', name: 'MK 19', type: 'injection', rateMethod: 'cycle', moldName: 'يد غطاية', cycleTime: 8, cavities: 4, currentAmps: 29 },
  { id: 'mk-20', m: '20', name: 'MK 20', type: 'injection', rateMethod: 'cycle', moldName: 'علبة 100 غرام', cycleTime: 10, cavities: 4, currentAmps: 32 },
  { id: 'mk-21', m: '21', name: 'MK 21', type: 'injection', rateMethod: 'cycle', moldName: 'علبة جبنة', cycleTime: 12, cavities: 2, currentAmps: 30 },
  { id: 'mk-22', m: '22', name: 'MK 22', type: 'injection', rateMethod: 'cycle', moldName: 'كوب عصير 300', cycleTime: 8, cavities: 4, currentAmps: 31 },
  { id: 'mk-23', m: '23', name: 'MK 23', type: 'injection', rateMethod: 'cycle', moldName: 'سدادة قارورة', cycleTime: 7, cavities: 12, currentAmps: 30 },
  { id: 'mk-24', m: '24', name: 'MK 24', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء شفاف 650', cycleTime: 10, cavities: 4, currentAmps: 33 },
  { id: 'mk-25', m: '25', name: 'MK 25', type: 'injection', rateMethod: 'cycle', moldName: 'غطاء نبع رغدان', cycleTime: 9, cavities: 6, currentAmps: 32 },
  { id: 'mk-26', m: '26', name: 'MK 26', type: 'injection', rateMethod: 'cycle', moldName: 'مقبض سطل بيضاوي', cycleTime: 11, cavities: 2, currentAmps: 30 },

  // LABEL Machines (Labeling Lines - Rate in Bottles / Pcs per Hour)
  { id: 'label-1', m: 'L1', name: 'LABEL 1', type: 'label', rateMethod: 'hourly', hourlyRate: 3500, moldName: 'لاصق عبوات عصير', currentAmps: 22 },
  { id: 'label-2', m: 'L2', name: 'LABEL 2', type: 'label', rateMethod: 'hourly', hourlyRate: 4000, moldName: 'لاصق قارورة مياه', currentAmps: 22 },

  // BLOW Machines (Blow Molding - Rate in Bottles per Hour)
  { id: 'blow-1', m: 'B1', name: 'BLOW 1', type: 'blow', rateMethod: 'hourly', hourlyRate: 2400, moldName: 'قارورة مياه 1.5 لتر', currentAmps: 34 },
  { id: 'blow-2', m: 'B2', name: 'BLOW 2', type: 'blow', rateMethod: 'hourly', hourlyRate: 2800, moldName: 'قارورة مياه 0.5 لتر', currentAmps: 32 },
  { id: 'blow-3', m: 'B3', name: 'BLOW 3', type: 'blow', rateMethod: 'hourly', hourlyRate: 2200, moldName: 'قارورة مياه 2.0 لتر', currentAmps: 32 },
  { id: 'blow-4', m: 'B4', name: 'BLOW 4', type: 'blow', rateMethod: 'hourly', hourlyRate: 2500, moldName: 'عبوة عصير 1 لتر', currentAmps: 33 },
  { id: 'blow-5', m: 'B5', name: 'BLOW 5', type: 'blow', rateMethod: 'hourly', hourlyRate: 3000, moldName: 'عبوة عصير 0.3 لتر', currentAmps: 31 },
  { id: 'blow-6', m: 'B6', name: 'BLOW 6', type: 'blow', rateMethod: 'hourly', hourlyRate: 1200, moldName: 'جالون 5 لتر', currentAmps: 35 },
  { id: 'blow-7', m: 'B7', name: 'BLOW 7', type: 'blow', rateMethod: 'hourly', hourlyRate: 900, moldName: 'جالون 10 لتر', currentAmps: 36 }
];

export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [
  // MK 3
  {
    id: 'PO-101',
    itemName: 'سطل سليمانية 2 كغم',
    assignedMachine: 'MK 3',
    status: 'Planned',
    startDate: '2026-05-29',
    endDate: '2026-06-05',
    granulesType: 'PP Plastic',
    packagingDetails: 'Carton of 100',
    quantity: 5000,
    unit: 'pcs',
  },
  // MK 6
  {
    id: 'PO-102',
    itemName: 'قشطة سليمانية (نشط)',
    assignedMachine: 'MK 6',
    status: 'In Progress',
    startDate: '2026-05-23',
    actualStartTime: '2026-05-23T19:07:00Z',
    endDate: '2026-05-28',
    granulesType: 'PP Food Grade',
    packagingDetails: 'Sterile Pack',
    quantity: 12000,
    producedQuantity: 4200,
    unit: 'pcs',
  },
  {
    id: 'PO-103',
    itemName: 'نسر العرب جبنة شيدر',
    assignedMachine: 'MK 6',
    status: 'Planned',
    startDate: '2026-05-24',
    endDate: '2026-05-29',
    granulesType: 'HDPE Grade B',
    packagingDetails: 'Carton of 250',
    quantity: 10000,
    unit: 'pcs',
  },
  {
    id: 'PO-104',
    itemName: 'نسر العرب جبنة كريمة',
    assignedMachine: 'MK 6',
    status: 'Planned',
    startDate: '2026-05-25',
    endDate: '2026-05-30',
    granulesType: 'HDPE Grade B',
    packagingDetails: 'Carton of 250',
    quantity: 8000,
    unit: 'pcs',
  },
  {
    id: 'PO-105',
    itemName: 'نسر العرب قشطة',
    assignedMachine: 'MK 6',
    status: 'Planned',
    startDate: '2026-05-26',
    endDate: '2026-05-31',
    granulesType: 'PP Food Grade',
    packagingDetails: 'Sterile Pack',
    quantity: 15000,
    unit: 'pcs',
  },
  {
    id: 'PO-106',
    itemName: 'نبع الصافي قشطة',
    assignedMachine: 'MK 6',
    status: 'Planned',
    startDate: '2026-05-27',
    endDate: '2026-06-01',
    granulesType: 'PP Food Grade',
    packagingDetails: 'Sterile Pack',
    quantity: 20000,
    unit: 'pcs',
  },
  {
    id: 'PO-107',
    itemName: 'عرب الاضواء',
    assignedMachine: 'MK 6',
    status: 'Planned',
    startDate: '2026-05-28',
    endDate: '2026-06-02',
    granulesType: 'PP Standard',
    packagingDetails: 'Carton of 500',
    quantity: 30000,
    unit: 'pcs',
  },
  // MK 10
  {
    id: 'PO-108',
    itemName: 'غطاء 4C',
    assignedMachine: 'MK 10',
    status: 'Planned',
    startDate: '2026-05-25',
    endDate: '2026-05-30',
    granulesType: 'LDPE Grade A',
    packagingDetails: 'Box of 1000',
    quantity: 50000,
    unit: 'pcs',
  },
  // MK 12
  {
    id: 'PO-109',
    itemName: 'تاج الذهبي (نشط)',
    assignedMachine: 'MK 12',
    status: 'In Progress',
    startDate: '2026-05-23',
    actualStartTime: '2026-05-23T19:14:00Z',
    endDate: '2026-05-27',
    granulesType: 'PP High Gloss',
    packagingDetails: 'Bag of 500',
    quantity: 10000,
    producedQuantity: 3600,
    unit: 'pcs',
  },
  {
    id: 'PO-110',
    itemName: 'الحدباء',
    assignedMachine: 'MK 12',
    status: 'Planned',
    startDate: '2026-05-24',
    endDate: '2026-05-29',
    granulesType: 'PP High Gloss',
    packagingDetails: 'Bag of 500',
    quantity: 12000,
    unit: 'pcs',
  },
  {
    id: 'PO-111',
    itemName: 'جياو',
    assignedMachine: 'MK 12',
    status: 'Planned',
    startDate: '2026-05-25',
    endDate: '2026-05-30',
    granulesType: 'PP standard',
    packagingDetails: 'Bag of 500',
    quantity: 15000,
    unit: 'pcs',
  },
  {
    id: 'PO-112',
    itemName: 'الاضواء',
    assignedMachine: 'MK 12',
    status: 'Planned',
    startDate: '2026-05-26',
    endDate: '2026-05-31',
    granulesType: 'PP standard',
    packagingDetails: 'Bag of 500',
    quantity: 18000,
    unit: 'pcs',
  },
  // MK 14
  {
    id: 'PO-113',
    itemName: 'عدم توفر حبيبات',
    assignedMachine: 'MK 14',
    status: 'Planned',
    startDate: '2026-01-06',
    endDate: '2026-01-10',
    granulesType: 'PET-G',
    packagingDetails: 'Box of 1000',
    quantity: 25000,
    unit: 'pcs',
  },
  // MK 15
  {
    id: 'PO-114',
    itemName: 'يدة سطل ابيض',
    assignedMachine: 'MK 15',
    status: 'Planned',
    startDate: '2026-05-26',
    endDate: '2026-05-31',
    granulesType: 'PP Copolymer',
    packagingDetails: 'Box of 2000',
    quantity: 40000,
    unit: 'pcs',
  },
  // BLOW 1
  {
    id: 'PO-115',
    itemName: 'قارورة مياه 1.5 لتر',
    assignedMachine: 'BLOW 1',
    status: 'In Progress',
    startDate: '2026-05-23',
    actualStartTime: '2026-05-23T10:00:00Z',
    endDate: '2026-05-27',
    granulesType: 'PET plastic',
    packagingDetails: 'Bundle of 50',
    quantity: 15000,
    producedQuantity: 6200,
    unit: 'pcs',
    productionRateMethod: 'cycle',
    cycleTime: 8,
    cavities: 2
  },
  // LABEL 1
  {
    id: 'PO-116',
    itemName: 'لاصق عبوات عصير',
    assignedMachine: 'LABEL 1',
    status: 'Planned',
    startDate: '2026-05-24',
    endDate: '2026-05-27',
    granulesType: 'Adhesive Paper',
    packagingDetails: 'Roll of 5000',
    quantity: 30000,
    unit: 'pcs',
  }
];

export default function ProductionOrders() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [roles] = useLocalStorage<any[]>('app_roles', defaultRoles);
  const currentRole = roles.find((r: any) => r.id === user?.role) || defaultRoles.find((r: any) => r.id === user?.role) || defaultRoles[0];
  const isReadOnly = currentRole?.permissions?.production_readonly === true;
  const isViewer = isReadOnly;
  const [machines, setMachines] = useLocalStorage<ProductionMachine[]>('production_machines_v11', initialMachines);
  const [orders, setOrders] = useLocalStorage<ProductionOrder[]>('production_orders_v11', INITIAL_PRODUCTION_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'Spreadsheet' | 'Board' | 'ActiveList' | 'History'>('Spreadsheet');
  const [machineCategoryFilter, setMachineCategoryFilter] = useState<'all' | 'injection' | 'blow' | 'label'>('all');
  const [machineStatusFilter, setMachineStatusFilter] = useState<'all' | 'running' | 'idle' | 'maintenance'>('all');
  const [extraQueueColumns, setExtraQueueColumns] = useState<number>(0);
  
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isContinuousOrder, setIsContinuousOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  const [rateMethod, setRateMethod] = useState<'cycle' | 'hourly'>('cycle');

  // Form State for Order Modal (Preserves custom cycleTime, cavities, and hourly rates)
  const [orderFormAssignedMachine, setOrderFormAssignedMachine] = useState('');
  const [orderFormRateMethod, setOrderFormRateMethod] = useState<'cycle' | 'hourly'>('cycle');
  const [orderFormCycleTime, setOrderFormCycleTime] = useState<number>(12);
  const [orderFormCavities, setOrderFormCavities] = useState<number>(1);
  const [orderFormHourlyRate, setOrderFormHourlyRate] = useState<number>(2400);

  const openOrderModal = (orderToEdit?: ProductionOrder | null, preselectedMachine?: string) => {
    if (orderToEdit) {
      const machObj = machines.find(m => m.name === orderToEdit.assignedMachine);
      const isBlow = machObj?.type === 'blow' || (orderToEdit.assignedMachine && orderToEdit.assignedMachine.toUpperCase().includes('BLOW'));
      const isLabel = machObj?.type === 'label' || (orderToEdit.assignedMachine && orderToEdit.assignedMachine.toUpperCase().includes('LABEL'));
      const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';
      const method = orderToEdit.productionRateMethod || machObj?.rateMethod || defMethod;

      setEditingOrder(orderToEdit);
      setIsContinuousOrder(!!orderToEdit.isContinuous);
      setOrderFormAssignedMachine(orderToEdit.assignedMachine || machines[0]?.name || '');
      setOrderFormRateMethod(method);
      setOrderFormCycleTime(orderToEdit.cycleTime ?? machObj?.cycleTime ?? 12);
      setOrderFormCavities(orderToEdit.cavities ?? machObj?.cavities ?? 1);
      setOrderFormHourlyRate(orderToEdit.hourlyRate ?? machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000));
    } else {
      const targetMachName = preselectedMachine || machines[0]?.name || '';
      const machObj = machines.find(m => m.name === targetMachName);
      const isBlow = machObj?.type === 'blow' || (targetMachName && targetMachName.toUpperCase().includes('BLOW'));
      const isLabel = machObj?.type === 'label' || (targetMachName && targetMachName.toUpperCase().includes('LABEL'));
      const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';
      const method = machObj?.rateMethod || defMethod;

      setEditingOrder(null);
      setIsContinuousOrder(false);
      setOrderFormAssignedMachine(targetMachName);
      setOrderFormRateMethod(method);
      setOrderFormCycleTime(machObj?.cycleTime ?? 12);
      setOrderFormCavities(machObj?.cavities ?? 1);
      setOrderFormHourlyRate(machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000));
    }
    setIsCreatingOrder(true);
  };

  const handleMachineSelectionChange = (newMachName: string) => {
    setOrderFormAssignedMachine(newMachName);
    const machObj = machines.find(m => m.name === newMachName);
    const isBlow = machObj?.type === 'blow' || (newMachName && newMachName.toUpperCase().includes('BLOW'));
    const isLabel = machObj?.type === 'label' || (newMachName && newMachName.toUpperCase().includes('LABEL'));
    const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';
    
    // When creating a new order, update to match selected machine specs
    if (!editingOrder) {
      setOrderFormRateMethod(machObj?.rateMethod || defMethod);
      setOrderFormCycleTime(machObj?.cycleTime ?? 12);
      setOrderFormCavities(machObj?.cavities ?? 1);
      setOrderFormHourlyRate(machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000));
    }
  };

  // Live Progress Tracker Input States (within viewing modal)
  const [trackerMode, setTrackerMode] = useState<'produced' | 'remaining'>('produced');
  const [trackerInputType, setTrackerInputType] = useState<'direct' | 'crates'>('direct');
  const [trackerDirectQty, setTrackerDirectQty] = useState<string>('');
  const [trackerCrates, setTrackerCrates] = useState<string>('');
  const [trackerPcsPerCrate, setTrackerPcsPerCrate] = useState<string>('');
  const [trackerLoose, setTrackerLoose] = useState<string>('');

  const extractPcsPerCrate = (pkgDetails?: string, totalQty?: number): number => {
    if (!pkgDetails) return 0;
    const ofMatch = pkgDetails.match(/(?:of|x|per|\/|\*)\s*([\d,]+)/i);
    if (ofMatch) {
      return parseFloat(ofMatch[1].replace(/,/g, '')) || 0;
    }
    const pcsMatch = pkgDetails.match(/([\d,]+)\s*(?:pcs|pieces|قطعة|حبة)/i);
    if (pcsMatch) {
      return parseFloat(pcsMatch[1].replace(/,/g, '')) || 0;
    }
    const bagsMatch = pkgDetails.match(/([\d,]+)\s*(?:bags|crates|boxes|cartons|صندوق|كيس|كرتونة)/i);
    if (bagsMatch && totalQty && totalQty > 0) {
      const bagCount = parseFloat(bagsMatch[1].replace(/,/g, '')) || 0;
      if (bagCount > 0 && totalQty % bagCount === 0) {
        return Math.round(totalQty / bagCount);
      }
    }
    const numMatch = pkgDetails.match(/[\d,]+/);
    if (numMatch) {
      const val = parseFloat(numMatch[0].replace(/,/g, '')) || 0;
      if (val > 0 && val !== totalQty) return val;
    }
    return 0;
  };

  // Universal handler to adjust live production output / progress manually (supports turning down or up reliably)
  const handleApplyManualOutput = (targetProducedUnits: number) => {
    if (!viewingOrder) return;

    let targetUnits = Math.max(0, targetProducedUnits);
    if (!viewingOrder.isContinuous && viewingOrder.quantity) {
      targetUnits = Math.min(targetUnits, viewingOrder.quantity);
    }

    let newStatus = viewingOrder.status;
    if (viewingOrder.status === 'Completed') {
      if (viewingOrder.quantity && targetUnits < viewingOrder.quantity) {
        // If user turned down the quantity of an order that was completed, revive it to In Progress!
        newStatus = 'In Progress';
      }
    }

    const updatedOrder: ProductionOrder = {
      ...viewingOrder,
      status: newStatus,
      producedQuantity: targetUnits,
      cratesQuantity: trackerInputType === 'crates' && trackerCrates ? trackerCrates : viewingOrder.cratesQuantity,
      looseQuantity: trackerInputType === 'crates' && trackerLoose ? trackerLoose : viewingOrder.looseQuantity,
    };

    setViewingOrder(updatedOrder);
    setOrders(prev => prev.map(o => o.id === viewingOrder.id ? updatedOrder : o));
    setTrackerDirectQty('');
    setTrackerCrates('');
    setTrackerLoose('');
    logAction('Production Output Updated', `Order ${viewingOrder.id} (${viewingOrder.itemName}) manual output updated to ${targetUnits.toLocaleString()} units (${((targetUnits / (viewingOrder.quantity || 1)) * 100).toFixed(1)}%).`, 'info');
  };

  // Mold Details Popup State
  const [viewingMoldDetails, setViewingMoldDetails] = useState<{
    machId: string;
    machName: string;
    machType?: 'injection' | 'blow' | 'label';
    moldName: string;
    activeOrderId: string | null;
    activeOrderName: string | null;
    rateMethod?: 'cycle' | 'hourly';
    cycleTime: number;
    cavities: number;
    hourlyRate?: number;
    currentAmps: number;
  } | null>(null);

  // Machine Setup Modal State
  const [isMachineSetupOpen, setIsMachineSetupOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [setupMCode, setSetupMCode] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupMoldName, setSetupMoldName] = useState('');
  const [setupMolds, setSetupMolds] = useState<string[]>(['']);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);

  const [trash, setTrash] = useLocalStorage<any[]>('trash_data', []);

  // Instant order state transition action handlers (immediate UI reflex without page refresh)
  const handleStartOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nowIso = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const machObj = machines.find(m => m.name === o.assignedMachine);
        const isBlow = machObj?.type === 'blow' || (o.assignedMachine && o.assignedMachine.toUpperCase().includes('BLOW'));
        const isLabel = machObj?.type === 'label' || (o.assignedMachine && o.assignedMachine.toUpperCase().includes('LABEL'));
        const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';
        return {
          ...o,
          status: 'In Progress' as const,
          actualStartTime: nowIso,
          productionRateMethod: o.productionRateMethod || machObj?.rateMethod || defMethod,
          cycleTime: o.cycleTime ?? machObj?.cycleTime ?? 12,
          cavities: o.cavities ?? machObj?.cavities ?? 1,
          hourlyRate: o.hourlyRate ?? machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000)
        };
      }
      return o;
    }));
    setViewingOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'In Progress', actualStartTime: nowIso } : prev);
    logAction('Production Order Started', `Order ${orderId} has started running.`, 'success');
    sendNotification({
      title: 'Order Started Production',
      message: `Order ${orderId} is now In Progress.`,
      type: 'order_updated',
      priority: 'normal',
      targetUsername: 'all',
      link: 'production',
      metadata: { orderId }
    });
  };

  const handlePauseOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        let acc = o.accumulatedTimeMs || 0;
        if (o.actualStartTime) {
          acc += Math.max(0, Date.now() - new Date(o.actualStartTime).getTime());
        }
        return {
          ...o,
          status: 'Maintenance' as const,
          accumulatedTimeMs: acc,
          actualStartTime: undefined
        };
      }
      return o;
    }));
    setViewingOrder(prev => {
      if (!prev || prev.id !== orderId) return prev;
      let acc = prev.accumulatedTimeMs || 0;
      if (prev.actualStartTime) {
        acc += Math.max(0, Date.now() - new Date(prev.actualStartTime).getTime());
      }
      return { ...prev, status: 'Maintenance', accumulatedTimeMs: acc, actualStartTime: undefined };
    });
    logAction('Production Order Paused', `Order ${orderId} paused for maintenance.`, 'warning');
  };

  const handleResumeOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nowIso = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'In Progress' as const,
          actualStartTime: nowIso,
        };
      }
      return o;
    }));
    setViewingOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'In Progress', actualStartTime: nowIso } : prev);
    logAction('Production Order Resumed', `Order ${orderId} resumed production.`, 'success');
  };

  const handleCompleteOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const finalProduced = order.producedQuantity !== undefined ? order.producedQuantity : (order.quantity || 0);
    const updatedOrder: ProductionOrder = {
      ...order,
      status: 'Completed' as const,
      producedQuantity: finalProduced
    };
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? updatedOrder : o);
      // Auto-start next planned order on the same machine if any
      const machine = order.assignedMachine;
      const plannedOnMach = updated.filter(o => o.assignedMachine === machine && o.status === 'Planned');
      if (plannedOnMach.length > 0) {
        plannedOnMach.sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
        const nextOrder = plannedOnMach[0];
        const machObj = machines.find(m => m.name === machine);
        const isBlow = machObj?.type === 'blow' || (machine && machine.toUpperCase().includes('BLOW'));
        const isLabel = machObj?.type === 'label' || (machine && machine.toUpperCase().includes('LABEL'));
        const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';

        return updated.map(o => o.id === nextOrder.id ? {
          ...o,
          status: 'In Progress',
          actualStartTime: new Date().toISOString(),
          productionRateMethod: o.productionRateMethod || machObj?.rateMethod || defMethod,
          cycleTime: o.cycleTime ?? machObj?.cycleTime ?? 12,
          cavities: o.cavities ?? machObj?.cavities ?? 1,
          hourlyRate: o.hourlyRate ?? machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000)
        } : o);
      }
      return updated;
    });
    setViewingOrder(prev => prev && prev.id === orderId ? updatedOrder : prev);
    logAction('Production Order Completed', `Order ${orderId} (${order.itemName}) marked as completed with ${finalProduced.toLocaleString()} units.`, 'success');
    sendNotification({
      title: 'Order Completed',
      message: `Order ${orderId} (${order.itemName}) finished with ${finalProduced.toLocaleString()} ${getOrderUnit(order)} on ${order.assignedMachine}.`,
      type: 'order_updated',
      priority: 'normal',
      targetUsername: 'all',
      link: 'production',
      metadata: { orderId, machineId: order.assignedMachine }
    });
  };

  // Calculate expected end date & time based on quantity, cycle time, cavities
  const getExpectedEndDateTime = (orderObj: any) => {
    if (!orderObj || orderObj.isContinuous) return null;
    let totalDurationMs = 0;
    
    const isCycleMethod = orderObj.productionRateMethod === 'cycle' || 
                          (!orderObj.productionRateMethod && orderObj.cycleTime) || 
                          (orderObj.cycleTime && orderObj.cavities);

    if (isCycleMethod || !orderObj.hourlyRate) {
      const safeCycle = orderObj.cycleTime || 12;
      const safeCavities = orderObj.cavities || 1;
      const totalShots = Math.ceil(orderObj.quantity / safeCavities);
      totalDurationMs = totalShots * safeCycle * 1000;
    } else {
      const safeHourlyRate = orderObj.hourlyRate || 1000;
      const totalHours = orderObj.quantity / safeHourlyRate;
      totalDurationMs = totalHours * 3600 * 1000;
    }

    if (orderObj.status === 'In Progress' && orderObj.actualStartTime) {
      const startMs = new Date(orderObj.actualStartTime).getTime();
      return new Date(startMs + totalDurationMs - (orderObj.accumulatedTimeMs || 0));
    } else if (orderObj.startDate) {
      return new Date(new Date(orderObj.startDate).getTime() + totalDurationMs);
    }
    return null;
  };

  const getProducedCount = (orderObj: any): number => {
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
      const isCycle = orderObj.productionRateMethod === 'cycle' || (!orderObj.productionRateMethod && orderObj.cycleTime) || (orderObj.cycleTime && orderObj.cavities) || (!orderObj.hourlyRate);
      if (isCycle) {
        const safeCycle = orderObj.cycleTime || 10;
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

  // Format machine date from Gregorian to dynamic text representation
  const formatDateValue = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // e.g. "2026-05-23" -> "23/5/2026"
        return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // Format order active hour in Arabic / English style
  const formatTimeValue = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${ampm} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleDeleteOrder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    if (confirm(`Move production order ${id} (${order.itemName}) to trash?`)) {
      const trashItem = {
        id: order.id,
        type: 'prod_order',
        name: order.itemName,
        data: order,
        deletedAt: new Date().toISOString()
      };
      setTrash(prev => [...prev, trashItem]);
      setOrders(prev => prev.filter(o => o.id !== id));
      logAction('Production Order Deleted', `Order ${order.id} was moved to trash.`, 'warning');
      if (viewingOrder?.id === id) setViewingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planned': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'In Progress': return <PlayCircle className="w-4 h-4 text-orange-500 animate-pulse" />;
      case 'Maintenance': return <Ban className="w-4 h-4 text-red-500" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Cancelled': return <X className="w-4 h-4 text-tertiary" />;
      default: return <ClipboardList className="w-4 h-4 text-tertiary" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Planned': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'In Progress': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Maintenance': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Cancelled': return 'text-tertiary bg-surface border-divider';
      default: return 'text-muted bg-surface border-divider';
    }
  };

  // Organize queues by machine
  const getMachineSequence = (machineName: string) => {
    const cleanTarget = (machineName || '').trim().toLowerCase();
    const machOrders = orders.filter(
      o => (o.assignedMachine || '').trim().toLowerCase() === cleanTarget && o.status !== 'Completed' && o.status !== 'Cancelled'
    );
    
    // In progress or maintenance comes first.
    // Planned comes after, sorted by chronological order or array order.
    return [...machOrders].sort((a, b) => {
      const activeA = ['In Progress', 'Maintenance'].includes(a.status) ? 0 : 1;
      const activeB = ['In Progress', 'Maintenance'].includes(b.status) ? 0 : 1;
      if (activeA !== activeB) return activeA - activeB;
      return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
    });
  };

  // Reordering of queues on a machine
  const changeQueueSequence = (orderId: string, direction: 'left' | 'right') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    const mName = targetOrder.assignedMachine;
    const sameMachPlanned = orders.filter(o => o.assignedMachine === mName && o.status === 'Planned');
    
    sameMachPlanned.sort((a,b) => {
      const timeA = new Date(a.startDate || 0).getTime();
      const timeB = new Date(b.startDate || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
    
    const currentPlannedIdx = sameMachPlanned.findIndex(o => o.id === orderId);
    if (currentPlannedIdx === -1) return;

    let swapWithIdx = -1;
    if (direction === 'left' && currentPlannedIdx > 0) {
      swapWithIdx = currentPlannedIdx - 1;
    } else if (direction === 'right' && currentPlannedIdx < sameMachPlanned.length - 1) {
      swapWithIdx = currentPlannedIdx + 1;
    }

    if (swapWithIdx !== -1) {
      const newQueue = [...sameMachPlanned];
      const [moved] = newQueue.splice(currentPlannedIdx, 1);
      newQueue.splice(swapWithIdx, 0, moved);
      
      const baseTime = Date.now();
      const idToTimeMap = new Map<string, number>();
      newQueue.forEach((item, index) => {
        idToTimeMap.set(item.id, baseTime + index * 60000);
      });

      setOrders(prev => prev.map(o => {
        if (idToTimeMap.has(o.id)) {
          return { ...o, startDate: new Date(idToTimeMap.get(o.id)!).toISOString() };
        }
        return o;
      }));
      logAction('Queue Swapped', `Swapped timeline sequence of ${targetOrder.itemName} on ${mName}`, 'info');
    }
  };

  // Filters
  const searchFilterMatches = (order: ProductionOrder) => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(sq) ||
      order.itemName.toLowerCase().includes(sq) ||
      order.assignedMachine.toLowerCase().includes(sq)
    );
  };

  const statusFilterMatches = (order: ProductionOrder) => {
    return statusFilter === 'All' || order.status === statusFilter;
  };

  const activeNonArchiveMatches = (order: ProductionOrder) => {
    return ['Planned', 'In Progress', 'Maintenance'].includes(order.status);
  };

  const archiveMatches = (order: ProductionOrder) => {
    return ['Completed', 'Cancelled'].includes(order.status);
  };


  const handleFormChange = (e: React.FormEvent<HTMLFormElement>) => {
    if (isContinuousOrder) return;
    const targetName = (e.target as HTMLInputElement).name;
    if (['packagingDetails', 'cratesQuantity', 'looseQuantity'].includes(targetName)) {
      const formData = new FormData(e.currentTarget);
      const pkgDetails = formData.get('packagingDetails') as string;
      const crates = formData.get('cratesQuantity') as string;
      const loose = formData.get('looseQuantity') as string;
      
      const packMatch = pkgDetails.match(/[\d.]+/);
      const packNum = packMatch ? parseFloat(packMatch[0]) : 0;
      const cratesNum = parseFloat(crates) || 0;
      const looseNum = parseFloat(loose) || 0;
      
      if (packNum > 0 || cratesNum > 0 || looseNum > 0) {
        const autoQty = (packNum * cratesNum) + looseNum;
        const qtyInput = e.currentTarget.elements.namedItem('quantity') as HTMLInputElement;
        if (qtyInput && autoQty > 0) {
          qtyInput.value = autoQty.toString();
        }
        const unitSelect = e.currentTarget.elements.namedItem('unit') as HTMLSelectElement;
        if (unitSelect && (unitSelect.value.toLowerCase() === 'boxes' || unitSelect.value.toLowerCase() === 'boxs')) {
          unitSelect.value = 'pcs';
        }
      }
    }
  };

  // Form submission (Save / Edit)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newStatus = formData.get('status') as ProductionOrder['status'] || 'Planned';
    
    let actualStartTime = editingOrder?.actualStartTime;
    let accumulatedTimeMs = editingOrder?.accumulatedTimeMs || 0;
    
    if (editingOrder) {
        if (newStatus === 'In Progress' && editingOrder.status !== 'In Progress') {
            actualStartTime = new Date().toISOString();
        } else if (newStatus === 'Maintenance' && editingOrder.status === 'In Progress') {
            if (actualStartTime) {
                accumulatedTimeMs += Math.max(0, Date.now() - new Date(actualStartTime).getTime());
            }
            actualStartTime = undefined;
        } else if (newStatus === 'Planned' || newStatus === 'Cancelled') {
            actualStartTime = undefined;
            accumulatedTimeMs = 0;
        }
    } else {
        if (newStatus === 'In Progress') {
            actualStartTime = new Date().toISOString();
        }
    }

    const assignedMach = (formData.get('assignedMachine') as string) || orderFormAssignedMachine || machines[0]?.name;
    const machObj = machines.find(m => m.name === assignedMach);
    const isBlow = machObj?.type === 'blow' || (assignedMach && assignedMach.toUpperCase().includes('BLOW'));
    const isLabel = machObj?.type === 'label' || (assignedMach && assignedMach.toUpperCase().includes('LABEL'));
    const defMethod = (isBlow || isLabel) ? 'hourly' : 'cycle';
    const effectiveMethod = orderFormRateMethod || editingOrder?.productionRateMethod || machObj?.rateMethod || defMethod;

    const parsedCycleTime = formData.get('cycleTime') !== null && formData.get('cycleTime') !== '' 
      ? Number(formData.get('cycleTime')) 
      : orderFormCycleTime;
    const resolvedCycleTime = parsedCycleTime > 0 
      ? parsedCycleTime 
      : (editingOrder?.cycleTime ?? machObj?.cycleTime ?? 12);

    const parsedCavities = formData.get('cavities') !== null && formData.get('cavities') !== ''
      ? Number(formData.get('cavities'))
      : orderFormCavities;
    const resolvedCavities = parsedCavities > 0
      ? parsedCavities
      : (editingOrder?.cavities ?? machObj?.cavities ?? 1);

    const parsedHourlyRate = formData.get('hourlyRate') !== null && formData.get('hourlyRate') !== ''
      ? Number(formData.get('hourlyRate'))
      : orderFormHourlyRate;
    const resolvedHourlyRate = parsedHourlyRate >= 0
      ? parsedHourlyRate
      : (editingOrder?.hourlyRate ?? machObj?.hourlyRate ?? (isBlow ? 2400 : isLabel ? 3500 : 1000));
    
    const producedQtyField = formData.get('producedQuantity');
    const parsedProducedQty = (producedQtyField !== null && producedQtyField !== '') ? Math.max(0, Number(producedQtyField)) : undefined;

    if (editingOrder) {
       const updatedOrder: ProductionOrder = {
         ...editingOrder,
         itemName: formData.get('itemName') as string,
         granulesType: formData.get('granulesType') as string,
         colorant: formData.get('colorant') as string,
         packagingDetails: formData.get('packagingDetails') as string,
         cratesQuantity: isContinuousOrder ? '' : (formData.get('cratesQuantity') as string),
         looseQuantity: isContinuousOrder ? '' : (formData.get('looseQuantity') as string),
         assignedMachine: assignedMach,
         startDate: editingOrder ? (editingOrder.startDate || new Date().toISOString()) : new Date().toISOString(),
         endDate: formData.get('endDate') as string,
         status: newStatus,
         quantity: isContinuousOrder ? (Number(formData.get('quantity')) || 0) : Number(formData.get('quantity')),
         producedQuantity: parsedProducedQty !== undefined 
           ? parsedProducedQty 
           : (editingOrder.producedQuantity ?? (newStatus === 'Completed' ? Number(formData.get('quantity')) : 0)),
         isContinuous: isContinuousOrder,
         unit: (() => {
           const raw = (formData.get('unit') as string) || 'pcs';
           return (raw.toLowerCase() === 'boxes' || raw.toLowerCase() === 'boxs') ? 'pcs' : raw;
         })(),
         productionRateMethod: effectiveMethod,
         cycleTime: effectiveMethod === 'cycle' ? resolvedCycleTime : (editingOrder.cycleTime ?? machObj?.cycleTime),
         cavities: effectiveMethod === 'cycle' ? resolvedCavities : (editingOrder.cavities ?? machObj?.cavities),
         hourlyRate: effectiveMethod === 'hourly' ? resolvedHourlyRate : (editingOrder.hourlyRate ?? machObj?.hourlyRate),
         actualStartTime,
         dateEntered: formData.get('dateEntered') as string,
         accumulatedTimeMs,
         notes: formData.get('notes') as string,
       };
       setOrders(prev => prev.map(order => order.id === editingOrder.id ? updatedOrder : order));
       logAction('Production Order Updated', `Order ${editingOrder.id} (${updatedOrder.itemName}) was updated with cycle: ${updatedOrder.cycleTime}s, cav: ${updatedOrder.cavities}.`, 'info');
       sendNotification({
         title: 'Production Order Updated',
         message: `Order ${editingOrder.id} (${updatedOrder.itemName}) was updated on ${updatedOrder.assignedMachine}.`,
         type: 'order_updated',
         priority: 'normal',
         targetUsername: 'all',
         link: 'production',
         metadata: { orderId: editingOrder.id, machineId: updatedOrder.assignedMachine }
       });
    } else {
      const machPlannedOrders = orders.filter(o => o.assignedMachine === assignedMach && o.status === 'Planned');
      let effectiveStartDate = new Date().toISOString();
      if (newStatus === 'Planned' && machPlannedOrders.length > 0) {
        const maxPlannedTime = Math.max(...machPlannedOrders.map(o => new Date(o.startDate || 0).getTime()));
        effectiveStartDate = new Date(Math.max(Date.now(), maxPlannedTime + 60000)).toISOString();
      }

      const newId = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: ProductionOrder = {
        id: newId,
        itemName: formData.get('itemName') as string,
        granulesType: formData.get('granulesType') as string,
        colorant: formData.get('colorant') as string,
        packagingDetails: formData.get('packagingDetails') as string,
        cratesQuantity: isContinuousOrder ? '' : (formData.get('cratesQuantity') as string),
        looseQuantity: isContinuousOrder ? '' : (formData.get('looseQuantity') as string),
        assignedMachine: assignedMach,
        startDate: effectiveStartDate,
        endDate: formData.get('endDate') as string,
        status: newStatus,
        quantity: isContinuousOrder ? (Number(formData.get('quantity')) || 0) : Number(formData.get('quantity')),
        producedQuantity: parsedProducedQty !== undefined 
          ? parsedProducedQty 
          : (newStatus === 'Completed' ? (isContinuousOrder ? 0 : Number(formData.get('quantity'))) : 0),
        isContinuous: isContinuousOrder,
        unit: (() => {
          const raw = (formData.get('unit') as string) || 'pcs';
          return (raw.toLowerCase() === 'boxes' || raw.toLowerCase() === 'boxs') ? 'pcs' : raw;
        })(),
        productionRateMethod: effectiveMethod,
        cycleTime: effectiveMethod === 'cycle' ? resolvedCycleTime : machObj?.cycleTime,
        cavities: effectiveMethod === 'cycle' ? resolvedCavities : machObj?.cavities,
        hourlyRate: effectiveMethod === 'hourly' ? resolvedHourlyRate : machObj?.hourlyRate,
        actualStartTime,
        dateEntered: formData.get('dateEntered') as string,
        accumulatedTimeMs,
        notes: formData.get('notes') as string,
      };
      setOrders(prev => [newOrder, ...prev]);
      logAction('Production Order Created', `Order ${newId} (${newOrder.itemName}) was created for ${assignedMach}.`, 'success');
      sendNotification({
        title: 'New Production Order Added',
        message: `${newOrder.itemName} (${newOrder.quantity.toLocaleString()} ${newOrder.unit}) scheduled on ${assignedMach}.`,
        type: 'order_created',
        priority: 'normal',
        targetUsername: 'all',
        link: 'production',
        metadata: { orderId: newId, machineId: assignedMach }
      });
    }
    
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };

  // Fast direct instant order scheduler on clicking an empty Next-Order cell
  const handleAddDirectQueueOrder = (machineName: string) => {
    openOrderModal(null, machineName);
  };

  // Machine Setup Controller actions
  const saveMachineSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !setupMoldName.trim()) return;

    const computedMCode = setupName.replace(/\D/g, '') || setupName;

    if (editingMachineId) {
      setMachines(prev => prev.map(m => m.id === editingMachineId ? { ...m, m: computedMCode, name: setupName, moldName: setupMoldName, molds: setupMolds.filter(mold => mold.trim() !== '') } : m));
      logAction('Machine Edited', `Updated Machine M-${computedMCode} (${setupName}) with Mold (${setupMoldName})`, 'info');
      setEditingMachineId(null);
    } else {
      const newMach: ProductionMachine = {
        id: `mach-${Date.now()}`,
        m: computedMCode,
        name: setupName,
        moldName: setupMoldName,
        molds: setupMolds.filter(mold => mold.trim() !== ''),
        currentAmps: 32
      };
      setMachines(prev => [...prev, newMach]);
      logAction('Machine Added', `Added new Production Machine M-${computedMCode} (${setupName}) with Mold (${newMach.moldName})`, 'success');
    }
    setSetupMCode('');
    setSetupName('');
    setSetupMoldName(''); setSetupMolds(['']);
    setSetupMolds(['']);
  };

  const deleteSetupMachine = (id: string, name: string) => {
    if (confirm(`Delete machine "${name}" from scheduler directory? This doesn't delete historical logs.`)) {
      setMachines(prev => prev.filter(m => m.id !== id));
      logAction('Machine Removed', `Deleted Machine ${name} from active directory.`, 'warning');
    }
  };

  const handleSaveMoldDetails = (
    updatedMold: string,
    updatedAmps: number,
    updatedCycle: number,
    updatedCavities: number,
    updatedHourlyRate: number,
    updatedRateMethod: 'cycle' | 'hourly'
  ) => {
    if (!viewingMoldDetails) return;

    setMachines(prev => prev.map(m => m.id === viewingMoldDetails.machId ? {
      ...m,
      moldName: updatedMold,
      currentAmps: updatedAmps,
      cycleTime: updatedCycle,
      cavities: updatedCavities,
      hourlyRate: updatedHourlyRate,
      rateMethod: updatedRateMethod,
    } : m));

    if (viewingMoldDetails.activeOrderId) {
      setOrders(prev => prev.map(o => o.id === viewingMoldDetails.activeOrderId ? {
        ...o,
        productionRateMethod: updatedRateMethod,
        cycleTime: updatedRateMethod === 'cycle' ? updatedCycle : o.cycleTime,
        cavities: updatedRateMethod === 'cycle' ? updatedCavities : o.cavities,
        hourlyRate: updatedRateMethod === 'hourly' ? updatedHourlyRate : o.hourlyRate,
      } : o));
    }

    const rateDesc = updatedRateMethod === 'hourly' ? `${updatedHourlyRate.toLocaleString()} bottles/hr` : `${updatedCycle}s cycle, ${updatedCavities} cav`;
    logAction('Specs Updated', `Updated specifications on ${viewingMoldDetails.machName}: ${updatedMold}, ${rateDesc}, Amps=${updatedAmps}A`, 'success');
    setViewingMoldDetails(null);
  };

  const handleApplySingleSpecToAll = (
    cycleTime: number,
    cavities: number,
    hourlyRate: number,
    rateMethod: 'cycle' | 'hourly',
    targetGroup: 'all' | 'same_type' = 'all'
  ) => {
    const currentMachType = viewingMoldDetails?.machType || (
      viewingMoldDetails?.machName.toUpperCase().includes('BLOW') ? 'blow' :
      viewingMoldDetails?.machName.toUpperCase().includes('LABEL') ? 'label' : 'injection'
    );

    // 1. Update machines matching group
    setMachines(prev => prev.map(m => {
      const mType = m.type || (m.name.toUpperCase().includes('BLOW') ? 'blow' : m.name.toUpperCase().includes('LABEL') ? 'label' : 'injection');
      if (targetGroup === 'same_type' && mType !== currentMachType) {
        return m;
      }
      return {
        ...m,
        cycleTime,
        cavities,
        hourlyRate,
        rateMethod
      };
    }));

    // 2. Update active and planned orders
    setOrders(prev => prev.map(o => {
      const isTargetOrder = targetGroup === 'all' || machines.some(m => {
        const mType = m.type || (m.name.toUpperCase().includes('BLOW') ? 'blow' : m.name.toUpperCase().includes('LABEL') ? 'label' : 'injection');
        return m.name === o.assignedMachine && mType === currentMachType;
      });

      if (isTargetOrder && (o.status === 'In Progress' || o.status === 'Maintenance' || o.status === 'Planned')) {
        return {
          ...o,
          productionRateMethod: rateMethod,
          cycleTime: rateMethod === 'cycle' ? cycleTime : o.cycleTime,
          cavities: rateMethod === 'cycle' ? cavities : o.cavities,
          hourlyRate: rateMethod === 'hourly' ? hourlyRate : o.hourlyRate
        };
      }
      return o;
    }));

    if (viewingOrder) {
      setViewingOrder(prev => prev ? {
        ...prev,
        productionRateMethod: rateMethod,
        cycleTime: rateMethod === 'cycle' ? cycleTime : prev.cycleTime,
        cavities: rateMethod === 'cycle' ? cavities : prev.cavities,
        hourlyRate: rateMethod === 'hourly' ? hourlyRate : prev.hourlyRate
      } : null);
    }

    logAction('Batch Specs Applied', `Applied ${rateMethod === 'hourly' ? `${hourlyRate.toLocaleString()} bottles/hr` : `${cycleTime}s & ${cavities} cav`} across target machines.`, 'success');
    setViewingMoldDetails(null);
  };

  const handleApplyBatchCyclesAndCavities = (
    updates: Array<{
      machineName: string;
      cycleTime?: number;
      cavities?: number;
      hourlyRate?: number;
      rateMethod?: 'cycle' | 'hourly';
    }>,
    shouldUpdateActive: boolean,
    shouldUpdatePlanned: boolean
  ) => {
    const updateMap = new Map<string, {
      cycleTime?: number;
      cavities?: number;
      hourlyRate?: number;
      rateMethod?: 'cycle' | 'hourly';
    }>();
    updates.forEach(u => {
      updateMap.set(u.machineName, {
        cycleTime: u.cycleTime,
        cavities: u.cavities,
        hourlyRate: u.hourlyRate,
        rateMethod: u.rateMethod
      });
    });

    // 1. Update machines
    setMachines(prev => prev.map(m => {
      const match = updateMap.get(m.name);
      if (match) {
        return {
          ...m,
          ...(match.cycleTime !== undefined ? { cycleTime: match.cycleTime } : {}),
          ...(match.cavities !== undefined ? { cavities: match.cavities } : {}),
          ...(match.hourlyRate !== undefined ? { hourlyRate: match.hourlyRate } : {}),
          ...(match.rateMethod !== undefined ? { rateMethod: match.rateMethod } : {})
        };
      }
      return m;
    }));

    // 2. Update orders
    setOrders(prev => prev.map(order => {
      const match = updateMap.get(order.assignedMachine);
      if (!match) return order;

      const isActive = order.status === 'In Progress' || order.status === 'Maintenance';
      const isPlanned = order.status === 'Planned';

      if ((isActive && shouldUpdateActive) || (isPlanned && shouldUpdatePlanned)) {
        const newMethod = match.rateMethod || order.productionRateMethod || (match.hourlyRate ? 'hourly' : 'cycle');
        return {
          ...order,
          productionRateMethod: newMethod,
          ...(match.cycleTime !== undefined ? { cycleTime: match.cycleTime } : {}),
          ...(match.cavities !== undefined ? { cavities: match.cavities } : {}),
          ...(match.hourlyRate !== undefined ? { hourlyRate: match.hourlyRate } : {})
        };
      }
      return order;
    }));

    // 3. Update viewing order if currently open
    setViewingOrder(prev => {
      if (!prev) return prev;
      const match = updateMap.get(prev.assignedMachine);
      if (match) {
        const newMethod = match.rateMethod || prev.productionRateMethod || (match.hourlyRate ? 'hourly' : 'cycle');
        return {
          ...prev,
          productionRateMethod: newMethod,
          ...(match.cycleTime !== undefined ? { cycleTime: match.cycleTime } : {}),
          ...(match.cavities !== undefined ? { cavities: match.cavities } : {}),
          ...(match.hourlyRate !== undefined ? { hourlyRate: match.hourlyRate } : {})
        };
      }
      return prev;
    });

    logAction(
      'Batch Specs Applied',
      `Applied cycle times, cavities, and bottles/hr rates across ${updates.length} machines via batch tool.`,
      'success'
    );
  };

  const handleExportAllOrders = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Helper to get month name
    const getMonthName = (dateStr) => {
      if (!dateStr) return 'UNKNOWN';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'UNKNOWN';
      return d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    };

    // Group orders by month
    const ordersByMonth = {};
    orders.forEach(order => {
      const dateStr = order.dateEntered || order.startDate;
      const month = getMonthName(dateStr);
      if (!ordersByMonth[month]) ordersByMonth[month] = [];
      ordersByMonth[month].push(order);
    });

    const months = Object.keys(ordersByMonth);
    if (months.length === 0) {
      const ws = workbook.addWorksheet('EMPTY');
      ws.addRow(['No data']);
    }

    months.forEach(month => {
      const worksheet = workbook.addWorksheet(month);
      
      worksheet.columns = [
        { header: 'Date of Order', key: 'dateOfOrder', width: 20 },
        { header: 'Product details', key: 'productDetails', width: 40 },
        { header: 'Raw Material / Granules', key: 'granulesType', width: 30 },
        { header: 'Color / Masterbatch', key: 'colorant', width: 25 },
        { header: 'Packing Type', key: 'packingType', width: 30 },
        { header: 'Unit', key: 'unit', width: 15 },
        { header: 'Crates / Bags Qty', key: 'cratesQuantity', width: 20 },
        { header: 'Loose Items Qty', key: 'looseQuantity', width: 20 },
        { header: 'Machine #', key: 'machine', width: 15 },
        { header: 'Requested QTY', key: 'qty', width: 20 },
        { header: 'Completion Date', key: 'completionDate', width: 20 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];

      // Header styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFCE4D6' } // light orange/gold
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      const monthOrders = ordersByMonth[month];
      // Sort by date if possible
      monthOrders.sort((a, b) => {
        const dA = new Date(a.dateEntered || a.startDate).getTime() || 0;
        const dB = new Date(b.dateEntered || b.startDate).getTime() || 0;
        return dA - dB;
      });

      monthOrders.forEach(order => {
        const formatDayName = (dStr) => {
          if (!dStr) return '';
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return dStr;
          const dayName = d.toLocaleString('en-US', { weekday: 'short' });
          const day = d.getDate();
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          return `${dayName}-${day}-${m}-${y}`;
        };

        const row = worksheet.addRow({
          dateOfOrder: formatDayName(order.dateEntered || order.startDate),
          productDetails: order.itemName,
          granulesType: order.granulesType || '',
          colorant: order.colorant || '',
          packingType: order.packagingDetails || '',
          unit: getOrderUnit(order),
          cratesQuantity: order.cratesQuantity || '',
          looseQuantity: order.looseQuantity || '',
          machine: order.assignedMachine || '',
          qty: order.quantity ? order.quantity.toLocaleString() : '',
          completionDate: order.endDate || '',
          status: order.status || '',
          notes: order.notes || ''
        });

        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logAction('Data Exported', 'Exported orders grouped by month to Excel', 'info');
  };

  // EXPORT CURRENT QUEUE MATRIX TO EXCEL SHEET
  const handleExportMatrixExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Production Queue Matrix');

    // Sort machines numerically by M code using consistent sorter
    const sortedMachines = getSortedMachines();

    // Determine max queue length dynamically across all machines (at least 5)
    let maxSlots = 5;
    sortedMachines.forEach(mach => {
      const queue = getMachineSequence(mach.name);
      const activeOrder = queue.length > 0 ? queue[0] : null;
      const plannedQueue = (activeOrder && ['In Progress', 'Maintenance'].includes(activeOrder.status)) ? queue.slice(1) : queue;
      if (plannedQueue.length > maxSlots) {
        maxSlots = plannedQueue.length;
      }
    });

    // Headers mapped: M, Mold, Current Order, Date, TIME, and dynamic Next-Order 1..N
    const columns: any[] = [
      { header: 'M', key: 'm', width: 10 },
      { header: 'Mold Name', key: 'moldName', width: 25 },
      { header: 'Current Order', key: 'currentOrder', width: 25 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'TIME', key: 'time', width: 15 },
    ];

    for (let s = 1; s <= maxSlots; s++) {
      columns.push({ header: `Next-Order ${s}`, key: `next${s}`, width: 30 });
    }

    worksheet.columns = columns;

    // Splice in a title row at Row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 40;
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'PRODUCTION SCHEDULER QUEUE MATRIX';
    titleCell.font = { bold: true, size: 15, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate 850
    };

    // Header styling in Row 2
    const headerRow = worksheet.getRow(2);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFA0AEC0' } },
        bottom: { style: 'medium', color: { argb: 'FF4A5568' } },
        left: { style: 'thin', color: { argb: 'FFA0AEC0' } },
        right: { style: 'thin', color: { argb: 'FFA0AEC0' } }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD966' } // Golden Yellow background matching screenshot
      };
    });

    sortedMachines.forEach((mach, idx) => {
      // Get queue sequence
      const queue = getMachineSequence(mach.name);
      
      const activeOrder = queue.length > 0 ? queue[0] : null;
      const isWorking = activeOrder && activeOrder.status === 'In Progress';
      const isMaintenance = activeOrder && activeOrder.status === 'Maintenance';
      const plannedQueue = (activeOrder && ['In Progress', 'Maintenance'].includes(activeOrder.status)) ? queue.slice(1) : queue;

      let dateVal = '-';
      let timeVal = '';
      let orderDisplayName = 'Idle (جاهز)';

      if (activeOrder) {
        if (activeOrder.status === 'In Progress') {
          const expectedEnd = getExpectedEndDateTime(activeOrder);
          if (expectedEnd) {
            dateVal = formatDateFromObject(expectedEnd);
            timeVal = formatTimeFromObject(expectedEnd);
          }
          orderDisplayName = activeOrder.itemName;
        } else if (activeOrder.status === 'Maintenance') {
          dateVal = '-';
          timeVal = 'صيانة';
          orderDisplayName = `${activeOrder.itemName} (صيانة)`;
        } else {
          dateVal = '-';
          timeVal = 'بلا طلبية';
          orderDisplayName = 'Idle (جاهز)';
        }
      } else {
        timeVal = 'بلا طلبية';
      }

      const moldNameVal = mach.moldName || `Mould ${mach.name}`;

      const rowData: Record<string, any> = {
        m: parseInt(mach.m, 10) || mach.m,
        moldName: moldNameVal,
        currentOrder: orderDisplayName,
        date: dateVal,
        time: timeVal,
      };

      for (let s = 0; s < maxSlots; s++) {
        rowData[`next${s + 1}`] = plannedQueue.length > s ? plannedQueue[s].itemName : 'لا توجد طلبية';
      }

      const row = worksheet.addRow(rowData);

      row.height = 24;

      row.eachCell((cell, colIndex) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.font = { size: 9, name: 'Arial' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        // Align Mold Name left, keep Indigo coloring
        if (colIndex === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.font = { bold: true, size: 9.5, name: 'Arial', color: { argb: 'FF4F46E5' } };
        }

        // Align Current Order left, keep bold
        if (colIndex === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.font = { bold: true, size: 9.5, name: 'Arial' };
        }

        // Color E column (TIME) with soft light green if not empty (In Progress)
        if (colIndex === 5 && timeVal) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9EAD3' } // light green
          };
          cell.font = { bold: true, color: { argb: 'FF274E13' }, size: 9, name: 'Arial' };
        }

        // Soft formatting for 'لا توجد طلبية' to make it look faded/gray
        if (colIndex >= 6 && cell.value === 'لا توجد طلبية') {
          cell.font = { color: { argb: 'FF94A3B8' }, italic: true, size: 8.5, name: 'Arial' };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Production_Queue_Matrix_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    logAction('Queue Exported', 'User exported direct production queue matrix to Excel file styled with gold headers and green timers.', 'info');
  };

  // Filtered lists for list modes
  const getActiveOrdersList = () => {
    return orders.filter(o => activeNonArchiveMatches(o) && searchFilterMatches(o) && statusFilterMatches(o));
  };

  const getArchiveOrdersList = () => {
    return orders.filter(o => archiveMatches(o) && searchFilterMatches(o) && statusFilterMatches(o));
  };

  // Sort machines numerically by M index with structured category support (MK first, then LABEL, then BLOW)
  const getSortedMachines = () => {
    return [...machines].sort((a,b) => {
      const getCategoryAndNum = (mCode: string, name: string) => {
        const nameUpper = name.toUpperCase();
        if (nameUpper.includes('LABEL') || mCode.toUpperCase().startsWith('L')) {
          const num = parseInt(mCode.replace(/\D/g, ''), 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
          return { cat: 2, num };
        }
        if (nameUpper.includes('BLOW') || mCode.toUpperCase().startsWith('B')) {
          const num = parseInt(mCode.replace(/\D/g, ''), 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
          return { cat: 3, num };
        }
        // Default is MK / Injection molding machines
        const num = parseInt(mCode, 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
        return { cat: 1, num };
      };

      const infoA = getCategoryAndNum(a.m, a.name);
      const infoB = getCategoryAndNum(b.m, b.name);

      if (infoA.cat !== infoB.cat) {
        return infoA.cat - infoB.cat;
      }
      return infoA.num - infoB.num;
    });
  };

  const metrics = React.useMemo(() => {
    let runningLines = 0;
    let maintenanceLines = 0;
    let queuedOrdersCount = 0;
    let activeProducedUnits = 0;

    machines.forEach((mach) => {
      const sequence = getMachineSequence(mach.name);
      const active = sequence.length > 0 ? sequence[0] : null;
      if (active) {
        if (active.status === 'In Progress') {
          runningLines++;
          activeProducedUnits += getProducedCount(active);
          queuedOrdersCount += Math.max(0, sequence.length - 1);
        } else if (active.status === 'Maintenance') {
          maintenanceLines++;
          activeProducedUnits += getProducedCount(active);
          queuedOrdersCount += Math.max(0, sequence.length - 1);
        } else {
          queuedOrdersCount += sequence.length;
        }
      }
    });

    return {
      runningLines,
      totalMachines: machines.length,
      maintenanceLines,
      queuedOrdersCount,
      activeProducedUnits
    };
  }, [machines, orders]);

  const getMachineCategory = (mach: ProductionMachine): 'injection' | 'blow' | 'label' => {
    if (mach.type) return mach.type;
    const nameUpper = mach.name.toUpperCase();
    if (nameUpper.includes('BLOW') || mach.m.toUpperCase().startsWith('B')) return 'blow';
    if (nameUpper.includes('LABEL') || mach.m.toUpperCase().startsWith('L')) return 'label';
    return 'injection';
  };

  const getMachineStatus = (mach: ProductionMachine): 'running' | 'maintenance' | 'idle' => {
    const sequence = getMachineSequence(mach.name);
    const active = sequence.length > 0 ? sequence[0] : null;
    if (!active) return 'idle';
    if (active.status === 'In Progress') return 'running';
    if (active.status === 'Maintenance') return 'maintenance';
    return 'idle';
  };

  const categoryCounts = React.useMemo(() => {
    let injection = 0;
    let blow = 0;
    let label = 0;
    machines.forEach(m => {
      const cat = getMachineCategory(m);
      if (cat === 'injection') injection++;
      else if (cat === 'blow') blow++;
      else if (cat === 'label') label++;
    });
    return { all: machines.length, injection, blow, label };
  }, [machines]);

  const statusCounts = React.useMemo(() => {
    let running = 0;
    let idle = 0;
    let maintenance = 0;
    machines.forEach(m => {
      const st = getMachineStatus(m);
      if (st === 'running') running++;
      else if (st === 'maintenance') maintenance++;
      else idle++;
    });
    return { all: machines.length, running, idle, maintenance };
  }, [machines, orders]);

  const getFilteredMachines = () => {
    const sorted = getSortedMachines();
    return sorted.filter(mach => {
      if (machineCategoryFilter !== 'all') {
        const cat = getMachineCategory(mach);
        if (cat !== machineCategoryFilter) return false;
      }
      if (machineStatusFilter !== 'all') {
        const st = getMachineStatus(mach);
        if (st !== machineStatusFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sequence = getMachineSequence(mach.name);
        const machMatch = mach.name.toLowerCase().includes(q) || 
                          mach.m.toLowerCase().includes(q) || 
                          (mach.moldName && mach.moldName.toLowerCase().includes(q));
        const orderMatch = sequence.some(o => 
          o.itemName.toLowerCase().includes(q) || 
          o.id.toLowerCase().includes(q) ||
          (o.granulesType && o.granulesType.toLowerCase().includes(q))
        );
        if (!machMatch && !orderMatch) return false;
      }
      return true;
    });
  };

  const renderMachineCard = (mach: ProductionMachine) => {
    const sequence = getMachineSequence(mach.name);
    const activeOrder = sequence.length > 0 ? sequence[0] : null;
    const isRunning = activeOrder?.status === 'In Progress';
    const isPaused = activeOrder?.status === 'Maintenance';
    const queuedOrders = (activeOrder && (isRunning || isPaused)) ? sequence.slice(1) : sequence;
    const cat = getMachineCategory(mach);

    const produced = activeOrder ? getProducedCount(activeOrder) : 0;
    const target = activeOrder?.quantity || 0;
    const pct = (!activeOrder?.isContinuous && target > 0) ? Math.min(100, Math.round((produced / target) * 100)) : 0;

    return (
      <div 
        key={mach.id}
        className={`bg-surface border rounded-2xl flex flex-col overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md ${
          isRunning 
            ? 'border-emerald-500/40 shadow-emerald-500/5' 
            : isPaused 
            ? 'border-rose-500/40 shadow-rose-500/5' 
            : 'border-divider/70 hover:border-divider'
        }`}
      >
        {/* Machine Card Header */}
        <div className="p-3.5 border-b border-divider/60 bg-surface-elevated/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-xs ${
              cat === 'injection' 
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' 
                : cat === 'blow' 
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' 
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>
              {mach.m}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-primary">{mach.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-surface-elevated text-tertiary border border-divider-subtle">
                  {cat === 'injection' ? 'INJ' : cat === 'blow' ? 'BLOW' : 'LABEL'}
                </span>
              </div>
              <div className="text-[11px] text-tertiary flex items-center gap-1.5 mt-0.5">
                <span className="font-mono">{mach.currentAmps || 32}A</span>
                <span>•</span>
                <span>{mach.rateMethod === 'hourly' ? `${mach.hourlyRate?.toLocaleString() || 2400} bph` : `${mach.cycleTime || 12}s (${mach.cavities || 1} cav)`}</span>
              </div>
            </div>
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isRunning 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : isPaused 
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                : 'bg-surface-elevated text-tertiary border-divider'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : isPaused ? 'bg-rose-400' : 'bg-slate-400'
              }`} />
              <span>{isRunning ? 'Running' : isPaused ? 'Paused' : 'Idle'}</span>
            </span>
          </div>
        </div>

        {/* Installed Mold Bar */}
        <div 
          onClick={() => {
            setViewingMoldDetails({
              machId: mach.id,
              machName: mach.name,
              machType: mach.type,
              moldName: mach.moldName || 'Default Mold',
              activeOrderId: activeOrder?.id || null,
              activeOrderName: activeOrder?.itemName || null,
              rateMethod: mach.rateMethod || (cat === 'injection' ? 'cycle' : 'hourly'),
              cycleTime: mach.cycleTime || 12,
              cavities: mach.cavities || 1,
              hourlyRate: mach.hourlyRate || (cat === 'blow' ? 2400 : cat === 'label' ? 3500 : 1000),
              currentAmps: mach.currentAmps || 32
            });
          }}
          className="px-3.5 py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border-b border-divider/60 flex items-center justify-between text-xs cursor-pointer transition-colors group"
          title="Click to view & edit installed mold specifications"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform shrink-0" />
            <span className="text-indigo-300 font-bold truncate">
              <bdi dir="rtl">{mach.moldName || 'No Mold Installed'}</bdi>
            </span>
          </div>
          <span className="text-[10px] text-tertiary group-hover:text-secondary flex items-center gap-1 shrink-0 font-medium">
            <span>Specs</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Active Production Body */}
        <div className="p-3.5 flex-1 flex flex-col gap-3">
          {activeOrder && (isRunning || isPaused) ? (
            <div className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
              isRunning ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-divider text-tertiary">
                      {activeOrder.id}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-purple-400">
                      Active Job
                    </span>
                  </div>
                  <h4 
                    onClick={() => setViewingOrder(activeOrder)}
                    className="font-bold text-sm text-primary hover:text-purple-400 cursor-pointer line-clamp-1 transition-colors"
                  >
                    <bdi dir="rtl">{activeOrder.itemName}</bdi>
                  </h4>
                  <p className="text-[11px] text-tertiary mt-0.5 line-clamp-1">
                    <bdi dir="rtl">{activeOrder.granulesType} {activeOrder.colorant ? `• ${activeOrder.colorant}` : ''}</bdi>
                  </p>
                </div>

                {/* Progress Mini Meter */}
                <div className="text-right shrink-0">
                  {activeOrder.isContinuous ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                      <Infinity className="w-3.5 h-3.5" /> Run
                    </span>
                  ) : (
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {pct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar & Quantity Counter */}
              <div>
                <div className="flex justify-between text-[11px] font-medium text-secondary mb-1">
                  <span>Produced: <strong className="text-primary font-mono">{produced.toLocaleString()}</strong></span>
                  <span>Target: <strong className="text-primary font-mono">{activeOrder.isContinuous ? '∞' : target.toLocaleString()}</strong></span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden border border-divider-subtle">
                  {activeOrder.isContinuous ? (
                    <div className="h-full w-full bg-gradient-to-r from-purple-500/30 via-purple-400 to-purple-500/30" />
                  ) : (
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Quick Controller Actions */}
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-divider/40">
                <button
                  type="button"
                  onClick={() => setViewingOrder(activeOrder)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-secondary hover:text-primary bg-surface hover:bg-surface-elevated border border-divider rounded-lg transition cursor-pointer"
                >
                  Diagnostic HUD
                </button>

                <div className="flex items-center gap-1">
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={(e) => handlePauseOrder(activeOrder.id, e)}
                      className="p-1.5 text-amber-400 hover:bg-amber-500/15 rounded-lg transition cursor-pointer"
                      title="Pause Order"
                    >
                      <PauseCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleResumeOrder(activeOrder.id, e)}
                      className="p-1.5 text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition cursor-pointer"
                      title="Resume Order"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCompleteOrder(activeOrder.id, e)}
                    className="p-1.5 text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition cursor-pointer"
                    title="Complete Order"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standby Card */
            <div className="p-4 rounded-xl border border-dashed border-divider bg-surface-elevated/20 text-center flex flex-col items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <p className="text-xs font-semibold text-secondary">Line on Standby</p>
              <p className="text-[11px] text-tertiary">No active job currently on floor</p>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => openOrderModal(null, mach.name)}
                  className="mt-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dispatch Job</span>
                </button>
              )}
            </div>
          )}

          {/* Queued Sequence Section */}
          <div className="mt-auto pt-2 border-t border-divider/50">
            <div className="flex items-center justify-between text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                Queue Stack ({queuedOrders.length})
              </span>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => handleAddDirectQueueOrder(mach.name)}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 normal-case text-xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Run
                </button>
              )}
            </div>

            {queuedOrders.length === 0 ? (
              <div className="py-2.5 text-center text-[11px] text-tertiary border border-dashed border-divider/60 rounded-lg">
                Queue empty
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                {queuedOrders.slice(0, 3).map((qOrder, idx) => (
                  <div
                    key={qOrder.id}
                    className="p-2 bg-surface-elevated/40 hover:bg-surface-elevated/80 border border-divider/60 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-purple-500/15 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p 
                          onClick={() => setViewingOrder(qOrder)}
                          className="font-semibold text-secondary hover:text-purple-400 cursor-pointer truncate"
                        >
                          <bdi dir="rtl">{qOrder.itemName}</bdi>
                        </p>
                        <p className="text-[10px] text-tertiary font-mono">
                          {qOrder.quantity.toLocaleString()} {getOrderUnit(qOrder)}
                        </p>
                      </div>
                    </div>

                    {/* Sequence swap arrows */}
                    {!isViewer && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => changeQueueSequence(qOrder.id, 'left')}
                          className="p-1 hover:bg-surface rounded text-tertiary hover:text-primary disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === queuedOrders.length - 1}
                          onClick={() => changeQueueSequence(qOrder.id, 'right')}
                          className="p-1 hover:bg-surface rounded text-tertiary hover:text-primary disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {queuedOrders.length > 3 && (
                  <p className="text-[10px] text-center text-tertiary pt-1">
                    +{queuedOrders.length - 3} more queued runs...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 text-primary">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-4 border-b border-divider/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              Production Scheduler & Queues
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                MES & Sequence Matrix
              </span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Real-time machine sequencing, cycle analytics, and dynamic infinite production queue tracking.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" 
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-amber-600/20 cursor-pointer"
            title="Bulk update machine cycles, cavities, and bottles/hr rates via copy & paste or one-button batch updater"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>Batch Speeds & Cavities</span>
            <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded font-mono">Batch</span>
          </button>

          <button type="button" 
            onClick={() => setIsMachineSetupOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-elevated text-secondary hover:text-primary border border-divider rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Machines Setup</span>
          </button>
          
          <button type="button" 
            onClick={handleExportAllOrders}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-elevated text-secondary hover:text-primary border border-divider rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Export all production orders and details to Excel"
          >
            <Download className="w-3.5 h-3.5 text-tertiary" />
            <span>Export Details</span>
          </button>
          
          <button type="button" 
            onClick={handleExportMatrixExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Download Spreadsheet Matrix in Excel (.xlsx) exactly as displayed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Grid (Excel)</span>
          </button>

          {!isViewer && (
            <button type="button" 
              onClick={() => openOrderModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-purple-600/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Order / Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Active Lines Running</p>
            <p className="text-lg font-bold text-purple-400 tracking-tight mt-0.5">
              {metrics.runningLines} <span className="text-xs font-normal text-tertiary">/ {metrics.totalMachines} Lines</span>
            </p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Queued Production Runs</p>
            <p className="text-lg font-bold text-blue-400 tracking-tight mt-0.5">
              {metrics.queuedOrdersCount} <span className="text-xs font-normal text-tertiary">Scheduled</span>
            </p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Active Output Produced</p>
            <p className="text-lg font-bold text-emerald-400 tracking-tight mt-0.5">
              {metrics.activeProducedUnits.toLocaleString()} <span className="text-xs font-normal text-tertiary">Units</span>
            </p>
          </div>
        </div>

        <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Maintenance / Paused</p>
            <p className="text-lg font-bold text-rose-400 tracking-tight mt-0.5">
              {metrics.maintenanceLines} <span className="text-xs font-normal text-tertiary">Lines</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-divider/70 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Navigation & Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-divider/60 bg-surface-elevated/20 shrink-0">
          {/* Segmented Capsule Tabs */}
          <div className="flex flex-wrap items-center p-1 bg-canvas/80 border border-divider/80 rounded-xl gap-0.5">
            <button type="button" 
              onClick={() => setViewMode('Spreadsheet')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'Spreadsheet'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                  : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Queue Matrix</span>
            </button>
            <button type="button" 
              onClick={() => setViewMode('Board')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'Board'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                  : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Machine Cockpit</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                viewMode === 'Board' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-tertiary'
              }`}>
                {machines.length}
              </span>
            </button>
            <button type="button" 
              onClick={() => setViewMode('ActiveList')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'ActiveList'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                  : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Active Orders</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                viewMode === 'ActiveList' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-tertiary'
              }`}>
                {orders.filter(activeNonArchiveMatches).length}
              </span>
            </button>
            <button type="button" 
              onClick={() => setViewMode('History')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'History'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                  : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Archive / History</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                viewMode === 'History' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-tertiary'
              }`}>
                {orders.filter(archiveMatches).length}
              </span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex gap-2 items-center">
            <div className="relative w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-quaternary" />
              <input 
                type="text"
                placeholder="Search specs, item names, machines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-divider rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none transition-all text-secondary placeholder:text-quinary"
              />
            </div>
            
            {(viewMode === 'ActiveList' || viewMode === 'History') && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-canvas border border-divider rounded-xl text-xs px-2.5 py-1.5 outline-none text-secondary focus:border-purple-500"
              >
                <option value="All">All Statuses</option>
                {viewMode === 'ActiveList' ? (
                  <>
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Maintenance">Maintenance</option>
                  </>
                ) : (
                  <>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Machine Category & Status Filter Bar for Matrix & Board modes */}
        {(viewMode === 'Spreadsheet' || viewMode === 'Board') && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-surface-elevated/10 border-b border-divider/60 text-xs shrink-0">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-purple-400" /> Lines:
              </span>
              <button
                type="button"
                onClick={() => setMachineCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  machineCategoryFilter === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
                }`}
              >
                All Lines ({categoryCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setMachineCategoryFilter('injection')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineCategoryFilter === 'injection'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
                }`}
              >
                <Cpu className="w-3 h-3 text-purple-400" />
                Injection MK ({categoryCounts.injection})
              </button>
              <button
                type="button"
                onClick={() => setMachineCategoryFilter('blow')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineCategoryFilter === 'blow'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
                }`}
              >
                <Zap className="w-3 h-3 text-blue-400" />
                Blow Lines ({categoryCounts.blow})
              </button>
              <button
                type="button"
                onClick={() => setMachineCategoryFilter('label')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineCategoryFilter === 'label'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'text-tertiary hover:text-primary hover:bg-surface-elevated/50'
                }`}
              >
                <Tag className="w-3 h-3 text-amber-400" />
                Labeling ({categoryCounts.label})
              </button>
            </div>

            {/* Status Toggles */}
            <div className="flex items-center gap-1 bg-canvas p-1 rounded-xl border border-divider/80">
              <button
                type="button"
                onClick={() => setMachineStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  machineStatusFilter === 'all'
                    ? 'bg-surface-elevated text-primary font-bold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('running')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineStatusFilter === 'running'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Running ({statusCounts.running})
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('idle')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineStatusFilter === 'idle'
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30 font-bold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Idle ({statusCounts.idle})
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('maintenance')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  machineStatusFilter === 'maintenance'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shadow-xs'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                Paused ({statusCounts.maintenance})
              </button>
            </div>
          </div>
        )}

        {/* 1. SPREADSHEET MATRIX VIEW MODE */}
        {viewMode === 'Spreadsheet' && (() => {
          const sortedMachinesList = getFilteredMachines();
          const activeMachines = sortedMachinesList.filter(mach => {
            const sequence = getMachineSequence(mach.name);
            const activeOrder = sequence.length > 0 ? sequence[0] : null;
            return activeOrder && (activeOrder.status === 'In Progress' || activeOrder.status === 'Maintenance');
          });
          const inactiveMachines = sortedMachinesList.filter(mach => {
            const sequence = getMachineSequence(mach.name);
            const activeOrder = sequence.length > 0 ? sequence[0] : null;
            return !activeOrder || (activeOrder.status !== 'In Progress' && activeOrder.status !== 'Maintenance');
          });

          // Dynamic calculation of queue depth across all machines
          const maxPlannedAcrossAll = Math.max(
            0,
            ...sortedMachinesList.map(mach => {
              const sequence = getMachineSequence(mach.name);
              const activeOrder = sequence.length > 0 ? sequence[0] : null;
              const pq = (activeOrder && ['In Progress', 'Maintenance'].includes(activeOrder.status))
                ? sequence.slice(1)
                : sequence;
              return pq.length;
            })
          );

          // Total slots count: always at least 5 slots, plus 1 empty slot after the deepest machine queue, plus user-added slots
          const totalSlotsCount = Math.max(5, maxPlannedAcrossAll + 1 + extraQueueColumns);
          const slotIndices = Array.from({ length: totalSlotsCount }, (_, i) => i);

          const renderTableHeader = () => (
            <thead>
              <tr className="bg-surface-elevated/95 backdrop-blur-md text-secondary border-b border-divider text-[11px] font-bold uppercase tracking-wider select-none sticky top-0 z-20 shadow-xs">
                <th className="text-center px-3 py-3.5 border-r border-divider/60 font-extrabold w-[64px] text-tertiary sticky left-0 z-30 bg-surface-elevated/95 backdrop-blur-md">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>M</span>
                  </div>
                </th>
                <th className="text-center px-6 py-3.5 border-r border-divider/60 font-bold min-w-[190px] text-indigo-300 sticky left-[64px] z-30 bg-surface-elevated/95 backdrop-blur-md">
                  <div className="flex items-center justify-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mold / Tooling</span>
                  </div>
                </th>
                <th className="text-center px-6 py-3.5 border-r border-divider/60 font-bold min-w-[240px] text-emerald-400">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Current Active Order</span>
                  </div>
                </th>
                <th className="text-center px-4 py-3.5 border-r border-divider/60 font-bold min-w-[125px] text-secondary">
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-tertiary" />
                    <span>Est. Date</span>
                  </div>
                </th>
                <th className="text-center px-4 py-3.5 border-r border-divider/60 font-bold min-w-[125px] text-secondary">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-tertiary" />
                    <span>Est. Time</span>
                  </div>
                </th>
                {slotIndices.map((slotIdx) => (
                  <th key={slotIdx} className="text-center px-5 py-3.5 border-r border-divider/60 font-bold min-w-[250px] text-secondary whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5 bg-surface/60 border border-divider/80 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        #{slotIdx + 1}
                      </span>
                      <span>Next-Order</span>
                    </div>
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-bold w-[70px] text-tertiary bg-surface-elevated/40" title="Add extra column to schedule (+ إضافة خانة)">
                  <button
                    type="button"
                    onClick={() => setExtraQueueColumns(prev => prev + 1)}
                    className="p-1.5 text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 rounded-lg transition-all cursor-pointer font-bold text-xs flex items-center justify-center mx-auto shadow-xs"
                    title="Add another Next-Order column (+ إضافة خانة)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
          );

          const renderMachineRow = (mach: any) => {
            // Sequence: active non-archive orders
            const sequence = getMachineSequence(mach.name);
            
            // The first item is active run
            const activeOrder = sequence.length > 0 ? sequence[0] : null;

            // Remaining are queued Next-Orders.
            const plannedQueue = (activeOrder && ['In Progress', 'Maintenance'].includes(activeOrder.status))
              ? sequence.slice(1)
              : sequence;

            let dateDisplay = '-';
            let timeDisplay = '';
            let isMaintenanceMode = false;
            let isIdleMode = false;

            if (activeOrder) {
              if (activeOrder.status === 'In Progress') {
                const expectedEnd = getExpectedEndDateTime(activeOrder);
                if (expectedEnd) {
                  dateDisplay = formatDateFromObject(expectedEnd);
                  timeDisplay = formatTimeFromObject(expectedEnd);
                }
              } else if (activeOrder.status === 'Maintenance') {
                isMaintenanceMode = true;
                dateDisplay = '-';
              } else {
                isIdleMode = true;
                dateDisplay = '-';
              }
            } else {
              isIdleMode = true;
              dateDisplay = '-';
            }

            const isWorking = activeOrder && activeOrder.status === 'In Progress';

            return (
              <tr key={mach.id} className="hover:bg-surface-elevated/25 transition-all font-medium text-sm text-primary">
                {/* Column A: M */}
                <td className="text-center px-3 py-3 border-r border-divider/60 bg-surface/95 backdrop-blur-sm sticky left-0 z-10 font-mono font-bold">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-elevated border border-divider text-primary font-bold text-xs shadow-xs">
                    {mach.m}
                  </span>
                </td>
                
                {/* Column B1: Mold Name Details Popup Button */}
                <td className="text-center px-4 py-3 border-r border-divider/60 min-w-[190px] bg-surface/95 backdrop-blur-sm sticky left-[64px] z-10">
                  <button type="button"
                    onClick={() => {
                      const activeOrd = activeOrder;
                      const isBlowMach = mach.type === 'blow' || mach.name.toUpperCase().includes('BLOW');
                      const isLabelMach = mach.type === 'label' || mach.name.toUpperCase().includes('LABEL');
                      const defaultRateMethod = (isBlowMach || isLabelMach) ? 'hourly' : 'cycle';
                      
                      setViewingMoldDetails({
                        machId: mach.id,
                        machName: mach.name,
                        machType: mach.type || (isBlowMach ? 'blow' : isLabelMach ? 'label' : 'injection'),
                        moldName: mach.moldName || `Mould ${mach.name}`,
                        activeOrderId: activeOrd ? activeOrd.id : null,
                        activeOrderName: activeOrd ? activeOrd.itemName : null,
                        rateMethod: activeOrd?.productionRateMethod || mach.rateMethod || defaultRateMethod,
                        cycleTime: activeOrd ? (activeOrd.cycleTime || mach.cycleTime || 12) : (mach.cycleTime || 12),
                        cavities: activeOrd ? (activeOrd.cavities || mach.cavities || 1) : (mach.cavities || 1),
                        hourlyRate: activeOrd ? (activeOrd.hourlyRate || mach.hourlyRate || (isBlowMach ? 2400 : isLabelMach ? 3500 : 1000)) : (mach.hourlyRate || (isBlowMach ? 2400 : isLabelMach ? 3500 : 1000)),
                        currentAmps: mach.currentAmps || 32
                      });
                    }}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-indigo-200 transition-all cursor-pointer max-w-[170px] shadow-xs"
                    title="Click to view mold cavity, cycle & hourly speed details"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform shrink-0" />
                    <bdi dir="rtl" className="truncate text-xs font-bold font-mono">
                      {mach.moldName || `Mould ${mach.name}`}
                    </bdi>
                  </button>
                </td>

                {/* Column B2: Current Working Order */}
                <td className="text-center px-4 py-3 border-r border-divider/60 font-semibold text-primary min-w-[240px]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {isWorking ? (
                      <>
                        <div 
                          className="flex items-center justify-center gap-2 cursor-pointer hover:text-purple-300 transition-colors" 
                          onClick={() => setViewingOrder(activeOrder)}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-xs shadow-emerald-400/50"></span>
                          <bdi dir="rtl" className="block text-primary font-bold text-sm line-clamp-1 max-w-[190px]">
                            {activeOrder.itemName}
                          </bdi>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full shadow-xs">
                          <span className="text-emerald-400/80 font-medium text-[10px]">Produced:</span>
                          {activeOrder.isContinuous ? (
                            <span className="text-purple-300 flex items-center gap-1">
                              {getProducedCount(activeOrder).toLocaleString()} {getOrderUnit(activeOrder)} <Infinity className="w-3 h-3 text-purple-400" />
                            </span>
                          ) : (
                            <span>
                              {getProducedCount(activeOrder).toLocaleString()} <span className="text-emerald-500/70 font-normal">/ {activeOrder.quantity?.toLocaleString()}</span> {getOrderUnit(activeOrder)}
                            </span>
                          )}
                        </div>
                      </>
                    ) : isMaintenanceMode ? (
                      <>
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-rose-300 transition-colors" onClick={() => setViewingOrder(activeOrder)}>
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
                          <bdi dir="rtl" className="block text-rose-300 font-bold text-sm">
                            {activeOrder.itemName} <span className="text-xs font-normal text-rose-400/80">(صيانة)</span>
                          </bdi>
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full">
                          <span>Produced: {getProducedCount(activeOrder).toLocaleString()} {getOrderUnit(activeOrder)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated/40 border border-divider/60 text-quinary text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        <span className="italic">Idle (جاهز)</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Column C: Date */}
                <td className="text-center px-4 py-3 border-r border-divider/60 font-semibold text-secondary font-mono text-xs min-w-[125px]">
                  {dateDisplay !== '-' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated/50 border border-divider/50">
                      {dateDisplay}
                    </span>
                  ) : (
                    <span className="text-quinary">-</span>
                  )}
                </td>

                {/* Column D: TIME */}
                <td className="text-center px-4 py-3 border-r border-divider/60 font-mono text-xs min-w-[125px]">
                  {timeDisplay ? (
                    <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{timeDisplay}</span>
                    </div>
                  ) : isMaintenanceMode ? (
                    <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>صيانة</span>
                    </div>
                  ) : (
                    <span className="text-quinary text-xs">-</span>
                  )}
                </td>

                {/* Column E+: Dynamic Next-Order Columns */}
                {slotIndices.map((slotIndex) => {
                  const order = plannedQueue[slotIndex];
                  const hasOrder = !!order;

                  return (
                    <td 
                      key={slotIndex} 
                      className="px-3 py-2.5 border-r border-divider/60 relative group/cell text-center align-middle transition-colors hover:bg-surface-elevated/20"
                    >
                      {hasOrder ? (
                        <div className="relative flex items-center justify-center min-h-[42px] w-full">
                          {/* Item Details Block */}
                          <div 
                            className="w-full text-center px-3 py-2 rounded-xl bg-purple-500/5 group-hover/cell:bg-purple-500/10 border border-purple-500/20 group-hover/cell:border-purple-500/40 transition-all cursor-pointer shadow-2xs"
                            onClick={() => setViewingOrder(order)}
                            title={`Click to view specifications of ${order.itemName}`}
                          >
                            <bdi dir="rtl" className="line-clamp-2 block text-center font-bold text-xs text-primary group-hover/cell:text-purple-300 transition-colors">
                              {order.itemName}
                            </bdi>
                          </div>

                          {/* Floating Action Controls on Hover */}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-all shrink-0 bg-surface/95 backdrop-blur-md border border-divider/80 rounded-xl px-1.5 py-1 shadow-xl z-10">
                            {slotIndex === 0 && !isWorking && !isMaintenanceMode && (
                              <button type="button" 
                                onClick={(e) => { e.stopPropagation(); handleStartOrder(order.id, e); }}
                                className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg cursor-pointer transition-colors"
                                title="Start Production Run (بدء التشغيل الفوري)"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button type="button" 
                              onClick={(e) => { e.stopPropagation(); changeQueueSequence(order.id, 'left'); }}
                              disabled={slotIndex === 0}
                              className="p-1 text-tertiary hover:text-purple-400 rounded-lg hover:bg-surface-elevated disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move Left (Prioritize)"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" 
                              onClick={(e) => { e.stopPropagation(); openOrderModal(order); }}
                              className="p-1 text-tertiary hover:text-blue-400 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                              title="Edit Order Properties"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" 
                              onClick={(e) => { e.stopPropagation(); changeQueueSequence(order.id, 'right'); }}
                              disabled={slotIndex === plannedQueue.length - 1}
                              className="p-1 text-tertiary hover:text-purple-400 rounded-lg hover:bg-surface-elevated disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move Right (De-prioritize)"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleAddDirectQueueOrder(mach.name)}
                          className="w-full py-2 px-2 border border-dashed border-divider/50 hover:border-purple-500/40 rounded-xl text-quinary hover:text-purple-300 hover:bg-purple-500/5 transition-all text-xs flex items-center justify-center gap-1 cursor-pointer font-medium"
                          title={`Click to schedule next order on ${mach.name}`}
                        >
                          <Plus className="w-3 h-3 text-quinary group-hover/cell:text-purple-400" />
                          <span className="text-[11px]">لا توجد طلبية</span>
                        </button>
                      )}
                    </td>
                  );
                })}
                {/* Column to schedule next order for this machine */}
                <td className="px-2 py-2.5 border-r border-divider/60 text-center bg-surface/20">
                  <button
                    type="button"
                    onClick={() => handleAddDirectQueueOrder(mach.name)}
                    className="p-1.5 text-quaternary hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                    title={`Quickly schedule next order for ${mach.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          };

          return (
            <div className="flex-1 overflow-auto bg-surface/10 p-5 space-y-6">
              {/* Queue Depth & Slot Expansion Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-purple-500/5 via-surface to-surface border border-divider/80 p-3.5 rounded-2xl shadow-xs">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 px-3 py-1.5 rounded-xl text-purple-300 font-semibold">
                    <Infinity className="w-4 h-4 text-purple-400" />
                    <span>Infinite Matrix: Showing {totalSlotsCount} Next-Order queue columns</span>
                  </div>
                  <span className="text-tertiary text-xs">
                    (Columns expand automatically with queued production depth)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraQueueColumns(prev => prev + 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl transition cursor-pointer shadow-xs"
                    title="Add extra blank column to schedule (+ إضافة خانة بالجدول)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column (+ خانة)</span>
                  </button>
                  {extraQueueColumns > 0 && (
                    <button
                      type="button"
                      onClick={() => setExtraQueueColumns(0)}
                      className="px-2.5 py-1.5 text-xs text-tertiary hover:text-primary bg-surface hover:bg-surface-elevated border border-divider rounded-xl transition cursor-pointer"
                    >
                      Reset Columns
                    </button>
                  )}
                </div>
              </div>

              {/* Active Lines Panel */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Active Production Lines ({activeMachines.length})
                    </h3>
                  </div>
                  <span className="text-xs text-tertiary">Real-time dynamic cycle timing active</span>
                </div>
                {activeMachines.length === 0 ? (
                  <div className="p-8 text-center text-sm border border-dashed border-divider bg-surface/20 rounded-2xl text-tertiary">
                    No active machines currently running production.
                  </div>
                ) : (
                  <div className="min-w-max border border-divider/70 rounded-2xl overflow-hidden shadow-sm bg-surface">
                    <table className="w-full text-center border-collapse">
                      {renderTableHeader()}
                      <tbody className="divide-y divide-divider/60 font-sans">
                        {activeMachines.map(renderMachineRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Inactive Lines Panel */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 bg-surface-elevated/70 border border-divider px-3.5 py-1.5 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                      Inactive / Idle Lines ({inactiveMachines.length})
                    </h3>
                  </div>
                  <span className="text-xs text-tertiary">Machines ready for new job dispatch</span>
                </div>
                {inactiveMachines.length === 0 ? (
                  <div className="p-8 text-center text-sm border border-dashed border-divider bg-surface/20 rounded-2xl text-tertiary">
                    All machines are active. No idle lines.
                  </div>
                ) : (
                  <div className="min-w-max border border-divider/70 rounded-2xl overflow-hidden shadow-sm bg-surface/40">
                    <table className="w-full text-center border-collapse">
                      {renderTableHeader()}
                      <tbody className="divide-y divide-divider/60 font-sans">
                        {inactiveMachines.map(renderMachineRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Directives Footer legend */}
              <div className="mt-4 p-3.5 bg-surface-elevated/30 rounded-xl border border-divider-subtle max-w-2xl text-xs text-tertiary flex items-start gap-2.5">
                <span className="text-purple-400 font-bold">🗒️ Production Guide:</span>
                <p className="leading-relaxed">
                  Each row displays a production machine. The **Date** and **TIME** show dynamic estimated completion for the active **In Progress** run, adjusting in real time with cavity and cycle speeds.
                  Queued jobs flow through **Next-Order #1, #2, #3... to infinite depth**. Hover over any order cell to prioritize or edit!
                </p>
              </div>
            </div>
          );
        })()}

        {/* 2. MACHINE BOARD COCKPIT VIEW MODE */}
        {viewMode === 'Board' && (
          <div className="flex-1 overflow-y-auto bg-surface/10 p-5">
            {getFilteredMachines().length === 0 ? (
              <div className="p-12 text-center text-sm border border-dashed border-divider bg-surface/20 rounded-2xl text-tertiary">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                  <Cpu className="w-9 h-9 mb-3 text-tertiary/40" />
                  <p className="font-semibold text-secondary text-sm">No Machines Found</p>
                  <p className="text-xs text-tertiary mt-1">No production lines match your current category or status filter.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {getFilteredMachines().map(renderMachineCard)}
              </div>
            )}
          </div>
        )}

        {/* 3. ACTIVE ORDERS LIST VIEW */}
        {viewMode === 'ActiveList' && (
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-divider text-[11px] font-bold uppercase tracking-wider text-tertiary bg-surface-elevated/40">
                  <th className="text-center px-6 py-3.5 font-bold">Order Details</th>
                  <th className="text-center px-6 py-3.5 font-bold">Schedule & Status</th>
                  <th className="text-center px-6 py-3.5 font-bold">Materials & Packaging</th>
                  <th className="text-center px-6 py-3.5 font-bold">Machine & Output</th>
                  <th className="text-center px-6 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60 bg-transparent">
                {getActiveOrdersList().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-tertiary">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <PackageSearch className="w-9 h-9 mb-3 text-divider-strong" />
                        <p className="font-semibold text-secondary text-sm">No Active Production Orders</p>
                        <p className="text-xs text-tertiary mt-1">No active or planned orders matching your filters were found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  getActiveOrdersList().map((order) => {
                    return (
                      <tr key={order.id} className="hover:bg-surface-elevated/25 transition-colors group">
                        <td className="text-center px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 border border-divider-subtle shadow-xs">
                              {getStatusIcon(order.status)}
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-primary cursor-pointer hover:text-purple-400 focus:outline-none shrink-0 line-clamp-1 flex items-center gap-2" onClick={() => setViewingOrder(order)}>
                                <bdi dir="rtl" className="block">{order.itemName}</bdi>
                              </div>
                              <div className="text-xs text-tertiary mt-0.5 font-mono">
                                {order.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                              {order.status}
                            </span>
                            <span className="text-xs text-tertiary flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" /> {order.startDate} to {order.endDate}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-6 py-4">
                          <div className="text-sm text-secondary truncate max-w-[200px] mx-auto font-medium" title={order.granulesType}>
                            <bdi dir="rtl" className="block">{order.granulesType}</bdi>
                          </div>
                          <div className="text-xs text-tertiary mt-1 truncate max-w-[200px] mx-auto" title={order.packagingDetails}>
                            <bdi dir="rtl" className="block">{order.packagingDetails}</bdi>
                          </div>
                        </td>
                        <td className="text-center px-6 py-4">
                          <div className="text-sm font-semibold text-secondary flex items-center justify-center gap-1.5 truncate max-w-[170px] mx-auto">
                            <Settings className="w-3.5 h-3.5 text-tertiary" /> {order.assignedMachine}
                          </div>
                          <div className="text-xs text-tertiary mt-1 font-medium">
                            {order.isContinuous ? (
                              <span className="text-purple-400 font-bold flex items-center justify-center gap-1">
                                <Infinity className="w-3.5 h-3.5" /> Continuous (∞)
                              </span>
                            ) : (
                              `${order.quantity.toLocaleString()} ${getOrderUnit(order)}`
                            )}
                          </div>
                          <div className="max-w-[200px] mx-auto mt-1">
                            <ProductionProgressBar order={order} />
                          </div>
                        </td>
                        <td className="text-center px-6 py-4">
                          <div className="flex justify-center items-center gap-1">
                            {!isViewer && (
                              <>
                                <button type="button" 
                                  onClick={() => openOrderModal(order)}
                                  className="p-2 hover:bg-surface-elevated rounded-xl text-tertiary hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                                  aria-label="Edit Order"
                                  title="Edit Order"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button type="button" 
                                  onClick={(e) => handleDeleteOrder(order.id, e)}
                                  className="p-2 hover:bg-rose-500/10 rounded-xl text-tertiary hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                                  aria-label="Delete Order"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ARCHIVED COMPLETED ORDERS LIST */}
        {viewMode === 'History' && (
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-divider text-[11px] font-bold uppercase tracking-wider text-tertiary bg-surface-elevated/40">
                  <th className="text-center px-6 py-3.5 font-bold">Order Details</th>
                  <th className="text-center px-6 py-3.5 font-bold">Schedule & Status</th>
                  <th className="text-center px-6 py-3.5 font-bold">Materials & Packaging</th>
                  <th className="text-center px-6 py-3.5 font-bold">Machine & Output</th>
                  <th className="text-center px-6 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60 bg-transparent">
                {getArchiveOrdersList().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-tertiary">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <PackageSearch className="w-9 h-9 mb-3 text-divider-strong" />
                        <p className="font-semibold text-secondary text-sm">No Archived Orders</p>
                        <p className="text-xs text-tertiary mt-1">No completed or cancelled orders in the historical archive.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  getArchiveOrdersList().map((order) => (
                    <tr key={order.id} className="hover:bg-surface-elevated/25 transition-colors group">
                      <td className="text-center px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 border border-divider-subtle shadow-xs">
                            {getStatusIcon(order.status)}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-primary cursor-pointer hover:text-purple-400 focus:outline-none shrink-0 line-clamp-1" onClick={() => setViewingOrder(order)}>
                              <bdi dir="rtl" className="block">{order.itemName}</bdi>
                            </div>
                            <div className="text-xs text-tertiary mt-0.5 font-mono">
                              {order.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-xs text-tertiary flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" /> {order.startDate} to {order.endDate}
                          </span>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4">
                        <div className="text-sm font-medium text-secondary truncate max-w-[200px] mx-auto" title={order.granulesType}>
                          <bdi dir="rtl" className="block">{order.granulesType}</bdi>
                        </div>
                        <div className="text-xs text-tertiary mt-1 truncate max-w-[200px] mx-auto" title={order.packagingDetails}>
                          <bdi dir="rtl" className="block">{order.packagingDetails}</bdi>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4">
                        <div className="text-sm font-semibold text-secondary flex items-center justify-center gap-1.5 truncate max-w-[170px] mx-auto">
                          <Settings className="w-3.5 h-3.5 text-tertiary" /> {order.assignedMachine}
                        </div>
                        <div className="text-xs text-tertiary mt-1 font-medium">
                          {order.isContinuous ? (
                            <span className="text-purple-400 font-bold flex items-center justify-center gap-1">
                              <Infinity className="w-3.5 h-3.5" /> Continuous (∞)
                            </span>
                          ) : (
                            `${order.quantity.toLocaleString()} ${getOrderUnit(order)}`
                          )}
                        </div>
                        <div className="max-w-[200px] mx-auto mt-1">
                          <ProductionProgressBar order={order} />
                        </div>
                      </td>
                      <td className="text-center px-6 py-4">
                        <div className="flex justify-center items-center gap-1">
                          {!isViewer && (
                            <>
                              <button type="button" 
                                onClick={() => openOrderModal(order)}
                                className="p-2 hover:bg-surface-elevated rounded-xl text-tertiary hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                                aria-label="Edit Order"
                                title="Edit Order"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button" 
                                onClick={(e) => handleDeleteOrder(order.id, e)}
                                className="p-2 hover:bg-rose-500/10 rounded-xl text-tertiary hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                                aria-label="Delete Order"
                                title="Delete Order"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL - CREATE/EDIT PRODUCTION ORDER */}
      {isCreatingOrder && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-divider/70 flex items-center justify-between shrink-0 bg-surface-elevated/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-xs">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    {editingOrder ? 'Edit Production Order Specifications' : 'Schedule New Production Run'}
                  </h3>
                  <p className="text-xs text-tertiary mt-0.5">
                    {editingOrder ? `Updating specifications for #${editingOrder.id}` : 'Assign machinery, configure mold speeds, and dispatch job into queue.'}
                  </p>
                </div>
              </div>
              <button type="button" 
                onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}
                className="text-tertiary hover:text-primary transition-colors p-1.5 hover:bg-surface-elevated rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} onChange={handleFormChange} className="overflow-y-auto p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column: Identity, Machine, Formulation */}
                <div className="space-y-4">
                  {/* Card: Job Identity & Machinery */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3.5">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5" /> Job Identity & Machinery
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Item / Product Name (English or Arabic)<span className="text-rose-400">*</span>
                      </label>
                      <input
                        name="itemName"
                        required
                        defaultValue={editingOrder?.itemName}
                        className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                        placeholder="مثال: سطل سليمانية 2 كغم"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Assigned Machine Selection
                      </label>
                      <select
                        name="assignedMachine"
                        value={orderFormAssignedMachine}
                        onChange={(e) => handleMachineSelectionChange(e.target.value)}
                        className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer font-medium"
                      >
                        {machines.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.m} - {m.name} {m.type ? `(${m.type.toUpperCase()})` : ''} • {m.moldName || 'Default'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Schedule Window</label>
                        <input
                          name="startDate"
                          type="date"
                          defaultValue={editingOrder?.startDate || new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Target End Date</label>
                        <input
                          name="endDate"
                          type="date"
                          defaultValue={editingOrder?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
                          className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Date Entered</label>
                        <input
                          name="dateEntered"
                          type="date"
                          defaultValue={editingOrder?.dateEntered || new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Status</label>
                        <select
                          name="status"
                          defaultValue={editingOrder?.status || 'Planned'}
                          className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500 font-medium"
                        >
                          <option value="Planned">Planned (Scheduled)</option>
                          <option value="In Progress">In Progress (Active run)</option>
                          <option value="Maintenance">Maintenance (Paused)</option>
                          <option value="Completed">Completed Archive</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card: Materials & Formulation */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3.5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Materials & Formulation
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Raw Material / Granules</label>
                        <input
                          name="granulesType"
                          defaultValue={editingOrder?.granulesType || ''}
                          className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                          placeholder="e.g. PP C440 / HDPE"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Color / Masterbatch</label>
                        <input
                          name="colorant"
                          defaultValue={editingOrder?.colorant || ''}
                          className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                          placeholder="مثال: أبيض / برتقالي"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Packaging Description</label>
                        <input
                          name="packagingDetails"
                          defaultValue={editingOrder?.packagingDetails || ''}
                          className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                          placeholder="مثال: كيس 210 عدد / كرتونة"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">Unit</label>
                        <select
                          name="unit"
                          defaultValue={getOrderUnit(editingOrder)}
                          className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                        >
                          <option value="pcs">Pieces (pcs)</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="tons">Tons</option>
                          <option value="pallets">Pallets</option>
                          <option value="sacks">Sacks</option>
                          <option value="bags">Bags</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Speed/Cycles, Quantities, Directives */}
                <div className="space-y-4">
                  {/* Card: Production Speed & Engineering Parameters */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5" /> Speed & Cycle Engineering
                      </h4>

                      <div className="flex items-center bg-canvas p-1 rounded-xl border border-divider shrink-0">
                        <button
                          type="button"
                          onClick={() => setOrderFormRateMethod('cycle')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            orderFormRateMethod === 'cycle'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-tertiary hover:text-secondary'
                          }`}
                        >
                          Cycle & Cavities
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderFormRateMethod('hourly')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            orderFormRateMethod === 'hourly'
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'text-tertiary hover:text-secondary'
                          }`}
                        >
                          Hourly Speed
                        </button>
                      </div>
                    </div>

                    {orderFormRateMethod === 'cycle' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">
                              Cycle Time (Seconds / زمن الدورة)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                name="cycleTime"
                                step="any"
                                min="0.1"
                                value={orderFormCycleTime}
                                onChange={(e) => setOrderFormCycleTime(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                                placeholder="12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">sec</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">
                              Active Cavities (عدد العيون)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                name="cavities"
                                min="1"
                                max="128"
                                value={orderFormCavities}
                                onChange={(e) => setOrderFormCavities(Math.max(1, Math.round(Number(e.target.value))))}
                                className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                                placeholder="1"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">cav</span>
                            </div>
                          </div>
                        </div>

                        {orderFormCycleTime > 0 && orderFormCavities > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-center pt-1">
                            <div className="p-2 bg-canvas/70 rounded-xl border border-divider/60">
                              <span className="text-[10px] text-tertiary block font-medium">Shots / Minute</span>
                              <span className="text-xs font-mono font-bold text-secondary">
                                {(60 / orderFormCycleTime).toFixed(1)} /min
                              </span>
                            </div>
                            <div className="p-2 bg-canvas/70 rounded-xl border border-divider/60">
                              <span className="text-[10px] text-tertiary block font-medium">Calculated Output</span>
                              <span className="text-xs font-mono font-bold text-purple-400">
                                {Math.round((3600 / orderFormCycleTime) * orderFormCavities).toLocaleString()} pcs/hr
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">
                            Hourly Production Rate (معدل الإنتاج بالساعة)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="hourlyRate"
                              min="0"
                              step="10"
                              value={orderFormHourlyRate}
                              onChange={(e) => setOrderFormHourlyRate(Math.max(0, Number(e.target.value)))}
                              className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-cyan-500"
                              placeholder="2400"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tertiary">bph</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-tertiary font-medium mr-1">Presets:</span>
                          {[1000, 1500, 2000, 2400, 3000, 3500, 4500].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setOrderFormHourlyRate(preset)}
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                orderFormHourlyRate === preset
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                                  : 'bg-canvas text-secondary hover:text-primary border-divider'
                              }`}
                            >
                              {preset.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card: Target Quantities & Continuous (∞) */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isContinuousOrder ? 'bg-purple-950/20 border-purple-500/40 shadow-inner' : 'bg-surface-elevated/20 border-divider/70'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                          isContinuousOrder ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-surface-elevated text-tertiary'
                        }`}>
                          <Infinity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-primary flex items-center gap-2">
                            Continuous Production (∞)
                            {isContinuousOrder && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                                Active • No Limit
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-tertiary mt-0.5">
                            {isContinuousOrder ? 'Runs continuously until manually stopped.' : 'Run open-ended without fixed target quantity.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsContinuousOrder(!isContinuousOrder)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isContinuousOrder ? 'bg-purple-600' : 'bg-surface-elevated border border-divider'
                        }`}
                        role="switch"
                        aria-checked={isContinuousOrder}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isContinuousOrder ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {!isContinuousOrder ? (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">Crates / Bags Quantity (Boxs)</label>
                            <input
                              name="cratesQuantity"
                              type="number"
                              defaultValue={editingOrder?.cratesQuantity}
                              className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                              placeholder="مثال: 47 Boxs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">Loose Items Quantity</label>
                            <input
                              name="looseQuantity"
                              type="number"
                              defaultValue={editingOrder?.looseQuantity}
                              className="w-full px-3 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500"
                              placeholder="مثال: 130"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">Target Quantity (الكمية المستهدفة)</label>
                            <input
                              name="quantity"
                              type="number"
                              min="1"
                              defaultValue={editingOrder?.quantity || ''}
                              className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                              placeholder="10000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-secondary mb-1">Produced Quantity (الكمية المنجزة)</label>
                            <input
                              name="producedQuantity"
                              type="number"
                              min="0"
                              defaultValue={editingOrder ? getProducedCount(editingOrder) : 0}
                              className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">Produced Quantity (الكمية المنجزة)</label>
                          <input
                            name="producedQuantity"
                            type="number"
                            min="0"
                            defaultValue={editingOrder ? getProducedCount(editingOrder) : 0}
                            className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>
                        <input type="hidden" name="quantity" value="0" />
                        <input type="hidden" name="cratesQuantity" value="" />
                        <input type="hidden" name="looseQuantity" value="" />
                      </div>
                    )}
                  </div>

                  {/* Card: Directives & Notes */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-tertiary uppercase tracking-wider">
                      Floor Directives & Shift Comments
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={editingOrder?.notes}
                      className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-purple-500 resize-none font-sans"
                      placeholder="E.g., Any setup properties, mold ID, or emergency comments..."
                      dir="rtl"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div className="pt-4 border-t border-divider flex items-center justify-end gap-3 sticky bottom-0 bg-surface">
                <button
                  type="button"
                  onClick={() => { setIsCreatingOrder(false); setEditingOrder(null); }}
                  className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-elevated rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingOrder ? 'Save Specifications' : 'Schedule Queue Run'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - VIEW DETAILED SPECIFICATIONS & PRODUCTION COCKPIT HUD */}
      {viewingOrder && (() => {
        const produced = getProducedCount(viewingOrder);
        const target = viewingOrder.quantity || 0;
        const pct = (!viewingOrder.isContinuous && target > 0) ? Math.min(100, Math.round((produced / target) * 100)) : 0;
        const remaining = Math.max(0, target - produced);

        return (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface border border-divider/70 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Cockpit HUD Header */}
              <div className="px-6 py-4 border-b border-divider/70 flex items-center justify-between shrink-0 bg-surface-elevated/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-surface border border-divider flex items-center justify-center shrink-0 shadow-xs">
                    {getStatusIcon(viewingOrder.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-primary">
                        <bdi dir="rtl">{viewingOrder.itemName}</bdi>
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(viewingOrder.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${viewingOrder.status === 'In Progress' ? 'bg-emerald-400 animate-pulse' : viewingOrder.status === 'Maintenance' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>
                        <span>{viewingOrder.status}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-tertiary font-mono mt-0.5">
                      <span className="bg-surface-elevated px-2 py-0.2 rounded border border-divider-subtle">{viewingOrder.id}</span>
                      <span>•</span>
                      <span className="text-purple-300 font-semibold flex items-center gap-1">
                        <Settings className="w-3 h-3" /> {viewingOrder.assignedMachine}
                      </span>
                    </div>
                  </div>
                </div>

                <button type="button" 
                  onClick={() => setViewingOrder(null)}
                  className="text-tertiary hover:text-primary transition-colors p-1.5 hover:bg-surface-elevated rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-6 space-y-5 flex-1">
                {/* Top Diagnostic HUD Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Card 1: Completion Progress */}
                  <div className="p-4 bg-surface-elevated/30 border border-divider/70 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                      Completion Progress
                    </span>
                    <div className="mt-2 mb-2 flex items-baseline justify-between">
                      {viewingOrder.isContinuous ? (
                        <span className="text-lg font-bold text-purple-400 flex items-center gap-1.5">
                          <Infinity className="w-5 h-5" /> Continuous Run
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold font-mono text-emerald-400">
                            {pct}%
                          </span>
                          <span className="text-xs text-tertiary font-mono">
                            {remaining.toLocaleString()} left
                          </span>
                        </>
                      )}
                    </div>
                    <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-divider-subtle">
                      {viewingOrder.isContinuous ? (
                        <div className="h-full w-full bg-gradient-to-r from-purple-500/30 via-purple-400 to-purple-500/30" />
                      ) : (
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Card 2: Total Units Produced / Target */}
                  <div className="p-4 bg-surface-elevated/30 border border-divider/70 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                      Floor Yield Produced
                    </span>
                    <div className="mt-2">
                      <div className="text-xl font-bold font-mono text-primary flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>{produced.toLocaleString()}</span>
                        <span className="text-xs font-normal text-tertiary">{getOrderUnit(viewingOrder)}</span>
                      </div>
                      <p className="text-xs text-tertiary mt-1">
                        Target: <strong className="text-secondary font-mono">{viewingOrder.isContinuous ? '∞ (No limit)' : `${target.toLocaleString()} ${getOrderUnit(viewingOrder)}`}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Machine & Speed Specs */}
                  <div className="p-4 bg-surface-elevated/30 border border-divider/70 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                      Machine & Speed Telemetry
                    </span>
                    <div className="mt-2">
                      <div className="text-sm font-bold text-secondary flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          {viewingOrder.productionRateMethod === 'hourly'
                            ? `${viewingOrder.hourlyRate?.toLocaleString() || 2400} bph`
                            : `${viewingOrder.cycleTime || 12}s cycle (${viewingOrder.cavities || 1} cav)`}
                        </span>
                      </div>
                      <p className="text-xs text-tertiary mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{viewingOrder.startDate} ➔ {viewingOrder.endDate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Floor Output Tracker Card */}
                <div className="p-5 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-divider/60">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" /> Live Floor Output Tracker (معدل الإنتاج الفعلي)
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Adjust completed output manually via direct unit count or crate packing formula.
                      </p>
                    </div>

                    {!isViewer && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Produced vs Remaining */}
                        <div className="flex items-center bg-canvas p-1 rounded-xl border border-divider">
                          <button
                            type="button"
                            onClick={() => setTrackerMode('produced')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              trackerMode === 'produced'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-tertiary hover:text-primary'
                            }`}
                          >
                            المنجز (Produced)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrackerMode('remaining')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              trackerMode === 'remaining'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-tertiary hover:text-primary'
                            }`}
                          >
                            المتبقي (Remaining)
                          </button>
                        </div>

                        {/* Direct vs Crates */}
                        <div className="flex items-center bg-canvas p-1 rounded-xl border border-divider">
                          <button
                            type="button"
                            onClick={() => setTrackerInputType('direct')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              trackerInputType === 'direct'
                                ? 'bg-surface-elevated text-purple-300 font-bold shadow-xs'
                                : 'text-tertiary hover:text-primary'
                            }`}
                          >
                            قطع مباشرة
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrackerInputType('crates')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              trackerInputType === 'crates'
                                ? 'bg-surface-elevated text-purple-300 font-bold shadow-xs'
                                : 'text-tertiary hover:text-primary'
                            }`}
                          >
                            صناديق/أكياس
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Fields Area */}
                  {!isViewer && (
                    <div className="bg-canvas/50 p-4 rounded-xl border border-divider/60 space-y-3">
                      {trackerInputType === 'direct' ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-secondary mb-1">
                              {trackerMode === 'produced'
                                ? `Total Produced Quantity (${getOrderUnit(viewingOrder)})`
                                : `Remaining Quantity to Produce (${getOrderUnit(viewingOrder)})`}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={trackerDirectQty}
                                onChange={(e) => setTrackerDirectQty(e.target.value)}
                                placeholder={`Current: ${produced.toLocaleString()}`}
                                className="w-full px-3.5 py-2 bg-surface border border-divider rounded-xl text-sm text-primary font-bold font-mono outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                              <span className="absolute right-3.5 top-2.5 text-xs text-tertiary pointer-events-none">
                                {getOrderUnit(viewingOrder)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!trackerDirectQty.trim()) return;
                              const enteredUnits = Math.max(0, parseInt(trackerDirectQty, 10) || 0);
                              let targetUnits = 0;
                              if (trackerMode === 'produced') {
                                targetUnits = enteredUnits;
                              } else {
                                targetUnits = Math.max(0, (viewingOrder.quantity || 0) - enteredUnits);
                              }
                              handleApplyManualOutput(targetUnits);
                            }}
                            className="px-6 py-2 h-[42px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>UPDATE OUTPUT</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-secondary mb-1">
                                Crates / Bags (صناديق/أكياس)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={trackerCrates}
                                onChange={(e) => setTrackerCrates(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-surface border border-divider rounded-xl text-xs text-primary font-medium outline-none focus:border-purple-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-secondary mb-1">
                                Pcs per Crate (قطع/صندوق)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={trackerPcsPerCrate}
                                onChange={(e) => setTrackerPcsPerCrate(e.target.value)}
                                placeholder={extractPcsPerCrate(viewingOrder.packagingDetails, viewingOrder.quantity)?.toString() || 'e.g. 500'}
                                className="w-full px-3 py-2 bg-surface border border-divider rounded-xl text-xs text-primary font-medium outline-none focus:border-purple-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-secondary mb-1">
                                Loose Items (قطع مفردة)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={trackerLoose}
                                onChange={(e) => setTrackerLoose(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-surface border border-divider rounded-xl text-xs text-primary font-medium outline-none focus:border-purple-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-divider/60">
                            <div className="text-xs text-secondary bg-surface px-3 py-2 rounded-xl border border-divider/60">
                              <span className="font-semibold text-primary">Live Calculation: </span>
                              {(() => {
                                const cVal = parseInt(trackerCrates || '0', 10) || 0;
                                const pVal = parseInt(trackerPcsPerCrate || '0', 10) || extractPcsPerCrate(viewingOrder.packagingDetails, viewingOrder.quantity) || 1;
                                const lVal = parseInt(trackerLoose || '0', 10) || 0;
                                const totalCalculated = (cVal * pVal) + lVal;
                                const resultingProduced = trackerMode === 'produced'
                                  ? totalCalculated
                                  : Math.max(0, (viewingOrder.quantity || 0) - totalCalculated);
                                const pctCalc = viewingOrder.quantity ? ((resultingProduced / viewingOrder.quantity) * 100).toFixed(1) : 0;
                                return (
                                  <span>
                                    ({cVal} × {pVal}) + {lVal} = <strong className="text-purple-400 font-mono">{totalCalculated.toLocaleString()} pcs</strong>
                                    {' '}➜ Set Output: <strong className="text-emerald-400 font-mono">{resultingProduced.toLocaleString()} pcs ({pctCalc}%)</strong>
                                  </span>
                                );
                              })()}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const cVal = parseInt(trackerCrates || '0', 10) || 0;
                                const pVal = parseInt(trackerPcsPerCrate || '0', 10) || extractPcsPerCrate(viewingOrder.packagingDetails, viewingOrder.quantity) || 1;
                                const lVal = parseInt(trackerLoose || '0', 10) || 0;
                                if (cVal === 0 && lVal === 0 && !trackerCrates && !trackerLoose) return;
                                const totalCalculated = (cVal * pVal) + lVal;
                                let targetUnits = 0;
                                if (trackerMode === 'produced') {
                                  targetUnits = Math.max(0, totalCalculated);
                                } else {
                                  targetUnits = Math.max(0, (viewingOrder.quantity || 0) - totalCalculated);
                                }
                                handleApplyManualOutput(targetUnits);
                              }}
                              className="px-6 py-2 h-[40px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>APPLY CRATE COUNT</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2-Column Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Properties & Materials */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" /> Formulation & Materials
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-tertiary block font-semibold">Raw Resin / Granules</span>
                        <span className="text-secondary font-medium"><bdi dir="rtl">{viewingOrder.granulesType}</bdi></span>
                      </div>
                      {viewingOrder.colorant && (
                        <div>
                          <span className="text-[10px] text-tertiary block font-semibold">Masterbatch / Color</span>
                          <span className="text-secondary font-medium"><bdi dir="rtl">{viewingOrder.colorant}</bdi></span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-tertiary block font-semibold">Packaging Specification</span>
                        <span className="text-secondary font-medium"><bdi dir="rtl">{viewingOrder.packagingDetails}</bdi></span>
                      </div>
                      {(viewingOrder.cratesQuantity || viewingOrder.looseQuantity) && (
                        <div>
                          <span className="text-[10px] text-tertiary block font-semibold">Floor Crate Breakdown</span>
                          <span className="text-secondary font-medium font-mono" dir="rtl">
                            {viewingOrder.cratesQuantity && <bdi>{viewingOrder.cratesQuantity} Boxs</bdi>}
                            {viewingOrder.cratesQuantity && viewingOrder.looseQuantity && ' + '}
                            {viewingOrder.looseQuantity && <bdi>{viewingOrder.looseQuantity} Loose</bdi>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Machinery & Telemetry */}
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" /> Machinery & Timeline Config
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-tertiary block font-semibold">Assigned Machine Line</span>
                        <span className="text-secondary font-bold flex items-center gap-1.5 text-purple-300">
                          <Settings className="w-3.5 h-3.5 text-purple-400" />
                          {viewingOrder.assignedMachine}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-tertiary block font-semibold">Speed Calculation Parameter</span>
                        <span className="text-secondary font-medium font-mono flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          {viewingOrder.productionRateMethod === 'hourly'
                            ? `${viewingOrder.hourlyRate?.toLocaleString() || 2400} bottles/hr`
                            : `${viewingOrder.cycleTime || 12}s cycle (${viewingOrder.cavities || 1} cavities)`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-tertiary block font-semibold">Production Timeline Window</span>
                        <span className="text-secondary font-medium font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          {viewingOrder.startDate} ➔ {viewingOrder.endDate}
                        </span>
                      </div>
                      {viewingOrder.actualStartTime && (
                        <div>
                          <span className="text-[10px] text-tertiary block font-semibold">Live Run Started</span>
                          <span className="text-secondary font-medium font-mono flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            {new Date(viewingOrder.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Directives & Comments Card */}
                {viewingOrder.notes && (
                  <div className="p-4 bg-surface-elevated/20 border border-divider/70 rounded-2xl space-y-1.5">
                    <h4 className="text-xs font-bold text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                      Shift Directives & Notes
                    </h4>
                    <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap font-sans" dir="rtl">
                      <bdi>{viewingOrder.notes}</bdi>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Toolbar Footer */}
              <div className="p-4 border-t border-divider flex flex-wrap justify-between items-center gap-3 bg-surface-elevated/35">
                <button type="button" 
                  onClick={() => handleDeleteOrder(viewingOrder.id)}
                  className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Archive to Trash</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Action Buttons */}
                  {viewingOrder.status === 'Planned' && (
                    <button type="button"
                      onClick={() => handleStartOrder(viewingOrder.id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Start Production (بدء التشغيل)</span>
                    </button>
                  )}

                  {viewingOrder.status === 'In Progress' && (
                    <>
                      <button type="button"
                        onClick={() => handlePauseOrder(viewingOrder.id)}
                        className="px-4 py-2 text-xs font-bold text-amber-300 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <PauseCircle className="w-4 h-4" />
                        <span>Pause (توقف / صيانة)</span>
                      </button>
                      <button type="button"
                        onClick={() => handleCompleteOrder(viewingOrder.id)}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{viewingOrder.isContinuous ? 'Stop & Complete' : 'Complete (إتمام الطلبية)'}</span>
                      </button>
                    </>
                  )}

                  {viewingOrder.status === 'Maintenance' && (
                    <>
                      <button type="button"
                        onClick={() => handleResumeOrder(viewingOrder.id)}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Resume (استئناف التشغيل)</span>
                      </button>
                      <button type="button"
                        onClick={() => handleCompleteOrder(viewingOrder.id)}
                        className="px-4 py-2 text-xs font-bold text-secondary bg-surface-elevated hover:bg-surface-elevated/80 border border-divider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete (إنهاء)</span>
                      </button>
                    </>
                  )}

                  <button type="button"
                    onClick={() => {
                      const targetOrder = viewingOrder;
                      setViewingOrder(null);
                      openOrderModal(targetOrder);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary bg-surface hover:bg-surface-elevated border border-divider rounded-xl transition cursor-pointer"
                  >
                    Edit Specifications
                  </button>

                  <button type="button"
                    onClick={() => setViewingOrder(null)}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

       {/* MODAL - MACHINE SETUP REGISTRY MANAGEMENT */}
       {isMachineSetupOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-divider flex items-center justify-between bg-surface-elevated/30">
              <h3 className="text-md font-bold text-primary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                Active Injection Machines Setup Directory
              </h3>
              <button type="button" 
                onClick={() => { setIsMachineSetupOpen(false); setEditingMachineId(null); setSetupMCode(''); setSetupName(''); setSetupMoldName(''); setSetupMolds(['']); }}
                className="text-tertiary hover:text-primary transition-colors p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Form Input Block for New or Edited Machine */}
              <form onSubmit={saveMachineSetup} className="bg-canvas border border-divider rounded-lg p-4 space-y-3.5">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wide">
                  {editingMachineId ? '✏️ Edit Selected Machine' : '⚙️ Register New Machine'}
                </h4>
                <div className="flex flex-col gap-3 font-sans">
                  <div>
                    <label className="block text-[10px] font-bold text-secondary mb-1">M Number / ID<span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., MK 1"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface text-primary border border-divider-subtle rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary mb-1 flex justify-between">
                      <span>Molds (Select radio for Active Mold)<span className="text-red-500">*</span></span>
                      <button type="button" onClick={() => setSetupMolds([...setupMolds, ''])} className="text-blue-500 hover:text-blue-400 font-bold">+ Add Mold</button>
                    </label>
                    <div className="space-y-2">
                      {setupMolds.map((mold, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="active_mold" 
                            required
                            checked={setupMoldName === mold && mold !== ''} 
                            onChange={() => setSetupMoldName(mold)}
                            title="Set as Active Mold"
                            className="shrink-0"
                          />
                          <input 
                            type="text" 
                            required={idx === 0}
                            placeholder="e.g., غطاء شفاف 650"
                            value={mold}
                            onChange={(e) => {
                              const newMolds = [...setupMolds];
                              const oldMold = newMolds[idx];
                              newMolds[idx] = e.target.value;
                              setSetupMolds(newMolds);
                              if (setupMoldName === oldMold) {
                                setSetupMoldName(e.target.value);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-surface text-primary border border-divider-subtle rounded-lg text-xs outline-none focus:border-blue-500"
                          />
                          {setupMolds.length > 1 && (
                            <button type="button" onClick={() => {
                              const newMolds = setupMolds.filter((_, i) => i !== idx);
                              setSetupMolds(newMolds);
                              if (setupMoldName === mold) setSetupMoldName(newMolds[0] || '');
                            }} className="text-red-500 hover:text-red-400 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {editingMachineId && (
                    <button
                      type="button"
                      onClick={() => { setEditingMachineId(null); setSetupMCode(''); setSetupName(''); setSetupMoldName(''); setSetupMolds(['']); }}
                      className="px-4 py-2 text-[11px] font-bold text-secondary hover:bg-surface-elevated rounded-lg"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                  >
                    {editingMachineId ? 'Save Changes' : 'Register Machine'}
                  </button>
                </div>
              </form>

              {/* Machine Registry List Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Registered Schedulers Index ({machines.length})</h4>
                <div className="border border-divider rounded-lg max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-elevated/40 text-quaternary border-b border-divider">
                        <th className="text-center px-4 py-2 font-bold w-[70px]">ID</th>
                        <th className="text-center px-4 py-2 font-bold">Machine Name / Description</th>
                        <th className="text-center px-4 py-2 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider font-sans">
                      {getSortedMachines().map((m) => (
                        <tr key={m.id} className="hover:bg-surface-elevated/20 text-secondary">
                          <td className="text-center px-4 py-2.5 font-bold font-mono text-primary text-center">{m.name}</td>
                          <td className="text-center px-4 py-2.5 font-semibold text-primary">
                            {m.molds && m.molds.length > 1 ? (
                              <select 
                                value={m.moldName}
                                onChange={(e) => {
                                  setMachines(prev => prev.map(mach => mach.id === m.id ? { ...mach, moldName: e.target.value } : mach));
                                  logAction('Active Mold Changed', `Changed active mold for ${m.name} to ${e.target.value}`, 'info');
                                }}
                                className="bg-surface border border-divider rounded-xl px-2 py-1 text-xs outline-none text-primary"
                              >
                                {m.molds.map(mold => (
                                  <option key={mold} value={mold}>{mold}</option>
                                ))}
                              </select>
                            ) : (
                              m.moldName
                            )}
                          </td>
                          <td className="text-center px-4 py-2.5 flex justify-center gap-1.5">
                            <button type="button" 
                              onClick={() => { setEditingMachineId(m.id); setSetupName(m.name); setSetupMoldName(m.moldName || ''); setSetupMolds(m.molds?.length ? m.molds : (m.moldName ? [m.moldName] : [''])); }}
                              className="p-1 text-secondary hover:text-blue-500 rounded-lg transition cursor-pointer"
                              title="Edit Registry Details"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" 
                              onClick={() => deleteSetupMachine(m.id, m.name)}
                              className="p-1 text-secondary hover:text-red-500 rounded-lg transition cursor-pointer"
                              title="Delete machine registry row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-divider flex justify-center bg-surface-elevated/20 shrink-0">
               <button type="button" 
                 onClick={() => { setIsMachineSetupOpen(false); setEditingMachineId(null); setSetupMoldName(''); setSetupMolds(['']); }}
                 className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
               >
                 Close Schedulers Setup
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - MOLD DYNAMIC DETAIL TUNING & METRICS */}
      {viewingMoldDetails && (
        <MoldDetailsModal
          data={viewingMoldDetails}
          onClose={() => setViewingMoldDetails(null)}
          onSave={(updatedMold, updatedAmps, updatedCycle, updatedCavities, updatedHourlyRate, updatedRateMethod) => {
            handleSaveMoldDetails(updatedMold, updatedAmps, updatedCycle, updatedCavities, updatedHourlyRate, updatedRateMethod);
          }}
          onApplyToAll={(cycleTime, cavities, hourlyRate, rateMethod, targetGroup) => {
            handleApplySingleSpecToAll(cycleTime, cavities, hourlyRate, rateMethod, targetGroup);
          }}
        />
      )}

      {/* MODAL - BATCH CYCLE & CAVITIES COPY/PASTE QUICK UPDATER */}
      {isBatchModalOpen && (
        <BatchCycleCavityModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          machines={machines}
          orders={orders}
          onApplyBatch={handleApplyBatchCyclesAndCavities}
        />
      )}
    </div>
  );
}
