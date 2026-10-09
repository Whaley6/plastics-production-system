import React, { useState, useMemo } from 'react';
import { 
  X, 
  ClipboardPaste, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  Calendar, 
  Sparkles,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { 
  DailyProductionRecord, 
  normalizeDateString, 
  parseRecordDate 
} from '../types/machineHealth';

interface OeeDataPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineName: string;
  nominalCapability: number;
  availableDates: string[]; // List of calendar dates in the current month
  onSaveData: (params: {
    productionUpdates: Record<string, DailyProductionRecord>;
    capabilityUpdate?: number;
  }) => void;
}

type ParseMode = 'key_value' | 'tabular' | 'auto';
type ApplyScope = 'single_date' | 'all_working_days' | 'table_dates';

export const OeeDataPasteModal: React.FC<OeeDataPasteModalProps> = ({
  isOpen,
  onClose,
  machineName,
  nominalCapability,
  availableDates,
  onSaveData,
}) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(availableDates[0] || '01/09/2026');
  const [applyScope, setApplyScope] = useState<ApplyScope>('single_date');
  const [capabilityDraft, setCapabilityDraft] = useState<number>(nominalCapability);

  // Sample data button helper
  const handleLoadSample = () => {
    setPastedText(
`waste = 632 pcs
production = 15,582 pcs
run time = 1245 min
daily capability = 23,000`
    );
  };

  const handleLoadTabularSample = () => {
    setPastedText(
`Day\tProduction\tWaste\tRunTime\tStatus
1\t15582\t632\t1245\tWorking
2\t15582\t632\t1245\tWorking
3\t15582\t632\t1245\tWorking
4\t15582\t632\t1245\tWorking
5\t0\t0\t0\tStopped`
    );
  };

  // Parser: Auto-detects whether the text is Key-Value or Tabular Excel data
  const parsedData = useMemo(() => {
    if (!pastedText.trim()) return null;

    const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Check if it matches key-value patterns (waste = ..., production = ..., etc.)
    const hasEqualOrColon = lines.some(l => l.includes('=') || l.includes(':'));

    if (hasEqualOrColon) {
      let prod = 15582;
      let waste = 632;
      let runTime = 1245;
      let cap = capabilityDraft;
      let isWorking = true;

      lines.forEach(line => {
        const lower = line.toLowerCase();
        // Extract numbers (supporting commas, decimals)
        const matchNum = line.match(/[:=]\s*([0-9,.]+)/);
        const val = matchNum ? parseFloat(matchNum[1].replace(/,/g, '')) : NaN;

        if (!isNaN(val)) {
          if (lower.includes('waste') || lower.includes('scrap') || lower.includes('تالف') || lower.includes('هدر')) {
            waste = Math.round(val);
          } else if (lower.includes('prod') || lower.includes('good') || lower.includes('انتاج') || lower.includes('إنتاج')) {
            prod = Math.round(val);
          } else if (lower.includes('run') || lower.includes('تشغيل') || lower.includes('وقت')) {
            runTime = Math.round(val);
          } else if (lower.includes('cap') || lower.includes('طاقة') || lower.includes('طاقه') || lower.includes('قدرة')) {
            cap = Math.round(val);
          }
        }

        if (lower.includes('stop') || lower.includes('توقف') || lower.includes('عطل')) {
          if (!lower.includes('reason') && !lower.includes('سبب')) {
            isWorking = false;
          }
        }
      });

      return {
        type: 'key_value' as const,
        singleRecord: {
          production: prod,
          waste: waste,
          customRunTimeMinutes: runTime,
          isWorkingDay: isWorking
        },
        detectedCapability: cap
      };
    }

    // Tabular Excel / Tab-separated parser
    const rows: Array<{
      rawDate: string;
      canonicalDate: string;
      production: number;
      waste: number;
      runTime: number;
      isWorking: boolean;
    }> = [];

    // Detect header
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('day') || 
      firstLineLower.includes('date') || 
      firstLineLower.includes('prod') || 
      firstLineLower.includes('يوم') || 
      firstLineLower.includes('تاريخ') || 
      firstLineLower.includes('انتاج')
    ) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab, comma, or multiple spaces
      const parts = line.split(/[\t,;]+|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      let datePart = parts[0];
      // If datePart is a single number (e.g. "1", "2"), map to current month date if possible
      let canonicalDate = normalizeDateString(datePart);
      if (!canonicalDate && /^\d{1,2}$/.test(datePart)) {
        const dayNum = parseInt(datePart, 10);
        const matched = availableDates.find(d => parseInt(parseRecordDate(d).day, 10) === dayNum);
        if (matched) canonicalDate = matched;
        else canonicalDate = `${String(dayNum).padStart(2, '0')}/09/2026`;
      }

      const num1 = parseFloat(parts[1]?.replace(/,/g, '')) || 0;
      const num2 = parts.length > 2 ? (parseFloat(parts[2]?.replace(/,/g, '')) || 0) : 0;
      const num3 = parts.length > 3 ? (parseFloat(parts[3]?.replace(/,/g, '')) || 0) : 1245;

      const statusPart = parts.length > 4 ? parts[4].toLowerCase() : '';
      const isStopped = statusPart.includes('stop') || statusPart.includes('متوقف') || statusPart.includes('توقف') || (num1 === 0 && num3 === 0);

      rows.push({
        rawDate: datePart,
        canonicalDate: canonicalDate || datePart,
        production: Math.round(num1),
        waste: Math.round(num2),
        runTime: Math.min(1440, Math.round(num3)),
        isWorking: !isStopped
      });
    }

    if (rows.length > 0) {
      return {
        type: 'tabular' as const,
        rows
      };
    }

    return null;
  }, [pastedText, capabilityDraft, availableDates]);

  // Apply Changes Handler
  const handleApply = () => {
    if (!parsedData) return;

    const updates: Record<string, DailyProductionRecord> = {};
    let capUpdate: number | undefined = undefined;

    if (parsedData.type === 'key_value') {
      if (parsedData.detectedCapability && parsedData.detectedCapability !== nominalCapability) {
        capUpdate = parsedData.detectedCapability;
      }

      if (applyScope === 'single_date') {
        const canonical = normalizeDateString(targetDate);
        updates[canonical] = parsedData.singleRecord;
      } else if (applyScope === 'all_working_days') {
        availableDates.forEach(d => {
          const canonical = normalizeDateString(d);
          updates[canonical] = { ...parsedData.singleRecord };
        });
      }
    } else if (parsedData.type === 'tabular') {
      parsedData.rows.forEach(r => {
        const canonical = normalizeDateString(r.canonicalDate);
        updates[canonical] = {
          production: r.production,
          waste: r.waste,
          customRunTimeMinutes: r.runTime,
          isWorkingDay: r.isWorking
        };
      });
    }

    onSaveData({
      productionUpdates: updates,
      capabilityUpdate: capUpdate
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <span>Copy & Paste OEE & Production Data</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {machineName}
                </span>
              </h3>
              <p className="text-xs text-tertiary">
                Paste daily values (waste, production, run time, capability) as text or copy directly from Excel!
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 hover:bg-surface-elevated rounded-lg text-tertiary hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-tertiary font-medium">Quick load templates:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Text Snippet (waste = 632 ...)</span>
              </button>
              <button
                type="button"
                onClick={handleLoadTabularSample}
                className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-blue-400" />
                <span>Excel Columns (Day, Prod, Waste...)</span>
              </button>
            </div>
          </div>

          {/* Paste Input Textarea */}
          <div className="relative">
            <textarea
              rows={6}
              dir="auto"
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder={`Paste your data here, for example:\n\nwaste = 632 pcs\nproduction = 15,582 pcs\nrun time = 1245 min\ndaily capability = 23,000\n\nOr paste multiple rows directly from an Excel spreadsheet table.`}
              className="w-full bg-surface border border-divider rounded-xl p-3.5 text-xs font-mono text-primary placeholder:text-tertiary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 leading-relaxed"
            />
          </div>

          {/* Parsing Feedback & Target Settings */}
          {parsedData && (
            <div className="p-4 bg-surface border border-divider rounded-xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-2.5">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>
                    Successfully Detected {parsedData.type === 'key_value' ? 'Key-Value Values' : `${parsedData.rows.length} Spreadsheet Rows`}
                  </span>
                </span>

                {parsedData.type === 'key_value' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-tertiary">Apply To:</span>
                    <div className="flex items-center gap-1 p-0.5 bg-canvas border border-divider rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setApplyScope('single_date')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          applyScope === 'single_date' ? 'bg-blue-600 text-white font-bold' : 'text-tertiary hover:text-secondary'
                        }`}
                      >
                        Single Date
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyScope('all_working_days')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          applyScope === 'all_working_days' ? 'bg-blue-600 text-white font-bold' : 'text-tertiary hover:text-secondary'
                        }`}
                      >
                        All Month Active Days ({availableDates.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Single Date Picker (if key_value & single_date) */}
              {parsedData.type === 'key_value' && applyScope === 'single_date' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-secondary whitespace-nowrap flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Target Date:</span>
                  </label>
                  <select
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="bg-canvas border border-divider rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-primary focus:outline-none focus:border-blue-500 [&>option]:bg-surface"
                  >
                    {availableDates.map(d => {
                      const { day } = parseRecordDate(d);
                      return (
                        <option key={d} value={d}>
                          {d} {day ? `(Day ${parseInt(day, 10)})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Parsed Live Values Grid */}
              {parsedData.type === 'key_value' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center font-mono">
                  <div className="p-2.5 bg-canvas rounded-lg border border-divider">
                    <span className="text-[10px] text-tertiary block">Good Production</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {parsedData.singleRecord.production.toLocaleString()} pcs
                    </span>
                  </div>
                  <div className="p-2.5 bg-canvas rounded-lg border border-divider">
                    <span className="text-[10px] text-tertiary block">Waste Scrap</span>
                    <span className="text-rose-400 font-bold text-sm">
                      {parsedData.singleRecord.waste.toLocaleString()} pcs
                    </span>
                  </div>
                  <div className="p-2.5 bg-canvas rounded-lg border border-divider">
                    <span className="text-[10px] text-tertiary block">Run Time</span>
                    <span className="text-sky-400 font-bold text-sm">
                      {parsedData.singleRecord.customRunTimeMinutes} min
                    </span>
                  </div>
                  <div className="p-2.5 bg-canvas rounded-lg border border-divider">
                    <span className="text-[10px] text-tertiary block">Machine Capability</span>
                    <span className="text-primary font-bold text-sm">
                      {(parsedData.detectedCapability || nominalCapability).toLocaleString()} pcs
                    </span>
                  </div>
                </div>
              )}

              {/* Parsed Tabular Preview Table */}
              {parsedData.type === 'tabular' && (
                <div className="border border-divider rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-canvas text-[11px] text-tertiary sticky top-0 border-b border-divider">
                      <tr>
                        <th className="py-1.5 px-2.5">Date</th>
                        <th className="py-1.5 px-2 text-right">Production</th>
                        <th className="py-1.5 px-2 text-right">Waste</th>
                        <th className="py-1.5 px-2 text-right">Run (min)</th>
                        <th className="py-1.5 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/40">
                      {parsedData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-canvas/50">
                          <td className="py-1.5 px-2.5 font-bold text-primary">{row.canonicalDate}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-400">{row.production.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-rose-400">{row.waste.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-sky-400">{row.runTime}</td>
                          <td className="py-1.5 px-2.5 text-center">
                            {row.isWorking ? (
                              <span className="text-emerald-400 text-[10px] font-bold">🟢 Active</span>
                            ) : (
                              <span className="text-rose-400 text-[10px] font-bold">⏸️ Stopped</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-divider flex justify-between items-center bg-surface/70 shrink-0">
          <div className="text-[11px] text-tertiary flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Changes will be instantly saved to local storage & OEE database</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedData}
              onClick={handleApply}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                parsedData 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-surface-elevated text-tertiary cursor-not-allowed opacity-50'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Save & Update OEE Ledger</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OeeDataPasteModal;
