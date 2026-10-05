import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useShifts } from '../hooks/useShifts';
import { getScheduleForDate } from '../utils/shiftLogic';
import { logAction } from '../utils/logger';
import ExcelJS from 'exceljs';
import { Download } from 'lucide-react';

export function WorkerScheduleAndKPI({ workers, isReadOnly }: { workers: any[], isReadOnly?: boolean }) {
  const [shifts] = useShifts();
  const activeWorkers = workers.filter(w => w.status === 'Active');
  
  const shiftGroups = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    shifts.forEach((s: string) => {
      groups[s] = activeWorkers.filter(w => w.shift === s);
    });
    
    return groups;
  }, [shifts, activeWorkers]);

  // Manual one-off day overrides
  const [customSchedules, setCustomSchedules] = useLocalStorage<Record<string, Record<string, string>>>('custom_shift_schedules', {});
  // Special pattern overrides for workers (e.g. office hours)
  const [customPatterns, setCustomPatterns] = useLocalStorage<Record<string, string>>('custom_shift_patterns', {});
  // Cycle anchors to redefine where the 12h cycle starts for a worker
  const [customAnchors, setCustomAnchors] = useLocalStorage<Record<string, { dateKey: string, state: string }>>('custom_cycle_anchors', {});
  
  // Global offset to shift the entire company's default 3-day cycle forward or backward
  const [globalShiftOffset, setGlobalShiftOffset] = useLocalStorage<number>('global_shift_offset', 0);

  const [isEditing, setIsEditing] = useState(false);
  const [tempSchedules, setTempSchedules] = useState<Record<string, Record<string, string>>>({});
  const [tempPatterns, setTempPatterns] = useState<Record<string, string>>({});
  const [tempAnchors, setTempAnchors] = useState<Record<string, { dateKey: string, state: string }>>({});

  // Generate the next 30 days for the calendar
  const next30Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const getDayNum = (date: Date) => date.getDate();
  const getDateKey = (date: Date) => date.toISOString().split('T')[0];

  const handleStartEdit = () => {
    setTempSchedules(customSchedules || {});
    setTempPatterns(customPatterns || {});
    setTempAnchors(customAnchors || {});
    setIsEditing(true);
  };

  const handleExportSchedule = async () => {
    logAction('Schedule Export', 'Exported 30-day shift schedule', 'info');
    
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('30-Day Schedule');

    const columns = [
      { header: 'Worker Name', key: 'Worker Name', width: 25 },
      { header: 'Worker ID', key: 'Worker ID', width: 15 },
      { header: 'Job Title', key: 'Job Title', width: 20 },
      { header: 'Shift', key: 'Shift', width: 10 },
      { header: 'Special Pattern', key: 'Special Pattern', width: 20 }
    ];

    next30Days.forEach((d, i) => {
      columns.push({
        header: `${getDayName(d)} ${d.getMonth()+1}/${getDayNum(d)}`,
        key: `day_${i}`,
        width: 15
      });
    });

    ws.columns = columns;

    const addWorkersToData = (shiftName, shiftWorkers) => {
      shiftWorkers.forEach(w => {
        const currentPattern = customPatterns[w.id] || 'default';
        let patternName = 'Default Cycle';
        if (currentPattern === 'fixed_morning') patternName = 'Fixed Morning';
        else if (currentPattern === 'fixed_night') patternName = 'Fixed Night';
        else if (currentPattern === 'office') patternName = 'Office Hours';
        else if (currentPattern.startsWith('custom_rotation')) {
          patternName = `Rotation (${currentPattern.replace('custom_rotation_', '').replace('d', '')}d)`;
        }

        const rowData = {
          'Worker Name': w.name,
          'Worker ID': w.id,
          'Job Title': w.jobTitle,
          'Shift': shiftName,
          'Special Pattern': patternName
        };
        
        next30Days.forEach((d, i) => {
          let sched = getScheduleForDate(w.id, shiftName, d, customSchedules, customPatterns, customAnchors, globalShiftOffset);
          rowData[`day_${i}`] = sched;
        });
        
        ws.addRow(rowData);
      });
    };

    shifts.forEach((s: string) => addWorkersToData(s, shiftGroups[s]));
    

    // Styling
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shift_Schedule_30Days_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = () => {
    setCustomSchedules(tempSchedules);
    setCustomPatterns(tempPatterns);
    setCustomAnchors(tempAnchors);
    setIsEditing(false);
    logAction('Schedule Updated', 'Shift schedules and cycle anchors have been updated manually', 'info');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempSchedules({});
    setTempPatterns({});
    setTempAnchors({});
  };

  const handleScheduleChange = (workerId: string, dateKey: string, newValue: string) => {
    if (newValue.startsWith('CYCLE_START:')) {
      const state = newValue.replace('CYCLE_START:', '');
      setTempAnchors(prev => ({
        ...prev,
        [workerId]: { dateKey, state }
      }));
      // Also clear any day overrides for this day so the anchor takes effect visually immediately
      setTempSchedules(prev => {
        const next = {...prev};
        if (next[workerId]) {
            const nextWorker = {...next[workerId]};
            delete nextWorker[dateKey];
            next[workerId] = nextWorker;
        }
        return next;
      });
    } else if (newValue === 'CLEAR_OVERRIDE') {
      setTempSchedules(prev => {
        const next = {...prev};
        if (next[workerId]) {
          const nextWorker = {...next[workerId]};
          delete nextWorker[dateKey];
          next[workerId] = nextWorker;
        }
        return next;
      });
    } else {
      setTempSchedules(prev => ({
        ...prev,
        [workerId]: {
          ...(prev[workerId] || {}),
          [dateKey]: newValue
        }
      }));
    }
  };

  const handleResetWorker = (workerId: string) => {
    if (!confirm('Are you sure you want to reset this worker back to the default shift cycle? This removes all manual overrides and anchors.')) return;
    setTempSchedules(prev => {
      const next = {...prev};
      delete next[workerId];
      return next;
    });
    setTempPatterns(prev => {
      const next = {...prev};
      delete next[workerId];
      return next;
    });
    setTempAnchors(prev => {
      const next = {...prev};
      delete next[workerId];
      return next;
    });
  };

  const renderShiftSchedule = (shiftName: string, shiftWorkers: any[]) => {
    if (shiftWorkers.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Shift {shiftName} Schedule
        </h3>
        <div className="overflow-x-auto bg-surface border border-divider rounded-xl shadow-sm custom-scrollbar pb-2">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-divider bg-surface-elevated/30 text-xs uppercase tracking-widest text-quaternary">
                <th className="text-center px-6 py-4 font-semibold text-sm min-w-[200px] whitespace-nowrap">Worker</th>
                <th className="text-center px-6 py-4 font-semibold text-sm min-w-[160px] whitespace-nowrap">Special Pattern</th>
                {next30Days.map((d, i) => (
                  <th key={i} className="px-6 py-4 font-semibold text-sm text-center min-w-[140px] pl-[calc(1rem+0.1em)]">
                    <div className="flex flex-col items-center">
                      <span className="text-secondary">{getDayName(d)}</span>
                      <span className="text-[10px] opacity-70">{d.getMonth()+1}/{getDayNum(d)}</span>
                    </div>
                  </th>
                ))}
                {isEditing && <th className="text-center px-6 py-4 font-semibold text-sm w-16 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shiftWorkers.map(w => {
                const currentPattern = isEditing ? (tempPatterns[w.id] || 'default') : (customPatterns[w.id] || 'default');
                const hasOverrides = isEditing && (tempSchedules[w.id] || tempPatterns[w.id] || tempAnchors[w.id]);

                return (
                  <tr key={w.id} className="hover:bg-surface-elevated/20 transition-colors">
                    <td className="text-center px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-secondary text-sm"><bdi dir="auto">{w.name}</bdi></div>
                      <div className="text-[10px] font-mono text-quaternary mt-0.5">{w.id} - <bdi dir="auto">{w.jobTitle}</bdi></div>
                    </td>
                    
                    <td className="text-center px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={currentPattern.startsWith('custom_rotation') ? 'custom_rotation' : currentPattern}
                            onChange={(e) => {
                               if (e.target.value === 'custom_rotation') {
                                   setTempPatterns(prev => ({...prev, [w.id]: 'custom_rotation_14'}));
                               } else {
                                   setTempPatterns(prev => ({...prev, [w.id]: e.target.value}));
                               }
                            }}
                            className="w-full bg-canvas border border-divider rounded-lg px-1.5 py-1.5 text-[11px] font-medium outline-none focus:border-blue-500 text-primary"
                          >
                            <option value="default">Default 12h Cycle</option>
                            <option value="fixed_morning">Fixed Morning (08-16)</option>
                            <option value="fixed_night">Fixed Night (16-00)</option>
                            <option value="office">Office Hours (08-16)</option>
                            <option value="custom_rotation">Custom Rotation</option>
                          </select>
                          {currentPattern.startsWith('custom_rotation') && (
                            <div className="flex items-center gap-1 mt-1">
                               <input 
                                 type="number" 
                                 min="1" 
                                 value={currentPattern.replace('custom_rotation_', '').replace('d', '')}
                                 onChange={(e) => setTempPatterns(prev => ({...prev, [w.id]: `custom_rotation_${e.target.value}`}))}
                                 className="w-12 bg-canvas border border-divider rounded-lg px-1 py-0.5 text-[11px] text-center"
                               />
                               <span className="text-[10px] text-quaternary">Days</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-secondary bg-surface-elevated border border-divider-subtle px-2 py-1 rounded-lg">
                          {currentPattern === 'fixed_morning' ? 'Fixed Morning' :
                           currentPattern === 'fixed_night' ? 'Fixed Night' :
                           currentPattern === 'office' ? 'Office Hours' : 
                           currentPattern.startsWith('custom_rotation') ? `Rotation (${currentPattern.replace('custom_rotation_', '').replace('d', '')}d)` : 
                           'Default Cycle'}
                        </span>
                      )}
                    </td>

                    {next30Days.map((d, i) => {
                      const dateKey = getDateKey(d);
                      let sched = getScheduleForDate(w.id, shiftName, d, isEditing ? tempSchedules : customSchedules, isEditing ? tempPatterns : customPatterns, isEditing ? tempAnchors : customAnchors, globalShiftOffset);
                      const isOff = sched === 'OFF' || sched === 'SICK' || sched === 'VACATION';

                      return (
                        <td key={i} className="px-6 py-4 text-center">
                          {isEditing ? (
                            <select
                              value={sched}
                              onChange={(e) => handleScheduleChange(w.id, dateKey, e.target.value)}
                              className={`w-full bg-canvas border rounded-lg px-1 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 text-primary ${
                                tempSchedules[w.id]?.[dateKey] || (tempAnchors[w.id]?.dateKey === dateKey) 
                                ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' 
                                : 'border-divider'
                              }`}
                            >
                              <optgroup label="One-Time Edit (This Day)">
                                <option value="08:00 - 20:00">08:00 - 20:00</option>
                                <option value="20:00 - 08:00">20:00 - 08:00</option>
                                <option value="08:00 - 16:00">08:00 - 16:00</option>
                                <option value="16:00 - 00:00">16:00 - 00:00</option>
                                <option value="00:00 - 08:00">00:00 - 08:00</option>
                                <option value="OFF">OFF</option>
                                <option value="SICK">SICK</option>
                                <option value="VACATION">VACATION</option>
                                <option value="CLEAR_OVERRIDE">Reset to Default</option>
                              </optgroup>
                              <optgroup label="Change 12h Cycle Pattern (From this day forward)">
                                <option value="CYCLE_START:08:00 - 20:00">Start 12h Cycle (Morning)</option>
                                <option value="CYCLE_START:20:00 - 08:00">Start 12h Cycle (Night)</option>
                                <option value="CYCLE_START:OFF">Start 12h Cycle (OFF)</option>
                              </optgroup>
                            </select>
                          ) : (
                            <span className={`inline-block min-w-[64px] text-center px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                              sched === 'SICK' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              sched === 'VACATION' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              isOff ? 'bg-surface-elevated text-quaternary border border-divider-subtle' :
                              'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}>
                              {sched}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {isEditing && (
                      <td className="text-center px-6 py-4 text-center">
                        {hasOverrides && (
                          <button type="button"
                            onClick={() => handleResetWorker(w.id)}
                            className="p-1.5 text-quaternary hover:text-red-400 bg-surface hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                            title="Reset all overrides and patterns for this worker"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto relative bg-canvas">
      {/* Calendar Section */}
      <div className="space-y-8 pb-12">
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 mb-6 gap-4 bg-canvas/95 backdrop-blur-md border-b border-surface-elevated shadow-sm">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Shift Schedule & Smart Cycles
          </h2>
          
          <div className="flex gap-2 items-center">
            {!isEditing && (
              <button type="button" 
                onClick={handleExportSchedule}
                className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary bg-surface border border-divider rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export Schedule
              </button>
            )}
            
            <div className="flex items-center space-x-2 bg-surface px-4 py-2 rounded-lg border border-surface-elevated hidden md:flex ml-2">
              <span className="text-xs font-medium text-tertiary">Align Cycle (Days):</span>
              <button type="button" 
                onClick={() => setGlobalShiftOffset(o => o - 1)}
                className="text-tertiary hover:text-primary px-1"
              >-</button>
              <span className="text-xs font-bold w-4 text-center text-secondary">{globalShiftOffset}</span>
              <button type="button" 
                onClick={() => setGlobalShiftOffset(o => o + 1)}
                className="text-tertiary hover:text-primary px-1"
              >+</button>
            </div>
            
            {isEditing ? (
              <>
                <button type="button" 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary bg-surface border border-divider rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button type="button" 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </>
            ) : !isReadOnly ? (
              <button type="button" 
                onClick={handleStartEdit}
                className="px-4 py-2 text-sm font-medium text-blue-500 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Schedule
              </button>
            ) : null}
          </div>
        </div>
        
        <div className="px-6 space-y-8">
          {shifts.map((s: string) => <React.Fragment key={s}>{renderShiftSchedule(s, shiftGroups[s])}</React.Fragment>)}
          
        </div>
      </div>
    </div>
  );
}
