import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  ClipboardPaste, 
  Zap, 
  Check, 
  Sparkles, 
  FileSpreadsheet, 
  Layers, 
  AlertCircle, 
  ArrowDown, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Settings,
  Flame,
  Tag,
  Gauge
} from 'lucide-react';
import { ProductionMachine, ProductionOrder } from '../pages/ProductionOrders';

export interface BatchMachineUpdate {
  machineName: string;
  cycleTime?: number;
  cavities?: number;
  hourlyRate?: number;
  rateMethod?: 'cycle' | 'hourly';
}

export interface BatchCycleCavityModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: ProductionMachine[];
  orders: ProductionOrder[];
  onApplyBatch: (
    updates: BatchMachineUpdate[],
    updateActiveOrders: boolean,
    updatePlannedOrders: boolean
  ) => void;
}

export default function BatchCycleCavityModal({
  isOpen,
  onClose,
  machines,
  orders,
  onApplyBatch,
}: BatchCycleCavityModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'uniform' | 'grid'>('paste');
  const [gridCategoryFilter, setGridCategoryFilter] = useState<'all' | 'mk' | 'blow' | 'label'>('all');

  // Sorted list of machines
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => {
      const getCategoryAndNum = (mCode: string, name: string, type?: string) => {
        const nameUpper = name.toUpperCase();
        if (type === 'label' || nameUpper.includes('LABEL') || mCode.toUpperCase().startsWith('L')) {
          const num = parseInt(mCode.replace(/\D/g, ''), 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
          return { cat: 2, num };
        }
        if (type === 'blow' || nameUpper.includes('BLOW') || mCode.toUpperCase().startsWith('B')) {
          const num = parseInt(mCode.replace(/\D/g, ''), 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
          return { cat: 3, num };
        }
        const num = parseInt(mCode, 10) || parseInt(name.replace(/\D/g, ''), 10) || 0;
        return { cat: 1, num };
      };
      const infoA = getCategoryAndNum(a.m, a.name, a.type);
      const infoB = getCategoryAndNum(b.m, b.name, b.type);
      if (infoA.cat !== infoB.cat) return infoA.cat - infoB.cat;
      return infoA.num - infoB.num;
    });
  }, [machines]);

  // Helper to determine machine type
  const getMachineType = (mach: ProductionMachine): 'injection' | 'blow' | 'label' => {
    if (mach.type) return mach.type;
    const nameUpper = mach.name.toUpperCase();
    if (nameUpper.includes('BLOW') || mach.m.toUpperCase().startsWith('B')) return 'blow';
    if (nameUpper.includes('LABEL') || mach.m.toUpperCase().startsWith('L')) return 'label';
    return 'injection';
  };

  // Helper to get active order for a machine
  const getActiveOrderForMachine = (machName: string) => {
    return orders.find(
      (o) => o.assignedMachine === machName && (o.status === 'In Progress' || o.status === 'Maintenance')
    );
  };

  // Helper to get default specs for a machine
  const getMachineCurrentSpecs = (mach: ProductionMachine) => {
    const activeOrder = getActiveOrderForMachine(mach.name);
    const mType = getMachineType(mach);
    const defaultMethod = (mType === 'blow' || mType === 'label') ? 'hourly' : 'cycle';
    const rateMethod = activeOrder?.productionRateMethod || mach.rateMethod || defaultMethod;
    const cycle = activeOrder?.cycleTime || mach.cycleTime || 12;
    const cavities = activeOrder?.cavities || mach.cavities || 1;
    const defaultHourly = mType === 'blow' ? 2400 : mType === 'label' ? 3500 : 1000;
    const hourlyRate = activeOrder?.hourlyRate || mach.hourlyRate || defaultHourly;
    return { cycle, cavities, hourlyRate, rateMethod, activeOrder, mType };
  };

  // Scope checkboxes
  const [updateActiveOrders, setUpdateActiveOrders] = useState(true);
  const [updatePlannedOrders, setUpdatePlannedOrders] = useState(true);

  // Tab 1: Uniform One-Button Setting
  const [uniformCategory, setUniformCategory] = useState<'all' | 'mk' | 'blow' | 'label'>('all');
  const [uniformCycle, setUniformCycle] = useState<number>(12);
  const [uniformCavities, setUniformCavities] = useState<number>(2);
  const [uniformBlowRate, setUniformBlowRate] = useState<number>(2400);
  const [uniformLabelRate, setUniformLabelRate] = useState<number>(3500);

  // Tab 2: Copy-Paste Text Area & Parser
  const [pasteText, setPasteText] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Tab 3: Interactive Grid State
  const [gridValues, setGridValues] = useState<{ 
    [machineName: string]: { 
      cycle: number; 
      cavities: number; 
      hourlyRate: number; 
      rateMethod: 'cycle' | 'hourly';
    } 
  }>({});
  const [copiedRowSpecs, setCopiedRowSpecs] = useState<{ 
    cycle: number; 
    cavities: number; 
    hourlyRate: number; 
    rateMethod: 'cycle' | 'hourly';
    mType: 'injection' | 'blow' | 'label';
  } | null>(null);

  // Initialize grid values when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialGrid: { 
        [machineName: string]: { 
          cycle: number; 
          cavities: number; 
          hourlyRate: number; 
          rateMethod: 'cycle' | 'hourly';
        } 
      } = {};
      sortedMachines.forEach((mach) => {
        const specs = getMachineCurrentSpecs(mach);
        initialGrid[mach.name] = { 
          cycle: specs.cycle, 
          cavities: specs.cavities,
          hourlyRate: specs.hourlyRate,
          rateMethod: specs.rateMethod
        };
      });
      setGridValues(initialGrid);
    }
  }, [isOpen, sortedMachines, orders]);

  // Parse pasted text into mapped machine updates
  const parsedPasteData = useMemo(() => {
    if (!pasteText.trim()) return [];

    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const results: Array<{
      matchedMachine?: ProductionMachine;
      originalLine: string;
      cycleTime: number;
      cavities: number;
      hourlyRate: number;
      rateMethod: 'cycle' | 'hourly';
      confidence: 'exact_name' | 'm_code' | 'sequential' | 'invalid';
    }> = [];

    lines.forEach((line, index) => {
      // Split by tab, comma, semicolon, pipe
      const parts = line.split(/[\t,|;]+/).map((p) => p.trim()).filter(Boolean);

      let foundMachine: ProductionMachine | undefined = undefined;
      let cycle = 12;
      let cavities = 1;
      let hourlyRate = 2400;
      let rateMethod: 'cycle' | 'hourly' = 'cycle';
      let confidence: 'exact_name' | 'm_code' | 'sequential' | 'invalid' = 'sequential';

      if (parts.length >= 3) {
        // Format: Machine Name/Code | (Mold or something) | Cycle | Cavity OR Machine | Cycle | Cavity
        const firstPart = parts[0];
        const machineByName = sortedMachines.find(
          (m) =>
            m.name.toLowerCase() === firstPart.toLowerCase() ||
            m.name.toLowerCase().replace(/\s+/g, '') === firstPart.toLowerCase().replace(/\s+/g, '')
        );
        const machineByM = sortedMachines.find(
          (m) =>
            m.m.toLowerCase() === firstPart.toLowerCase() ||
            `mk ${m.m}`.toLowerCase() === firstPart.toLowerCase() ||
            `mk${m.m}`.toLowerCase() === firstPart.toLowerCase() ||
            `blow ${m.m}`.toLowerCase() === firstPart.toLowerCase() ||
            `label ${m.m}`.toLowerCase() === firstPart.toLowerCase()
        );

        foundMachine = machineByName || machineByM;
        if (foundMachine) {
          confidence = machineByName ? 'exact_name' : 'm_code';
        }

        const mType = foundMachine ? getMachineType(foundMachine) : 'injection';
        const numbers = parts.slice(1).map((p) => parseFloat(p.replace(/[^\d.]/g, ''))).filter((n) => !isNaN(n) && n > 0);

        if (mType === 'blow' || mType === 'label') {
          rateMethod = 'hourly';
          if (numbers.length >= 1) {
            // Usually the largest or first number is the bottles/hr rate
            hourlyRate = numbers[0] < 50 ? Math.round(numbers[0] * 1000) : numbers[0];
          }
        } else {
          rateMethod = 'cycle';
          if (numbers.length >= 2) {
            cycle = numbers[numbers.length - 2];
            cavities = Math.round(numbers[numbers.length - 1]);
          } else if (numbers.length === 1) {
            cycle = numbers[0];
          }
        }
      } else if (parts.length === 2) {
        // Format: Machine \t Speed OR Cycle \t Cavity
        const firstPart = parts[0];
        const machineByName = sortedMachines.find(
          (m) => m.name.toLowerCase() === firstPart.toLowerCase() || m.m.toLowerCase() === firstPart.toLowerCase()
        );

        const num1 = parseFloat(parts[0].replace(/[^\d.]/g, ''));
        const num2 = parseFloat(parts[1].replace(/[^\d.]/g, ''));

        if (machineByName && !isNaN(num2)) {
          foundMachine = machineByName;
          confidence = 'exact_name';
          const mType = getMachineType(machineByName);
          if (mType === 'blow' || mType === 'label' || num2 > 100) {
            rateMethod = 'hourly';
            hourlyRate = num2;
          } else {
            rateMethod = 'cycle';
            cycle = num2;
            cavities = 1;
          }
        } else if (!isNaN(num1) && !isNaN(num2)) {
          // [Num1, Num2]
          if (index < sortedMachines.length) {
            foundMachine = sortedMachines[index];
            confidence = 'sequential';
            const mType = getMachineType(foundMachine);
            if (mType === 'blow' || mType === 'label') {
              rateMethod = 'hourly';
              hourlyRate = num1 > 100 ? num1 : num2;
            } else {
              rateMethod = 'cycle';
              cycle = num1;
              cavities = Math.round(num2);
            }
          }
        }
      } else if (parts.length === 1) {
        // Single value (e.g. "2400" or "12.5" or "MK 1: 15s 2cav")
        const targetMach = index < sortedMachines.length ? sortedMachines[index] : undefined;
        const mType = targetMach ? getMachineType(targetMach) : 'injection';

        const numMatches = line.match(/\d+(\.\d+)?/g);
        if (numMatches && numMatches.length >= 2 && mType === 'injection') {
          cycle = parseFloat(numMatches[0]);
          cavities = Math.round(parseFloat(numMatches[1]));
          rateMethod = 'cycle';
        } else if (numMatches && numMatches.length >= 1) {
          const val = parseFloat(numMatches[0]);
          if (mType === 'blow' || mType === 'label' || val > 100) {
            rateMethod = 'hourly';
            hourlyRate = val;
          } else {
            rateMethod = 'cycle';
            cycle = val;
          }
        }

        if (targetMach) {
          foundMachine = targetMach;
          confidence = 'sequential';
        }
      }

      if (foundMachine) {
        const mType = getMachineType(foundMachine);
        results.push({
          matchedMachine: foundMachine,
          originalLine: line,
          cycleTime: cycle,
          cavities: Math.max(1, cavities),
          hourlyRate: Math.max(0, hourlyRate),
          rateMethod: (mType === 'blow' || mType === 'label') ? 'hourly' : rateMethod,
          confidence,
        });
      } else if (index < sortedMachines.length) {
        const m = sortedMachines[index];
        const mType = getMachineType(m);
        results.push({
          matchedMachine: m,
          originalLine: line,
          cycleTime: cycle,
          cavities: Math.max(1, cavities),
          hourlyRate: Math.max(0, hourlyRate),
          rateMethod: (mType === 'blow' || mType === 'label') ? 'hourly' : rateMethod,
          confidence: 'sequential',
        });
      }
    });

    return results;
  }, [pasteText, sortedMachines]);

  // Quick Copy Current Table to Clipboard
  const handleCopyCurrentTableToClipboard = () => {
    const header = 'Machine\tType\tMold\tRate Method\tCycle (s)\tCavities\tOutput (Bottles or pcs/hr)';
    const rows = sortedMachines.map((m) => {
      const specs = getMachineCurrentSpecs(m);
      const isHourly = specs.rateMethod === 'hourly';
      const outputRate = isHourly 
        ? specs.hourlyRate 
        : (specs.cycle > 0 ? Math.round((3600 / specs.cycle) * specs.cavities) : 0);
      
      const typeLabel = specs.mType === 'blow' ? 'Blow Molding' : specs.mType === 'label' ? 'Labeling' : 'Injection';
      const cycleVal = isHourly ? '-' : specs.cycle.toString();
      const cavVal = isHourly ? '-' : specs.cavities.toString();

      return `${m.name}\t${typeLabel}\t${m.moldName || '-'}\t${specs.rateMethod}\t${cycleVal}\t${cavVal}\t${outputRate}`;
    });
    const content = [header, ...rows].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(() => {
        setCopiedNotification('Copied factory machines speed & cavity table to clipboard!');
        setTimeout(() => setCopiedNotification(null), 3000);
      });
    } else {
      setPasteText(content);
      setCopiedNotification('Populated in paste text box below!');
      setTimeout(() => setCopiedNotification(null), 3000);
    }
  };

  // Quick Paste from System Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPasteText(text);
          setCopiedNotification('Data pasted from clipboard successfully!');
          setTimeout(() => setCopiedNotification(null), 3000);
        }
      } else {
        const manualText = prompt('Paste your table or copied Excel rows here:');
        if (manualText) {
          setPasteText(manualText);
        }
      }
    } catch {
      const manualText = prompt('Paste your table or copied Excel rows here:');
      if (manualText) {
        setPasteText(manualText);
      }
    }
  };

  // 1-Click Apply for Uniform Tab
  const handleApplyUniform = () => {
    const updates: BatchMachineUpdate[] = [];

    sortedMachines.forEach((m) => {
      const mType = getMachineType(m);

      if (uniformCategory === 'mk' && mType === 'injection') {
        updates.push({
          machineName: m.name,
          cycleTime: uniformCycle,
          cavities: uniformCavities,
          rateMethod: 'cycle',
        });
      } else if (uniformCategory === 'blow' && mType === 'blow') {
        updates.push({
          machineName: m.name,
          hourlyRate: uniformBlowRate,
          rateMethod: 'hourly',
        });
      } else if (uniformCategory === 'label' && mType === 'label') {
        updates.push({
          machineName: m.name,
          hourlyRate: uniformLabelRate,
          rateMethod: 'hourly',
        });
      } else if (uniformCategory === 'all') {
        if (mType === 'blow') {
          updates.push({
            machineName: m.name,
            hourlyRate: uniformBlowRate,
            rateMethod: 'hourly',
          });
        } else if (mType === 'label') {
          updates.push({
            machineName: m.name,
            hourlyRate: uniformLabelRate,
            rateMethod: 'hourly',
          });
        } else {
          updates.push({
            machineName: m.name,
            cycleTime: uniformCycle,
            cavities: uniformCavities,
            rateMethod: 'cycle',
          });
        }
      }
    });

    onApplyBatch(updates, updateActiveOrders, updatePlannedOrders);
    onClose();
  };

  // 1-Click Apply for Paste Tab
  const handleApplyPaste = () => {
    if (parsedPasteData.length === 0) return;

    const updates: BatchMachineUpdate[] = parsedPasteData
      .filter((p) => p.matchedMachine)
      .map((p) => ({
        machineName: p.matchedMachine!.name,
        cycleTime: p.cycleTime,
        cavities: p.cavities,
        hourlyRate: p.hourlyRate,
        rateMethod: p.rateMethod,
      }));

    onApplyBatch(updates, updateActiveOrders, updatePlannedOrders);
    onClose();
  };

  // 1-Click Apply for Interactive Grid Tab
  const handleApplyGrid = () => {
    const updates: BatchMachineUpdate[] = sortedMachines.map((m) => {
      const val = gridValues[m.name] || getMachineCurrentSpecs(m);
      return {
        machineName: m.name,
        cycleTime: val.cycle || 12,
        cavities: val.cavities || 1,
        hourlyRate: val.hourlyRate || 2400,
        rateMethod: val.rateMethod || 'cycle',
      };
    });

    onApplyBatch(updates, updateActiveOrders, updatePlannedOrders);
    onClose();
  };

  // Smart Fill Down from First Matching Machine
  const handleFillDownFirstRow = () => {
    if (sortedMachines.length === 0) return;

    const newGrid = { ...gridValues };

    if (gridCategoryFilter === 'blow') {
      const firstBlow = sortedMachines.find((m) => getMachineType(m) === 'blow');
      if (firstBlow) {
        const val = gridValues[firstBlow.name] || getMachineCurrentSpecs(firstBlow);
        sortedMachines.filter((m) => getMachineType(m) === 'blow').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
        setCopiedNotification(`Applied ${firstBlow.name} rate (${val.hourlyRate.toLocaleString()} bottles/hr) to all Blow machines!`);
      }
    } else if (gridCategoryFilter === 'label') {
      const firstLabel = sortedMachines.find((m) => getMachineType(m) === 'label');
      if (firstLabel) {
        const val = gridValues[firstLabel.name] || getMachineCurrentSpecs(firstLabel);
        sortedMachines.filter((m) => getMachineType(m) === 'label').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
        setCopiedNotification(`Applied ${firstLabel.name} rate (${val.hourlyRate.toLocaleString()} bottles/hr) to all Label machines!`);
      }
    } else if (gridCategoryFilter === 'mk') {
      const firstMK = sortedMachines.find((m) => getMachineType(m) === 'injection');
      if (firstMK) {
        const val = gridValues[firstMK.name] || getMachineCurrentSpecs(firstMK);
        sortedMachines.filter((m) => getMachineType(m) === 'injection').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
        setCopiedNotification(`Applied ${firstMK.name} specs (${val.cycle}s, ${val.cavities} cav) to all Injection machines!`);
      }
    } else {
      // Global fill-down: apply top injection to injection, top blow to blow, top label to label
      const firstMK = sortedMachines.find((m) => getMachineType(m) === 'injection');
      const firstBlow = sortedMachines.find((m) => getMachineType(m) === 'blow');
      const firstLabel = sortedMachines.find((m) => getMachineType(m) === 'label');

      if (firstMK) {
        const val = gridValues[firstMK.name] || getMachineCurrentSpecs(firstMK);
        sortedMachines.filter((m) => getMachineType(m) === 'injection').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
      }
      if (firstBlow) {
        const val = gridValues[firstBlow.name] || getMachineCurrentSpecs(firstBlow);
        sortedMachines.filter((m) => getMachineType(m) === 'blow').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
      }
      if (firstLabel) {
        const val = gridValues[firstLabel.name] || getMachineCurrentSpecs(firstLabel);
        sortedMachines.filter((m) => getMachineType(m) === 'label').forEach((m) => {
          newGrid[m.name] = { ...val };
        });
      }
      setCopiedNotification('Applied leading specifications across all machine types category-wise!');
    }

    setGridValues(newGrid);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Filtered machines for Matrix view
  const displayMachines = useMemo(() => {
    if (gridCategoryFilter === 'all') return sortedMachines;
    return sortedMachines.filter((m) => {
      const t = getMachineType(m);
      if (gridCategoryFilter === 'mk') return t === 'injection';
      if (gridCategoryFilter === 'blow') return t === 'blow';
      if (gridCategoryFilter === 'label') return t === 'label';
      return true;
    });
  }, [sortedMachines, gridCategoryFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans text-primary">
      <div className="bg-surface border border-divider rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-surface-elevated/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                Batch Speed & Cavities Quick-Updater
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Copy & Paste + One-Button
                </span>
              </h3>
              <p className="text-xs text-tertiary">
                Update cycle times (Injection) and bottles per hour rates (Blow & Label machines) across the factory with 1 click.
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

        {/* Notification Toast if copied */}
        {copiedNotification && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2 text-xs font-bold text-emerald-400 flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {copiedNotification}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-divider px-6 bg-surface/30 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-amber-500 text-amber-400 font-extrabold'
                  : 'border-transparent text-tertiary hover:text-secondary'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              1. Direct Copy & Paste (Excel / Text)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('uniform')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'uniform'
                  ? 'border-amber-500 text-amber-400 font-extrabold'
                  : 'border-transparent text-tertiary hover:text-secondary'
              }`}
            >
              <Zap className="w-4 h-4" />
              2. One-Button Uniform Setter
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'grid'
                  ? 'border-amber-500 text-amber-400 font-extrabold'
                  : 'border-transparent text-tertiary hover:text-secondary'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              3. Interactive Machine Grid Matrix ({sortedMachines.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCurrentTableToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-secondary bg-surface-elevated hover:bg-surface-elevated/80 border border-divider rounded-lg transition-colors cursor-pointer"
            title="Copy current active cycle times, cavities, and bottles/hr rates to clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            Copy All to Clipboard
          </button>
        </div>

        {/* Global Scope Options Banner */}
        <div className="px-6 py-2.5 bg-canvas/40 border-b border-divider flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-tertiary font-medium">Apply updates to:</span>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateActiveOrders}
                onChange={(e) => setUpdateActiveOrders(e.target.checked)}
                className="w-4 h-4 rounded border-divider text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold text-secondary">Active Running Orders (Live Timers)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updatePlannedOrders}
                onChange={(e) => setUpdatePlannedOrders(e.target.checked)}
                className="w-4 h-4 rounded border-divider text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold text-secondary">Queued Planned Orders</span>
            </label>
            <span className="text-amber-400/80 font-mono text-[11px]">
              ({sortedMachines.length} total machines)
            </span>
          </div>
        </div>

        {/* Body Content by Tab */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: COPY & PASTE FROM EXCEL OR TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-5">
              <div className="bg-canvas border border-divider rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-amber-400" />
                    Paste Data from Excel, Sheets, or Text
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Paste from Clipboard
                    </button>
                    {pasteText && (
                      <button
                        type="button"
                        onClick={() => setPasteText('')}
                        className="px-2.5 py-1 text-xs text-tertiary hover:text-red-400 transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste table columns from Excel (e.g. Cycle & Cavity for Injection, Bottles/hr for Blow & Label)\nExample 1 (Cycle & Cavity for Injection):\n12.5\t2\n10.0\t4\n14.2\t1\n\nExample 2 (Machine + Speed / Cavities):\nMK 1\t12.0\t2\nMK 2\t15.0\t4\nBLOW 1\t2400\nLABEL 1\t3500`}
                  rows={6}
                  className="w-full px-3.5 py-2.5 bg-surface text-primary border border-divider rounded-lg text-xs font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-quaternary"
                />

                <div className="flex flex-wrap items-center justify-between text-[11px] text-tertiary gap-2 bg-surface-elevated/40 px-3 py-2 rounded-lg">
                  <span>💡 <strong>Tip:</strong> Copy 2 columns from your spreadsheet and press Ctrl+V. Injection machines automatically parse as Cycle & Cavity, while Blow & Label machines parse as Bottles/Hour.</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Demo template including injection + blow + label
                      const demoRows = sortedMachines.slice(0, 12).map((m, i) => {
                        const t = getMachineType(m);
                        if (t === 'blow') return `${m.name}\t${2000 + (i % 4) * 400}`;
                        if (t === 'label') return `${m.name}\t${3000 + (i % 3) * 500}`;
                        return `${m.name}\t${10 + (i % 5) * 2}\t${(i % 4) + 1}`;
                      });
                      setPasteText(demoRows.join('\n'));
                    }}
                    className="text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                  >
                    Insert Example Factory Data
                  </button>
                </div>
              </div>

              {/* Parsed Preview Table */}
              {parsedPasteData.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Parsed Updates Preview ({parsedPasteData.length} lines detected)
                    </h4>
                    <span className="text-xs text-emerald-400 font-medium">Ready to apply to database</span>
                  </div>

                  <div className="border border-divider rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-surface-elevated/60 text-secondary sticky top-0 border-b border-divider font-bold">
                        <tr>
                          <th className="text-center px-4 py-2.5">#</th>
                          <th className="text-left px-4 py-2.5">Target Machine</th>
                          <th className="text-left px-4 py-2.5">Type</th>
                          <th className="text-center px-4 py-2.5 text-amber-400">Rate Method</th>
                          <th className="text-center px-4 py-2.5 text-amber-400">Parsed Value</th>
                          <th className="text-right px-4 py-2.5">Production Output</th>
                          <th className="text-center px-4 py-2.5">Match Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider font-sans">
                        {parsedPasteData.map((item, idx) => {
                          const mach = item.matchedMachine;
                          const isHourly = item.rateMethod === 'hourly';
                          const hourlyOutput = isHourly 
                            ? item.hourlyRate 
                            : (item.cycleTime > 0 ? Math.round((3600 / item.cycleTime) * item.cavities) : 0);

                          const mType = mach ? getMachineType(mach) : 'injection';

                          return (
                            <tr key={idx} className="hover:bg-surface-elevated/30 text-secondary">
                              <td className="text-center px-4 py-2 text-tertiary font-mono">{idx + 1}</td>
                              <td className="text-left px-4 py-2 font-bold text-primary">
                                {mach ? mach.name : <span className="text-red-400">Unmatched</span>}
                              </td>
                              <td className="text-left px-4 py-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  mType === 'blow' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' :
                                  mType === 'label' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                                  'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {mType === 'blow' ? 'Blow' : mType === 'label' ? 'Label' : 'Injection'}
                                </span>
                              </td>
                              <td className="text-center px-4 py-2 font-semibold">
                                {isHourly ? (
                                  <span className="text-cyan-400">Bottles / Hour</span>
                                ) : (
                                  <span className="text-amber-400">Cycle & Cavities</span>
                                )}
                              </td>
                              <td className="text-center px-4 py-2 font-mono font-bold text-amber-400 bg-amber-500/5">
                                {isHourly ? (
                                  <span>{item.hourlyRate.toLocaleString()} bottles/hr</span>
                                ) : (
                                  <span>{item.cycleTime}s &times; {item.cavities} cav</span>
                                )}
                              </td>
                              <td className="text-right px-4 py-2 font-mono text-emerald-400 font-semibold">
                                {hourlyOutput.toLocaleString()} {isHourly ? 'bottles/hr' : 'pcs/hr'}
                              </td>
                              <td className="text-center px-4 py-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                                  {item.confidence}
                                </span>
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
          )}

          {/* TAB 2: UNIFORM ONE-BUTTON SETTER */}
          {activeTab === 'uniform' && (
            <div className="space-y-6">
              <div className="bg-canvas border border-divider rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-primary">Set Factory Machines to Baseline Speeds</h4>
                      <p className="text-xs text-tertiary">Quickly assign standard cycle times or hourly bottle rates across machine categories with one click.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary font-bold">Category:</span>
                    <select
                      value={uniformCategory}
                      onChange={(e: any) => setUniformCategory(e.target.value)}
                      className="px-3 py-1.5 bg-surface text-primary border border-divider rounded-lg text-xs font-semibold outline-none focus:border-amber-500"
                    >
                      <option value="all">⚡ All Factory Machines (Injection + Blow + Label)</option>
                      <option value="mk">Injection Only (MK 1..MK 26)</option>
                      <option value="blow">Blow Molding (BLOW 1..BLOW 7 - Bottles/Hr)</option>
                      <option value="label">Labeling (LABEL 1..2 - Bottles/Hr)</option>
                    </select>
                  </div>
                </div>

                {/* Sub-block 1: Injection Section (if 'all' or 'mk') */}
                {(uniformCategory === 'all' || uniformCategory === 'mk') && (
                  <div className="p-4 bg-surface-elevated/30 border border-divider rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        <Flame className="w-4 h-4 text-blue-400" />
                        Injection Machines (MK 1..MK 26) - Cycle Time & Cavities
                      </h5>
                      <span className="text-[11px] font-mono text-tertiary">
                        {sortedMachines.filter(m => getMachineType(m) === 'injection').length} machines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1">Cycle Time (seconds)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={uniformCycle}
                            onChange={(e) => setUniformCycle(Math.max(0.1, Number(e.target.value)))}
                            className="w-full px-3.5 py-2 bg-surface text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tertiary font-mono font-semibold">sec</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1">Cavities (Parts per Shot)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="128"
                            value={uniformCavities}
                            onChange={(e) => setUniformCavities(Math.max(1, Math.round(Number(e.target.value))))}
                            className="w-full px-3.5 py-2 bg-surface text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tertiary font-mono font-semibold">cav</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Shots / min</span>
                        <span className="font-mono font-bold text-secondary">{uniformCycle > 0 ? (60 / uniformCycle).toFixed(1) : 0} /min</span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Hourly Rate</span>
                        <span className="font-mono font-bold text-blue-400">
                          {uniformCycle > 0 ? Math.round((3600 / uniformCycle) * uniformCavities).toLocaleString() : 0} pcs/hr
                        </span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Daily Output</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {uniformCycle > 0 ? Math.round(((3600 * 24) / uniformCycle) * uniformCavities).toLocaleString() : 0} pcs/day
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-block 2: Blow Molding Section (if 'all' or 'blow') */}
                {(uniformCategory === 'all' || uniformCategory === 'blow') && (
                  <div className="p-4 bg-surface-elevated/30 border border-divider rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        Blow Molding Machines (BLOW 1..BLOW 7) - Hourly Speed (Bottles / Hour)
                      </h5>
                      <span className="text-[11px] font-mono text-tertiary">
                        {sortedMachines.filter(m => getMachineType(m) === 'blow').length} machines
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-secondary">Hourly Production Speed (Bottles / hr)</label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={uniformBlowRate}
                            onChange={(e) => setUniformBlowRate(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3.5 py-2 bg-surface text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-cyan-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tertiary font-mono font-semibold">bottles/hr</span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex gap-1.5">
                          {[1800, 2400, 3000, 3600, 4800].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => setUniformBlowRate(rate)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                                uniformBlowRate === rate
                                  ? 'bg-cyan-500 text-white font-bold'
                                  : 'bg-surface hover:bg-surface-elevated text-secondary border border-divider'
                              }`}
                            >
                              {rate.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Bottles / minute</span>
                        <span className="font-mono font-bold text-secondary">{uniformBlowRate > 0 ? (uniformBlowRate / 60).toFixed(1) : '0.0'} bpm</span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Hourly Output</span>
                        <span className="font-mono font-bold text-cyan-400">{uniformBlowRate.toLocaleString()} bottles/hr</span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Daily Output</span>
                        <span className="font-mono font-bold text-emerald-400">{(uniformBlowRate * 24).toLocaleString()} bottles/day</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-block 3: Label Machines Section (if 'all' or 'label') */}
                {(uniformCategory === 'all' || uniformCategory === 'label') && (
                  <div className="p-4 bg-surface-elevated/30 border border-divider rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                        <Tag className="w-4 h-4 text-purple-400" />
                        Labeling Machines (LABEL 1..LABEL 2) - Hourly Speed (Bottles / Hour)
                      </h5>
                      <span className="text-[11px] font-mono text-tertiary">
                        {sortedMachines.filter(m => getMachineType(m) === 'label').length} machines
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-secondary">Hourly Production Speed (Bottles / hr)</label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={uniformLabelRate}
                            onChange={(e) => setUniformLabelRate(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3.5 py-2 bg-surface text-primary border border-divider rounded-lg text-sm font-mono font-bold outline-none focus:border-purple-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tertiary font-mono font-semibold">bottles/hr</span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex gap-1.5">
                          {[2500, 3500, 5000, 6000, 8000].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => setUniformLabelRate(rate)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                                uniformLabelRate === rate
                                  ? 'bg-purple-500 text-white font-bold'
                                  : 'bg-surface hover:bg-surface-elevated text-secondary border border-divider'
                              }`}
                            >
                              {rate.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Labels / minute</span>
                        <span className="font-mono font-bold text-secondary">{uniformLabelRate > 0 ? (uniformLabelRate / 60).toFixed(1) : '0.0'} bpm</span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Hourly Output</span>
                        <span className="font-mono font-bold text-purple-400">{uniformLabelRate.toLocaleString()} bottles/hr</span>
                      </div>
                      <div className="bg-canvas/50 p-2 rounded-lg border border-divider-subtle">
                        <span className="text-[10px] text-tertiary block">Daily Output</span>
                        <span className="font-mono font-bold text-emerald-400">{(uniformLabelRate * 24).toLocaleString()} bottles/day</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE MACHINE GRID MATRIX */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 bg-surface-elevated/40 p-1 rounded-xl border border-divider">
                  <button
                    type="button"
                    onClick={() => setGridCategoryFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      gridCategoryFilter === 'all'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-tertiary hover:text-secondary'
                    }`}
                  >
                    All ({sortedMachines.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCategoryFilter('mk')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      gridCategoryFilter === 'mk'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-tertiary hover:text-secondary'
                    }`}
                  >
                    Injection ({sortedMachines.filter(m => getMachineType(m) === 'injection').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCategoryFilter('blow')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      gridCategoryFilter === 'blow'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-tertiary hover:text-secondary'
                    }`}
                  >
                    Blow ({sortedMachines.filter(m => getMachineType(m) === 'blow').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCategoryFilter('label')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      gridCategoryFilter === 'label'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-tertiary hover:text-secondary'
                    }`}
                  >
                    Label ({sortedMachines.filter(m => getMachineType(m) === 'label').length})
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleFillDownFirstRow}
                    className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-elevated/80 border border-divider text-secondary rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Apply top machine values to all machines below"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    Fill Top Row to All Below
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const resetGrid: { 
                        [m: string]: { 
                          cycle: number; 
                          cavities: number; 
                          hourlyRate: number; 
                          rateMethod: 'cycle' | 'hourly';
                        } 
                      } = {};
                      sortedMachines.forEach((m) => {
                        const s = getMachineCurrentSpecs(m);
                        resetGrid[m.name] = { 
                          cycle: s.cycle, 
                          cavities: s.cavities,
                          hourlyRate: s.hourlyRate,
                          rateMethod: s.rateMethod
                        };
                      });
                      setGridValues(resetGrid);
                      setCopiedNotification('Reset values to active machine defaults.');
                      setTimeout(() => setCopiedNotification(null), 2500);
                    }}
                    className="px-3 py-1.5 text-xs text-tertiary hover:text-secondary flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="border border-divider rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-surface-elevated/60 text-secondary sticky top-0 border-b border-divider font-bold z-10">
                    <tr>
                      <th className="text-center px-3 py-2.5 w-[65px]">M</th>
                      <th className="text-left px-4 py-2.5">Machine</th>
                      <th className="text-left px-3 py-2.5 w-[90px]">Type</th>
                      <th className="text-left px-4 py-2.5">Active Mold</th>
                      <th className="text-center px-4 py-2.5 w-[200px]">Speed / Cavities Tuning</th>
                      <th className="text-right px-4 py-2.5 w-[130px]">Hourly Output</th>
                      <th className="text-center px-4 py-2.5 w-[90px]">Copy / Paste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider font-sans">
                    {displayMachines.map((m) => {
                      const currentVal = gridValues[m.name] || getMachineCurrentSpecs(m);
                      const mType = getMachineType(m);
                      const isHourly = currentVal.rateMethod === 'hourly';
                      const hourlyOutput = isHourly 
                        ? (currentVal.hourlyRate || 2400) 
                        : (currentVal.cycle > 0 ? Math.round((3600 / currentVal.cycle) * currentVal.cavities) : 0);
                      const activeOrder = getActiveOrderForMachine(m.name);

                      return (
                        <tr key={m.id} className="hover:bg-surface-elevated/30 text-secondary transition-colors">
                          <td className="text-center px-3 py-2 font-mono font-bold text-primary">{m.m}</td>
                          <td className="text-left px-4 py-2 font-bold text-primary">
                            <div className="flex items-center gap-1.5">
                              {activeOrder && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                              <span>{m.name}</span>
                            </div>
                          </td>
                          <td className="text-left px-3 py-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              mType === 'blow' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' :
                              mType === 'label' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                              'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}>
                              {mType === 'blow' ? 'Blow' : mType === 'label' ? 'Label' : 'Inj'}
                            </span>
                          </td>
                          <td className="text-left px-4 py-2 text-tertiary truncate max-w-[130px]">
                            <bdi dir="rtl">{m.moldName || '-'}</bdi>
                          </td>

                          {/* Dynamic Speed Input Cell */}
                          <td className="text-center px-3 py-1.5">
                            {isHourly ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={currentVal.hourlyRate || 0}
                                    onChange={(e) => {
                                      const newRate = Math.max(0, Number(e.target.value));
                                      setGridValues((prev) => ({
                                        ...prev,
                                        [m.name]: { ...currentVal, hourlyRate: newRate },
                                      }));
                                    }}
                                    className="w-28 px-2 py-1 bg-surface text-center font-mono font-bold text-primary border border-divider rounded-md text-xs outline-none focus:border-cyan-500"
                                  />
                                </div>
                                <span className="text-[10px] text-tertiary font-mono font-semibold">b/hr</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    value={currentVal.cycle}
                                    onChange={(e) => {
                                      const newCycle = Math.max(0.1, Number(e.target.value));
                                      setGridValues((prev) => ({
                                        ...prev,
                                        [m.name]: { ...currentVal, cycle: newCycle },
                                      }));
                                    }}
                                    className="w-16 px-1.5 py-1 bg-surface text-center font-mono font-bold text-primary border border-divider rounded-md text-xs outline-none focus:border-amber-500"
                                    title="Cycle Time (s)"
                                  />
                                  <span className="text-[10px] text-tertiary font-mono">s</span>
                                </div>
                                <span className="text-tertiary font-bold">&times;</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="128"
                                    value={currentVal.cavities}
                                    onChange={(e) => {
                                      const newCav = Math.max(1, Math.round(Number(e.target.value)));
                                      setGridValues((prev) => ({
                                        ...prev,
                                        [m.name]: { ...currentVal, cavities: newCav },
                                      }));
                                    }}
                                    className="w-14 px-1.5 py-1 bg-surface text-center font-mono font-bold text-primary border border-divider rounded-md text-xs outline-none focus:border-amber-500"
                                    title="Cavities"
                                  />
                                  <span className="text-[10px] text-tertiary font-mono">cav</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="text-right px-4 py-2 font-mono font-semibold">
                            <span className={isHourly ? 'text-cyan-400' : 'text-emerald-400'}>
                              {hourlyOutput.toLocaleString()} {isHourly ? 'b/hr' : 'pcs/hr'}
                            </span>
                          </td>

                          <td className="text-center px-3 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCopiedRowSpecs({ 
                                    cycle: currentVal.cycle, 
                                    cavities: currentVal.cavities,
                                    hourlyRate: currentVal.hourlyRate || 2400,
                                    rateMethod: currentVal.rateMethod,
                                    mType
                                  });
                                  const desc = isHourly ? `${currentVal.hourlyRate} b/hr` : `${currentVal.cycle}s, ${currentVal.cavities} cav`;
                                  setCopiedNotification(`Copied specs from ${m.name} (${desc})!`);
                                  setTimeout(() => setCopiedNotification(null), 2500);
                                }}
                                className="p-1 hover:bg-surface-elevated text-secondary hover:text-amber-400 rounded transition cursor-pointer"
                                title="Copy this machine's specs"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (copiedRowSpecs) {
                                    setGridValues((prev) => ({
                                      ...prev,
                                      [m.name]: { 
                                        ...currentVal, 
                                        cycle: copiedRowSpecs.cycle, 
                                        cavities: copiedRowSpecs.cavities,
                                        hourlyRate: copiedRowSpecs.hourlyRate,
                                        rateMethod: (mType === 'blow' || mType === 'label') ? 'hourly' : copiedRowSpecs.rateMethod
                                      },
                                    }));
                                  } else {
                                    alert('First click the copy icon on any row to copy its specs!');
                                  }
                                }}
                                className={`p-1 rounded transition cursor-pointer ${
                                  copiedRowSpecs ? 'hover:bg-surface-elevated text-secondary hover:text-emerald-400' : 'text-quaternary opacity-50'
                                }`}
                                title="Paste copied specs to this machine"
                              >
                                <ClipboardPaste className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* Footer Actions with One-Button Execution */}
        <div className="px-6 py-4 border-t border-divider flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {activeTab === 'paste' && (
              <button
                type="button"
                disabled={parsedPasteData.length === 0}
                onClick={handleApplyPaste}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-300" />
                ⚡ Apply Pasted Specs to All Machines (One Click)
              </button>
            )}

            {activeTab === 'uniform' && (
              <button
                type="button"
                onClick={handleApplyUniform}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-300" />
                ⚡ Apply Uniform Factory Speeds (One Click)
              </button>
            )}

            {activeTab === 'grid' && (
              <button
                type="button"
                onClick={handleApplyGrid}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                ⚡ Save & Apply All Matrix Changes (One Click)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
