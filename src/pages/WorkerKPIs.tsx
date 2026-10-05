import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { useJobTitles } from '../hooks/useJobTitles';
import { logAction } from '../utils/logger';
import ExcelJS from 'exceljs';
import { WorkerKPINotes } from "../components/WorkerKPINotes";
import { 
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Download,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Plus,
  Trash2,
  Save,
  PenTool,
  Search,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type RoleKPI = {
  id: string;
  name: string;
  maxScore: number;
};

export default function WorkerKPIs() {
  const [jobTitles] = useJobTitles();
  const [workersData] = useLocalStorage<any[]>('workers_data', []);
  const [roleKPIs, setRoleKPIs] = useLocalStorage<Record<string, RoleKPI[]>>('role_kpis', {});
  const [workerScores, setWorkerScores] = useLocalStorage<Record<string, Record<string, Record<string, number>>>>('worker_kpi_scores', {}); // workerId -> quarter -> kpiId -> score
  const [allNotes] = useLocalStorage<Record<string, any[]>>('worker_notes', {});

  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  // Modal States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedRoleForConfig, setSelectedRoleForConfig] = useState<string>('');
  const [tempKPIs, setTempKPIs] = useState<RoleKPI[]>([]);
  
  const [evalWorker, setEvalWorker] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('All');

  const now = new Date();
  
  const generateQuarters = () => {
    const quarters = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let q = Math.floor(currentMonth / 3);
    let y = currentYear;
    for (let i = 0; i < 4; i++) {
      quarters.push(`Q${q + 1} ${y}`);
      q--;
      if (q < 0) {
        q = 3;
        y--;
      }
    }
    return quarters.reverse();
  };

  const quartersList = useMemo(() => generateQuarters(), [now]);
  const currentQuarter = quartersList[quartersList.length - 1];

  const jobRoles = useMemo(() => {
    const roles = new Set<string>(jobTitles);
    workersData.forEach(w => {
      if (w.jobTitle) roles.add(w.jobTitle);
    });
    return Array.from(roles).sort();
  }, [workersData, jobTitles]);

  const evaluatedWorkers = useMemo(() => {
    const activeWorkers = workersData.filter((w: any) => w.status === 'Active');
    
    return activeWorkers.map(w => {
      const hireDate = w.startDate ? new Date(w.startDate) : new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      
      const tenureEligible = hireDate <= sixMonthsAgo;
      
      const recentWarnings = (w.actionHistory || []).filter((action: any) => {
        if (!action.type?.toLowerCase().includes('warning')) return false;
        const actionDate = new Date(action.date);
        return actionDate >= threeMonthsAgo;
      });

      const isEligible = tenureEligible && recentWarnings.length === 0;

      // Calculate score based on actual inputs
      const kpisForRole = roleKPIs[w.jobTitle] || [];
      const hasConfiguredKPIs = kpisForRole.length > 0;
      
      const scoresForWorker = workerScores[w.id] || {};
      const currentQuarterScores = scoresForWorker[currentQuarter] || {};

      let currentScore = 0;
      let maxPossibleScore = 0;
      let hasScoresForCurrentQuarter = false;

      if (hasConfiguredKPIs) {
        kpisForRole.forEach(kpi => {
          maxPossibleScore += kpi.maxScore;
          if (currentQuarterScores[kpi.id] !== undefined) {
            currentScore += currentQuarterScores[kpi.id];
            hasScoresForCurrentQuarter = true;
          }
        });
        
        // Normalize to 100 if there's a score
        if (maxPossibleScore > 0 && hasScoresForCurrentQuarter) {
          currentScore = Math.round((currentScore / maxPossibleScore) * 100);
        } else {
          currentScore = 0; // Or keep it 0 if not scored yet
        }
      }

      // Deductions
      const absencePenalty = (w.absences || 0) * 5;
      const historyPenalty = (w.actionHistory || []).length * 8;
      
      if (hasScoresForCurrentQuarter) {
        currentScore = currentScore - absencePenalty - historyPenalty;
        currentScore = Math.max(0, Math.min(100, currentScore));
      } else {
        // Fallback or un-scored
        currentScore = 0;
      }

      const quarterScores = quartersList.map((q, idx) => {
        let qScore = 0;
        let qMax = 0;
        let hasQScore = false;
        const qScores = scoresForWorker[q] || {};
        
        if (hasConfiguredKPIs) {
          kpisForRole.forEach(kpi => {
            qMax += kpi.maxScore;
            if (qScores[kpi.id] !== undefined) {
              qScore += qScores[kpi.id];
              hasQScore = true;
            }
          });
        }
        
        let finalQScore = 0;
        if (hasQScore && qMax > 0) {
           finalQScore = Math.round((qScore / qMax) * 100);
           // Deductions for past quarters are hard to calculate if history wasn't snapshotted, 
           // but for simplicity, we'll apply the current penalties to all, or zero them. 
           // Let's just use the raw score for past quarters for now.
        }

        return { name: q, score: finalQScore };
      });

      return {
        ...w,
        tenureEligible,
        recentWarnings,
        isEligible,
        currentScore: isEligible && hasScoresForCurrentQuarter ? currentScore : null,
        hasScoresForCurrentQuarter,
        quarterScores,
        rankClass: !hasScoresForCurrentQuarter ? 'N/A' : currentScore >= 91 ? 'A' : currentScore >= 81 ? 'B' : currentScore >= 71 ? 'C' : currentScore >= 60 ? 'D' : 'F'
      };
    }).sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      if (a.isEligible && b.isEligible) {
         if (a.currentScore === null && b.currentScore !== null) return 1;
         if (a.currentScore !== null && b.currentScore === null) return -1;
         return (b.currentScore || 0) - (a.currentScore || 0);
      }
      return 0;
    });
  }, [workersData, now, quartersList, roleKPIs, workerScores, currentQuarter]);

  const filteredWorkers = useMemo(() => {
    return evaluatedWorkers.filter(w => {
      // Apply Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = w.name?.toLowerCase().includes(query);
        const matchesId = w.id?.toLowerCase().includes(query);
        const matchesTitle = w.jobTitle?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesTitle) return false;
      }
      
      // Apply Rank/Eligibility Filter
      if (rankFilter !== 'All') {
        if (rankFilter === 'Eligible') {
          if (!w.isEligible) return false;
        } else if (rankFilter === 'Ineligible') {
          if (w.isEligible) return false;
        } else if (rankFilter === 'A') {
          if (w.rankClass !== 'A') return false;
        } else if (rankFilter === 'B') {
          if (w.rankClass !== 'B') return false;
        } else if (rankFilter === 'C') {
          if (w.rankClass !== 'C') return false;
        } else if (rankFilter === 'D') {
          if (w.rankClass !== 'D') return false;
        } else if (rankFilter === 'F') {
          if (w.rankClass !== 'F') return false;
        }
      }
      
      return true;
    });
  }, [evaluatedWorkers, searchQuery, rankFilter]);

  const totalActiveWorkers = evaluatedWorkers.length;
  const eligibleCount = evaluatedWorkers.filter(w => w.isEligible).length;
  const tenureIneligibleCount = evaluatedWorkers.filter(w => !w.tenureEligible).length;
  const warningIneligibleCount = evaluatedWorkers.filter(w => w.tenureEligible && !w.isEligible).length;

  const handleExportWorkerKPIs = async () => {
    logAction('Data Exported', `Exported quarterly worker KPIs.`, 'info');
    
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Quarterly KPI Evaluated');
    
    ws.columns = [
      { header: 'Workers Code', key: 'ID', width: 15 },
      { header: 'Full Name', key: 'Name', width: 25 },
      { header: 'Job Title', key: 'JobTitle', width: 20 },
      { header: 'Shift', key: 'Shift', width: 10 },
      { header: 'Hire Date', key: 'StartDate', width: 15 },
      { header: 'KPI Status', key: 'KPIStatus', width: 25 },
      { header: 'Current Score', key: 'Score', width: 15 },
      { header: 'Recent Warnings (Last 3 Months)', key: 'Warnings', width: 50 },
      { header: 'Notes', key: 'Notes', width: 50 }
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    evaluatedWorkers.forEach(w => {
      let kpiStatus = 'Eligible';
      if (!w.tenureEligible) kpiStatus = 'Ineligible (< 6 months)';
      else if (!w.isEligible) kpiStatus = 'Ineligible (Recent Warning)';

      const warningText = w.recentWarnings.map((act: any) => `${act.date}: ${act.type}`).join(', ') || 'None';
      
      const workerNotes = allNotes[w.id] || [];
      const notesText = workerNotes.map((n: any) => `[${n.date}]: ${n.text}${n.images && n.images.length ? ' (has images)' : ''}`).join(' | ') || 'None';

      ws.addRow({
        ID: w.id,
        Name: w.name,
        JobTitle: w.jobTitle,
        Shift: w.shift,
        StartDate: w.startDate || '-',
        KPIStatus: kpiStatus,
        Score: w.currentScore || 'N/A',
        Warnings: warningText,
        Notes: notesText
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Worker_KPIs_Q${Math.floor(new Date().getMonth()/3)+1}_${new Date().getFullYear()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenConfigModal = () => {
    if (jobRoles.length > 0) {
      setSelectedRoleForConfig(jobRoles[0]);
      setTempKPIs(roleKPIs[jobRoles[0]] || []);
    }
    setIsConfigModalOpen(true);
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRoleForConfig(role);
    setTempKPIs(roleKPIs[role] || []);
  };

  const handleAddKPI = () => {
    setTempKPIs([...tempKPIs, { id: `kpi-${Date.now()}`, name: '', maxScore: 10 }]);
  };

  const handleUpdateKPI = (index: number, field: keyof RoleKPI, value: string | number) => {
    const updated = [...tempKPIs];
    updated[index] = { ...updated[index], [field]: value };
    setTempKPIs(updated);
  };

  const handleRemoveKPI = (index: number) => {
    const updated = [...tempKPIs];
    updated.splice(index, 1);
    setTempKPIs(updated);
  };

  const handleSaveRoleConfig = () => {
    setRoleKPIs(prev => ({
      ...prev,
      [selectedRoleForConfig]: tempKPIs.filter(k => k.name.trim() !== '' && k.maxScore > 0)
    }));
    logAction('KPI Configured', `Configured KPIs for role: ${selectedRoleForConfig}`, 'info');
    setIsConfigModalOpen(false);
  };

  const [evalScores, setEvalScores] = useState<Record<string, number>>({});

  const handleOpenEvalModal = (worker: any) => {
    setEvalWorker(worker);
    const currentQuarterScores = workerScores[worker.id]?.[currentQuarter] || {};
    setEvalScores(currentQuarterScores);
  };

  const handleSaveEval = () => {
    if (!evalWorker) return;
    setWorkerScores(prev => ({
      ...prev,
      [evalWorker.id]: {
        ...(prev[evalWorker.id] || {}),
        [currentQuarter]: evalScores
      }
    }));
    logAction('Worker Evaluated', `Evaluated worker ${evalWorker.id} for ${currentQuarter}`, 'info');
    setEvalWorker(null);
  };

  return (
    <div className="space-y-6 relative pb-8">
      <div className="border-b border-divider pb-5 shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-500" />
            Worker KPIs & Rankings
          </h2>
          <p className="mt-2 text-sm text-tertiary">
            Quarterly performance evaluation, rankings, and individual KPI tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <div className="bg-surface border border-divider rounded-xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between text-tertiary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Active</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-primary">{totalActiveWorkers}</div>
          <div className="text-xs text-secondary mt-1">Workers evaluated</div>
        </div>
        <div className="bg-surface border border-divider rounded-xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between text-tertiary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">KPI Eligible</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-500">{eligibleCount}</div>
          <div className="text-xs text-secondary mt-1">Ready for quarter review</div>
        </div>
        <div className="bg-surface border border-divider rounded-xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between text-tertiary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ineligible (Tenure)</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-primary">{tenureIneligibleCount}</div>
          <div className="text-xs text-secondary mt-1">Less than 6 months</div>
        </div>
        <div className="bg-surface border border-divider rounded-xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between text-tertiary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ineligible (Warnings)</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-500">{warningIneligibleCount}</div>
          <div className="text-xs text-secondary mt-1">Warning in last 3 months</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center shrink-0 -mt-2">
         <button type="button" 
           onClick={handleOpenConfigModal}
           className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-elevated border border-divider text-primary rounded-lg text-sm font-medium transition-colors"
         >
           <Settings className="w-4 h-4" />
           Configure Role KPIs
         </button>
         <button type="button" 
           onClick={handleExportWorkerKPIs}
           className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
         >
           <Download className="w-4 h-4" />
           Export Worker KPIs
         </button>
      </div>

      <div className="bg-canvas/50 border border-divider-subtle rounded-lg shadow-sm">
        <div className="p-4 border-b border-divider-subtle bg-surface/20 shrink-0 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">Employee KPI Rankings</h3>
            <span className="text-xs text-tertiary">Select an employee to view details</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
              <input 
                type="text"
                placeholder="Search name, ID, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-canvas border border-divider rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-primary placeholder:text-quaternary"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-tertiary hidden sm:block shrink-0" />
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="bg-canvas border border-divider rounded-lg text-sm px-4 py-2 outline-none text-primary focus:border-blue-500 w-full sm:w-auto"
              >
                <option value="All">All Rankings</option>
                <option value="Eligible">Eligible Only</option>
                <option value="Ineligible">Ineligible</option>
                <option value="A">Rank A</option>
                <option value="B">Rank B</option>
                <option value="C">Rank C</option>
                <option value="D">Rank D</option>
                <option value="F">Rank F</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {filteredWorkers.map(worker => (
            <div key={worker.id} className="bg-surface border border-divider rounded-xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedWorkerId(expandedWorkerId === worker.id ? null : worker.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-blue-400 shrink-0">
                    {worker.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-primary text-sm flex items-center gap-2">
                      {worker.name}
                      <span className="text-xs font-mono text-tertiary px-1.5 py-0.5 rounded-lg bg-surface-elevated border border-divider">
                        {worker.id}
                      </span>
                    </h4>
                    <p className="text-xs text-secondary">{worker.jobTitle} &bull; Shift {worker.shift}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {worker.isEligible && (
                    <button type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEvalModal(worker);
                      }}
                      className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-blue-500/10 text-secondary hover:text-blue-500 border border-divider hover:border-blue-500/30 rounded-lg transition-colors"
                    >
                      {worker.hasScoresForCurrentQuarter ? 'Edit Eval' : 'Evaluate'}
                    </button>
                  )}
                  {worker.isEligible ? (
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-tertiary uppercase tracking-wider">KPI Score</div>
                        <div className="font-bold text-lg text-primary">{worker.currentScore !== null ? worker.currentScore : '-'}</div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white ${
                        worker.rankClass === 'A' ? 'bg-emerald-500' :
                        worker.rankClass === 'B' ? 'bg-blue-500' :
                        worker.rankClass === 'C' ? 'bg-amber-500' :
                        worker.rankClass === 'D' ? 'bg-orange-500' :
                        worker.rankClass === 'N/A' ? 'bg-surface-elevated text-secondary border border-divider' : 'bg-red-500'
                      }`}>
                        {worker.rankClass === 'N/A' ? '-' : worker.rankClass}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-surface-elevated text-quaternary border border-divider">
                        {!worker.tenureEligible ? 'Ineligible (<6 Mo)' : 'Ineligible (Warning)'}
                      </span>
                    </div>
                  )}
                  {expandedWorkerId === worker.id ? <ChevronUp className="w-5 h-5 text-quaternary" /> : <ChevronDown className="w-5 h-5 text-quaternary" />}
                </div>
              </div>

              {expandedWorkerId === worker.id && (
                <div className="p-4 border-t border-divider bg-surface/50 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        Quarterly Trend
                      </h5>
                      <div className="h-48 w-full bg-canvas/50 border border-divider rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={worker.quarterScores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              itemStyle={{ color: '#60a5fa' }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Score Factors & Deductions
                      </h5>
                      <div className="bg-canvas border border-divider rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary">Base Score</span>
                          <span className="font-medium text-emerald-400">100 pts</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary">Absences ({worker.absences || 0})</span>
                          <span className={`font-medium ${worker.absences > 0 ? 'text-red-400' : 'text-tertiary'}`}>
                            -{ (worker.absences || 0) * 5 } pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary">Historical Warnings ({(worker.actionHistory || []).length})</span>
                          <span className={`font-medium ${(worker.actionHistory || []).length > 0 ? 'text-red-400' : 'text-tertiary'}`}>
                            -{ (worker.actionHistory || []).length * 8 } pts
                          </span>
                        </div>
                        
                        {!worker.isEligible && (
                          <div className="pt-3 mt-3 border-t border-divider">
                            <p className="text-xs text-red-400 font-medium">
                              * Employee excluded from final KPI ranking due to {!worker.tenureEligible ? 'insufficient tenure (under 6 months).' : 'a warning received in the last 3 months.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <WorkerKPINotes workerId={worker.id} />
                </div>
              )}                 </div>
          ))}

          {filteredWorkers.length === 0 && (
            <div className="text-center py-12 text-tertiary text-sm">
              No workers match the current search or filters.
            </div>
          )}
        </div>
      </div>

      {/* Role KPIs Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-divider flex justify-between items-center bg-surface shrink-0">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Configure Role KPIs
              </h2>
              <button type="button" onClick={() => setIsConfigModalOpen(false)} className="text-tertiary hover:text-primary transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Select Job Role</label>
                <div className="flex flex-wrap gap-2 pb-2">
                  {jobRoles.map(role => (
                    <button type="button"
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border ${
                        selectedRoleForConfig === role 
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500' 
                          : 'bg-canvas text-secondary border-divider hover:border-blue-500/50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                  {jobRoles.length === 0 && (
                    <span className="text-sm text-tertiary">No job roles found. Add workers first.</span>
                  )}
                </div>
              </div>

              {selectedRoleForConfig && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <h3 className="text-sm font-semibold text-primary">KPIs for {selectedRoleForConfig}</h3>
                    <button type="button" 
                      onClick={handleAddKPI}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add KPI
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {tempKPIs.length === 0 ? (
                      <div className="text-center py-8 text-tertiary text-sm bg-canvas/50 rounded-lg border border-divider border-dashed">
                        No KPIs configured for this role.
                      </div>
                    ) : (
                      <div className="grid grid-cols-[1fr,100px,auto] gap-3 text-xs font-medium text-tertiary px-2">
                        <div>KPI Description</div>
                        <div>Max Score</div>
                        <div></div>
                      </div>
                    )}
                    {tempKPIs.map((kpi, index) => (
                      <div key={kpi.id} className="grid grid-cols-[1fr,100px,auto] gap-3 items-center bg-canvas/50 p-2 rounded-lg border border-divider">
                        <input 
                          type="text" 
                          value={kpi.name}
                          onChange={(e) => handleUpdateKPI(index, 'name', e.target.value)}
                          placeholder="e.g., Output per hour"
                          className="bg-canvas border border-divider rounded-lg px-4 py-2 text-sm outline-none text-primary focus:border-blue-500 w-full"
                        />
                        <input 
                          type="number" 
                          min="1"
                          value={kpi.maxScore}
                          onChange={(e) => handleUpdateKPI(index, 'maxScore', parseInt(e.target.value) || 0)}
                          className="bg-canvas border border-divider rounded-lg px-4 py-2 text-sm outline-none text-primary focus:border-blue-500 w-full"
                        />
                        <button type="button" 
                          onClick={() => handleRemoveKPI(index)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-divider bg-surface flex justify-end gap-3 shrink-0">
              <button type="button" 
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button type="button" 
                onClick={handleSaveRoleConfig}
                disabled={!selectedRoleForConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save KPIs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Worker Modal */}
      {evalWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-divider flex justify-between items-center bg-surface shrink-0">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-500" />
                Evaluate Worker: {currentQuarter}
              </h2>
              <button type="button" onClick={() => setEvalWorker(null)} className="text-tertiary hover:text-primary transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 bg-canvas/50 p-4 rounded-lg border border-divider">
                <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-blue-400 text-lg shrink-0">
                  {evalWorker.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-primary">{evalWorker.name}</h4>
                  <p className="text-sm text-secondary">{evalWorker.jobTitle} • {evalWorker.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">KPI Assessment</h3>
                
                {!(roleKPIs[evalWorker.jobTitle] && roleKPIs[evalWorker.jobTitle].length > 0) ? (
                  <div className="text-center py-6 text-amber-500 text-sm bg-amber-500/10 rounded-lg border border-amber-500/20">
                    No KPIs configured for <strong>{evalWorker.jobTitle}</strong>.<br />
                    Configure them first before evaluating.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roleKPIs[evalWorker.jobTitle].map(kpi => (
                      <div key={kpi.id} className="flex items-center justify-between gap-4">
                        <label className="text-sm text-secondary flex-1">{kpi.name} (Max: {kpi.maxScore})</label>
                        <div className="flex items-center gap-2 w-32">
                          <input
                            type="number"
                            min="0"
                            max={kpi.maxScore}
                            value={evalScores[kpi.id] !== undefined ? evalScores[kpi.id] : ''}
                            onChange={(e) => {
                              const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), kpi.maxScore);
                              setEvalScores(prev => ({ ...prev, [kpi.id]: e.target.value === '' ? 0 : val }));
                            }}
                            className="bg-canvas border border-divider rounded-lg px-4 py-2 text-sm outline-none text-primary focus:border-blue-500 w-full"
                          />
                          <span className="text-xs text-tertiary">/ {kpi.maxScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-divider bg-surface flex justify-end gap-3 shrink-0">
              <button type="button" 
                onClick={() => setEvalWorker(null)}
                className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button type="button" 
                onClick={handleSaveEval}
                disabled={!(roleKPIs[evalWorker.jobTitle] && roleKPIs[evalWorker.jobTitle].length > 0)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save Evaluation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
