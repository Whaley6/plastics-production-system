import React from 'react';
import { 
  X, 
  Activity, 
  Clock, 
  TrendingUp, 
  Sliders, 
  Award, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { 
  DayOeeResult, 
  DowntimeRecord, 
  DailyProductionRecord, 
  getOeeColor,
  parseRecordDate
} from '../types/machineHealth';

interface OeeDayChartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayResult: DayOeeResult | null;
  downtimeRecord?: DowntimeRecord;
  productionRecord?: DailyProductionRecord;
  nominalCapability: number;
  onEditDay?: (date: string) => void;
}

export const OeeDayChartsModal: React.FC<OeeDayChartsModalProps> = ({
  isOpen,
  onClose,
  dayResult,
  downtimeRecord,
  productionRecord,
  nominalCapability,
  onEditDay,
}) => {
  if (!isOpen || !dayResult) return null;

  const { day } = parseRecordDate(dayResult.date || '');
  const isStopped = !dayResult.isWorkingDay;

  // Safe numeric fallbacks to guarantee NO undefined / NaN errors
  const goodProd = Number(dayResult.goodProduction ?? (dayResult as any).production ?? productionRecord?.production ?? 0);
  const waste = Number(dayResult.waste ?? productionRecord?.waste ?? 0);
  const totalOutput = goodProd + waste;
  const goodPercent = totalOutput > 0 ? ((goodProd / totalOutput) * 100).toFixed(1) : '100';
  const wastePercent = totalOutput > 0 ? ((waste / totalOutput) * 100).toFixed(1) : '0';

  const oeeScore = Number(dayResult.oee || 0);
  const availabilityScore = Number(dayResult.availability || 0);
  const performanceScore = Number(dayResult.performance || 0);
  const qualityScore = Number(dayResult.quality || 0);
  const adjCap = Number(dayResult.adjustedCapability || nominalCapability || 23000);
  const excludedReasonsList = Array.isArray(dayResult.excludedReasons) ? dayResult.excludedReasons : [];

  // Pie chart data for Quality Output
  const qualityPieData = [
    { name: 'Good Production', value: Math.max(0, goodProd), color: '#10B981' },
    { name: 'Waste / Scrap', value: Math.max(0, waste), color: '#F43F5E' }
  ];

  // Bar chart data for Capability vs Actual Production
  const capabilityBarData = [
    { name: 'Nominal Cap', pcs: nominalCapability || 23000, fill: '#6366F1' },
    { name: 'Adjusted Cap', pcs: adjCap, fill: '#3B82F6' },
    { name: 'Good Output', pcs: goodProd, fill: '#10B981' },
    { name: 'Waste', pcs: waste, fill: '#F43F5E' }
  ];

  // 24-Hour Time Distribution calculation (1440 min total)
  const totalMins = 1440;
  const runMins = Math.min(totalMins, Number(dayResult.runTimeMinutes || 0));
  const excludedMins = Math.min(totalMins - runMins, Number(dayResult.excludedDowntimeMinutes || 0));
  const standardDowntimeMins = Math.max(0, (Number(downtimeRecord?.totalDowntimeMinutes) || 0) - excludedMins);
  const unloggedMins = Math.max(0, totalMins - (runMins + excludedMins + standardDowntimeMins));

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/70 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
              style={{ 
                backgroundColor: `${getOeeColor(oeeScore)}20`, 
                borderColor: `${getOeeColor(oeeScore)}40`,
                borderWidth: '1px',
                color: getOeeColor(oeeScore)
              }}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-primary">
                  OEE & Production Breakdown: Day {day ? parseInt(day, 10) : ''}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-surface border border-divider text-secondary">
                  {dayResult.date}
                </span>
                {isStopped ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
                    ⏸️ Stopped Day
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                    🟢 Active Day
                  </span>
                )}
              </div>
              <p className="text-xs text-tertiary">
                Detailed visual charts for Availability, Performance, Quality, and capability deductions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditDay && (
              <button
                type="button"
                onClick={() => onEditDay(dayResult.date)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Edit Day Data
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Top 4 KPI Pillar Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* OEE Score */}
            <div className="p-4 rounded-xl bg-surface border border-divider flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary flex items-center justify-between">
                <span>Overall OEE</span>
                <Activity className="w-3.5 h-3.5" style={{ color: getOeeColor(oeeScore) }} />
              </span>
              <div className="my-2">
                <span className="text-3xl font-black font-mono tracking-tight" style={{ color: getOeeColor(oeeScore) }}>
                  {isStopped ? '0.0%' : `${oeeScore.toFixed(1)}%`}
                </span>
              </div>
              <span className="text-[10px] text-tertiary font-mono">
                {oeeScore >= 85 ? 'World Class (≥85%)' : oeeScore >= 65 ? 'Typical / Fair' : 'Needs Optimization'}
              </span>
            </div>

            {/* Availability */}
            <div className="p-4 rounded-xl bg-surface border border-divider flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary flex items-center justify-between">
                <span>Availability (A)</span>
                <Clock className="w-3.5 h-3.5 text-sky-400" />
              </span>
              <div className="my-2">
                <span className="text-2xl font-black font-mono tracking-tight text-sky-400">
                  {availabilityScore.toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-tertiary font-mono">
                Run: {dayResult.runTimeMinutes}m / {1440 - dayResult.excludedDowntimeMinutes}m
              </span>
            </div>

            {/* Performance */}
            <div className="p-4 rounded-xl bg-surface border border-divider flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary flex items-center justify-between">
                <span>Performance (P)</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="my-2">
                <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
                  {performanceScore.toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-tertiary font-mono">
                Speed: {totalOutput.toLocaleString()} / target
              </span>
            </div>

            {/* Quality */}
            <div className="p-4 rounded-xl bg-surface border border-divider flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary flex items-center justify-between">
                <span>Quality (Q)</span>
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="my-2">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                  {qualityScore.toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-tertiary font-mono">
                {goodProd.toLocaleString()} good / {waste.toLocaleString()} scrap
              </span>
            </div>
          </div>

          {/* Capability Deduction Callout Banner */}
          <div className="p-3.5 bg-surface border border-divider rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-primary">Daily Machine Capability:</span>
                  <span className="font-mono text-secondary font-bold">{(nominalCapability || 23000).toLocaleString()} pcs</span>
                  {Number(dayResult.capabilityReduction) > 0 && (
                    <>
                      <span className="text-tertiary">➜</span>
                      <span className="font-mono text-rose-400 font-bold">-{Number(dayResult.capabilityReduction).toLocaleString()} pcs</span>
                      <span className="text-tertiary">➜</span>
                      <span className="font-mono text-emerald-400 font-bold">Adjusted: {adjCap.toLocaleString()} pcs</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-tertiary mt-0.5">
                  {Number(dayResult.excludedDowntimeMinutes) > 0 ? (
                    <span>
                      <strong className="text-amber-400">{dayResult.excludedDowntimeMinutes} min ({(dayResult.excludedDowntimeMinutes / 60).toFixed(1)} hrs)</strong> excluded from capability via reasons: <span className="text-blue-300 font-medium">{excludedReasonsList.join(', ') || 'مولدة'}</span>
                    </span>
                  ) : (
                    <span>No capability-reducing stop reasons recorded on this day. Full capability retained.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row: Donut Chart + Capability vs Actual Output Bar Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chart 1: Quality Donut (Good vs Waste) */}
            <div className="p-4 bg-surface border border-divider rounded-xl flex flex-col">
              <span className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Quality Output Distribution</span>
              </span>
              <p className="text-[11px] text-tertiary mb-3">
                Good pieces vs Scrap pieces produced on {dayResult.date}
              </p>

              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {qualityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '0.5rem', fontSize: '11px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} pcs`, 'Quantity']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black font-mono text-emerald-400">{goodPercent}%</span>
                  <span className="text-[9px] uppercase tracking-wider text-tertiary">Good</span>
                </div>
              </div>

              <div className="flex justify-around items-center pt-2 border-t border-divider/60 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-tertiary">Good:</span>
                  <strong className="text-emerald-400">{goodProd.toLocaleString()} ({goodPercent}%)</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-tertiary">Waste:</span>
                  <strong className="text-rose-400">{waste.toLocaleString()} ({wastePercent}%)</strong>
                </div>
              </div>
            </div>

            {/* Chart 2: Capability vs Actual Output Bar Chart */}
            <div className="p-4 bg-surface border border-divider rounded-xl flex flex-col">
              <span className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Capability vs Actual Output (pcs)</span>
              </span>
              <p className="text-[11px] text-tertiary mb-3">
                Target Capacity benchmark compared to real machine delivery
              </p>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capabilityBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickFormatter={val => `${(val / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '0.5rem', fontSize: '11px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} pcs`, 'Quantity']}
                    />
                    <Bar dataKey="pcs" radius={[4, 4, 0, 0]}>
                      {capabilityBarData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-divider/60 text-[11px] text-tertiary flex justify-between items-center font-mono">
                <span>Output Rate vs Target:</span>
                <span className="text-primary font-bold">
                  {adjCap > 0 
                    ? `${((goodProd / adjCap) * 100).toFixed(1)}% Target Realized` 
                    : 'N/A'}
                </span>
              </div>
            </div>

          </div>

          {/* 24-Hour Time Distribution Bar (1,440 Minutes) */}
          <div className="p-4 bg-surface border border-divider rounded-xl space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>24-Hour Time Allocation (1,440 Minutes)</span>
              </span>
              <span className="text-tertiary font-mono text-[11px]">
                Operating: <strong className="text-sky-400">{runMins}m</strong> ({(runMins / 60).toFixed(1)} hrs)
              </span>
            </div>

            {/* Horizontal Stacked Progress Bar */}
            <div className="w-full bg-surface-elevated h-4 rounded-lg overflow-hidden flex text-[9px] font-mono text-white font-bold">
              {runMins > 0 && (
                <div 
                  className="bg-sky-500 h-full flex items-center justify-center truncate transition-all px-1"
                  style={{ width: `${(runMins / totalMins) * 100}%` }}
                  title={`Run Time: ${runMins}m`}
                >
                  {runMins}m
                </div>
              )}
              {excludedMins > 0 && (
                <div 
                  className="bg-purple-500 h-full flex items-center justify-center truncate transition-all px-1"
                  style={{ width: `${(excludedMins / totalMins) * 100}%` }}
                  title={`Excluded Stops (مولدة): ${excludedMins}m`}
                >
                  {excludedMins}m
                </div>
              )}
              {standardDowntimeMins > 0 && (
                <div 
                  className="bg-rose-500 h-full flex items-center justify-center truncate transition-all px-1"
                  style={{ width: `${(standardDowntimeMins / totalMins) * 100}%` }}
                  title={`Availability Downtime: ${standardDowntimeMins}m`}
                >
                  {standardDowntimeMins}m
                </div>
              )}
              {unloggedMins > 0 && (
                <div 
                  className="bg-zinc-700 h-full flex items-center justify-center truncate transition-all px-1"
                  style={{ width: `${(unloggedMins / totalMins) * 100}%` }}
                  title={`Unscheduled / Idle: ${unloggedMins}m`}
                >
                  {unloggedMins}m
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-4 text-[11px] text-tertiary font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Operating Run: <strong>{runMins}m</strong></span>
              </span>
              {excludedMins > 0 && (
                <span className="flex items-center gap-1.5 text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Capability Excluded: <strong>{excludedMins}m</strong></span>
                </span>
              )}
              {standardDowntimeMins > 0 && (
                <span className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Downtime: <strong>{standardDowntimeMins}m</strong></span>
                </span>
              )}
            </div>
          </div>

          {/* Stoppages for this Day (if any logged) */}
          {downtimeRecord && Array.isArray(downtimeRecord.reasons) && downtimeRecord.reasons.length > 0 && (
            <div className="p-4 bg-surface border border-divider rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Recorded Stoppages for {dayResult.date} ({downtimeRecord.reasons.length} Events)</span>
              </span>

              <div className="divide-y divide-divider/50 border border-divider rounded-lg overflow-hidden text-xs">
                {downtimeRecord.reasons.map((sub, idx) => {
                  const subReasonText = sub?.reason || sub?.type || '';
                  const isExcluded = excludedReasonsList.some(r => r && (subReasonText.includes(r) || r.includes(subReasonText)));

                  return (
                    <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-surface-elevated/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-tertiary text-[11px]">#{idx + 1}</span>
                        <span className="font-medium text-primary" dir="auto">{sub.reason || 'توقف عام'}</span>
                        {sub.type && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated text-secondary font-mono">
                            {sub.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-primary">{sub.durationMinutes} min</span>
                        {isExcluded ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400">
                            Excludes Cap (مولدة, etc.)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
                            Availability Stop
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-divider flex justify-end items-center bg-surface/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-surface hover:bg-surface-elevated border border-divider text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>

      </div>
    </div>
  );
};

export default OeeDayChartsModal;
