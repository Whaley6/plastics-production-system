import React, { useState, useMemo } from 'react';
import { 
  Monitor, 
  Moon, 
  Sun, 
  Type, 
  Plus, 
  Minus, 
  Users, 
  Trash2, 
  Info, 
  Clock, 
  Bell, 
  Volume2, 
  VolumeX, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  Search, 
  HardDrive, 
  Cpu, 
  Palette, 
  RotateCcw,
  Tag,
  Factory
} from 'lucide-react';
import { useJobTitles, DEFAULT_JOB_TITLES } from '../hooks/useJobTitles';
import { useShifts, DEFAULT_SHIFTS } from '../hooks/useShifts';
import { playNotificationChime } from '../utils/notificationSound';
import { logAction } from '../utils/logger';

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  textScale: number;
  setTextScale: (val: number) => void;
}

type TabType = 'appearance' | 'factory' | 'notifications' | 'data' | 'system';

export default function Settings({ isDarkMode, setIsDarkMode, textScale, setTextScale }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [jobTitles, setJobTitles] = useJobTitles();
  const [shifts, setShifts] = useShifts();
  
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newShift, setNewShift] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  
  // Notification Sound Preferences
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notifications_sound_muted') === 'true');
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('notifications_sound_muted', String(next));
  };

  // Filtered job titles
  const filteredJobTitles = useMemo(() => {
    if (!roleSearch.trim()) return jobTitles;
    return jobTitles.filter((t: string) => t.toLowerCase().includes(roleSearch.toLowerCase()));
  }, [jobTitles, roleSearch]);

  const handleAddJobTitle = () => {
    const trimmed = newJobTitle.trim();
    if (trimmed && !jobTitles.includes(trimmed)) {
      setJobTitles([...jobTitles, trimmed]);
      setNewJobTitle('');
      logAction('Settings Updated', `Added job title: ${trimmed}`, 'info');
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    if (window.confirm(`Are you sure you want to remove the job role "${title}"?`)) {
      setJobTitles(jobTitles.filter((t: string) => t !== title));
      logAction('Settings Updated', `Removed job title: ${title}`, 'warning');
    }
  };

  const handleResetDefaultJobTitles = () => {
    if (window.confirm('Reset job roles to default factory list?')) {
      setJobTitles(DEFAULT_JOB_TITLES);
    }
  };

  const handleAddShift = () => {
    const trimmed = newShift.trim();
    if (trimmed && !shifts.includes(trimmed)) {
      setShifts([...shifts, trimmed]);
      setNewShift('');
      logAction('Settings Updated', `Added shift: ${trimmed}`, 'info');
    }
  };

  const handleRemoveShift = (shift: string) => {
    if (window.confirm(`Are you sure you want to remove the shift "${shift}"?`)) {
      setShifts(shifts.filter((s: string) => s !== shift));
      logAction('Settings Updated', `Removed shift: ${shift}`, 'warning');
    }
  };

  const handleResetDefaultShifts = () => {
    if (window.confirm('Reset shifts to standard A, B, C?')) {
      setShifts(DEFAULT_SHIFTS);
    }
  };

  // Full System Backup Export
  const handleExportBackup = () => {
    try {
      const keys = [
        'production_orders_v11',
        'production_machines_v11',
        'maintenance_work_orders',
        'maintenance_procurement_orders',
        'cnc_mold_tickets_v3',
        'workers_list_v4',
        'app_job_titles',
        'app_shifts',
        'app_roles',
        'app_notifications'
      ];
      const backup: Record<string, any> = {};
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val) {
          try { backup[k] = JSON.parse(val); } catch { backup[k] = val; }
        }
      });
      backup['_metadata'] = {
        exportedAt: new Date().toISOString(),
        version: '1.2.0',
        systemName: 'Apex Plastics System'
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apex-plastics-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
      logAction('System Backup Exported', 'User created full JSON database export snapshot.', 'info');
    } catch (err: any) {
      alert('Failed to export backup: ' + err.message);
    }
  };

  // Restore Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json || typeof json !== 'object') {
          throw new Error('File does not contain valid system data.');
        }
        if (window.confirm('Are you sure you want to restore this backup? This will update records and synchronize with server.')) {
          Object.entries(json).forEach(([k, v]) => {
            if (k !== '_metadata') {
              localStorage.setItem(k, JSON.stringify(v));
              fetch(`/api/data/${encodeURIComponent(k)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(v)
              }).catch(() => {});
            }
          });
          window.dispatchEvent(new CustomEvent('local-storage-sync'));
          logAction('System Backup Restored', `Restored system data from ${file.name}.`, 'warning');
          alert('Backup restored successfully! The page will now refresh.');
          window.location.reload();
        }
      } catch (err: any) {
        setImportError('Invalid backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const navTabs = [
    { id: 'appearance', label: 'Appearance & Display', icon: Palette, badge: isDarkMode ? 'Dark' : 'Light' },
    { id: 'factory', label: 'Factory & Shifts', icon: Factory, badge: `${shifts.length} Shifts` },
    { id: 'notifications', label: 'Notifications & Audio', icon: Bell, badge: isMuted ? 'Muted' : 'Sound On' },
    { id: 'data', label: 'Data & Backups', icon: Database, badge: 'Active' },
    { id: 'system', label: 'System & Diagnostics', icon: Cpu, badge: 'v1.2.0' }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-4 border-b border-divider/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              System Settings & Configuration
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Operations
              </span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Customize appearance, plant shift schedules, alert chimes, and system data backups.
            </p>
          </div>
        </div>

        {/* Quick Snapshot Action */}
        <button
          type="button"
          onClick={handleExportBackup}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-elevated text-secondary hover:text-white border border-divider rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
          title="Download complete JSON snapshot of all system tables"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Export Backup Snapshot</span>
        </button>
      </div>

      {/* Main Layout: Tabs + Content Panels */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden pb-4">
        {/* Navigation Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto pr-1">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 ring-1 ring-blue-500'
                    : 'bg-surface/50 hover:bg-surface-elevated text-secondary hover:text-white border border-divider/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ml-2 font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-canvas text-tertiary border border-divider/50'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6">
          {/* TAB 1: APPEARANCE & DISPLAY */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Theme Selector Card */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-400" /> Interface Theme
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Choose between industrial Dark Mode and daylight high-contrast Light Mode.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    {isDarkMode ? 'Dark Theme Active' : 'Light Theme Active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Mode Card */}
                  <div
                    onClick={() => setIsDarkMode(true)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      isDarkMode
                        ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10'
                        : 'border-divider bg-canvas/40 hover:border-divider-subtle'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-blue-500/30 flex items-center justify-center shrink-0 shadow-xs">
                      <Moon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-primary">Dark Mode (Default)</h4>
                        {isDarkMode && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-tertiary mt-0.5 leading-relaxed">
                        Optimized for plant control rooms and continuous shifts to reduce glare.
                      </p>
                    </div>
                  </div>

                  {/* Light Mode Card */}
                  <div
                    onClick={() => setIsDarkMode(false)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      !isDarkMode
                        ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10'
                        : 'border-divider bg-canvas/40 hover:border-divider-subtle'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-xs">
                      <Sun className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-primary">Light Mode</h4>
                        {!isDarkMode && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-tertiary mt-0.5 leading-relaxed">
                        High visibility daylight theme for tablets on bright warehouse floors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interface Font Scaling Card */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Type className="w-4 h-4 text-indigo-400" /> Global Typography Scaling
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Adjust font scale dynamically across all tables, modal cards, and production queues.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    Scale: +{textScale}px ({11 + textScale}px Base)
                  </span>
                </div>

                {/* Slider and Buttons */}
                <div className="p-4 bg-canvas/50 border border-divider rounded-xl space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setTextScale(Math.max(1, textScale - 1))}
                      disabled={textScale <= 1}
                      className="p-2 rounded-lg bg-surface border border-divider text-secondary hover:text-white disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                      title="Decrease font size"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={textScale}
                        onChange={(e) => setTextScale(Number(e.target.value))}
                        className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-tertiary">
                        <span>Compact (1)</span>
                        <span>Normal (2-3)</span>
                        <span>Large (5-6)</span>
                        <span>Max (10)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTextScale(Math.min(10, textScale + 1))}
                      disabled={textScale >= 10}
                      className="p-2 rounded-lg bg-surface border border-divider text-secondary hover:text-white disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                      title="Increase font size"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-divider/50">
                    <span className="text-[11px] text-tertiary font-medium mr-1">Presets:</span>
                    {[
                      { label: 'Default', scale: 1 },
                      { label: 'Medium', scale: 2 },
                      { label: 'Large', scale: 4 },
                      { label: 'Extra Large', scale: 7 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTextScale(preset.scale)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          textScale === preset.scale
                            ? 'bg-blue-600 text-white border-blue-500 font-bold'
                            : 'bg-surface text-secondary hover:text-white border-divider'
                        }`}
                      >
                        {preset.label} (+{preset.scale}px)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Live Typography Preview
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-primary">
                      Apex Machine MK 01 — Continuous Run
                    </div>
                    <div className="text-secondary leading-snug">
                      Production Target: 45,000 pcs • Current OEE: 94.6% • Cycle Time: 12.4s • Shift: Morning (A)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FACTORY & SHIFTS */}
          {activeTab === 'factory' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Job Roles / Titles */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" /> Plant Job Roles & Titles
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Configure job titles for operators, technicians, quality inspectors, and shift leaders.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {jobTitles.length} Defined Roles
                    </span>
                    <button
                      type="button"
                      onClick={handleResetDefaultJobTitles}
                      className="p-1.5 rounded-lg bg-surface border border-divider text-tertiary hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                      title="Reset to default factory job roles"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Input + Search bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={e => setNewJobTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddJobTitle()}
                      placeholder="Add job role (e.g. فني صيانة)..."
                      className="flex-1 bg-canvas border border-divider rounded-xl px-3.5 py-2 text-xs text-primary focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddJobTitle}
                      disabled={!newJobTitle.trim()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Add Role
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                      placeholder="Filter existing roles..."
                      className="w-full bg-canvas border border-divider rounded-xl pl-9 pr-3.5 py-2 text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Role Chips Matrix */}
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-canvas/40 border border-divider rounded-xl">
                  {filteredJobTitles.map((title: string, idx: number) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-divider hover:border-emerald-500/40 rounded-xl text-xs font-medium text-secondary hover:text-primary transition-all group"
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span dir="auto"><bdi>{title}</bdi></span>
                      <button
                        type="button"
                        onClick={() => handleRemoveJobTitle(title)}
                        className="text-tertiary hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                        title="Delete role"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {filteredJobTitles.length === 0 && (
                    <div className="w-full py-6 text-center text-xs text-tertiary">
                      {roleSearch ? 'No matching job roles found.' : 'No job roles defined. Add one above.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Shift Names & Schedule */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" /> Shift Identifiers
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Manage plant shift codes (e.g. A, B, C, Morning, Night) for attendance and KPIs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                      {shifts.length} Shifts Configured
                    </span>
                    <button
                      type="button"
                      onClick={handleResetDefaultShifts}
                      className="p-1.5 rounded-lg bg-surface border border-divider text-tertiary hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                      title="Reset to default shifts (A, B, C)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 max-w-md">
                  <input
                    type="text"
                    value={newShift}
                    onChange={e => setNewShift(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddShift()}
                    placeholder="Enter shift code (e.g. D, Night)..."
                    className="flex-1 bg-canvas border border-divider rounded-xl px-3.5 py-2 text-xs text-primary focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddShift}
                    disabled={!newShift.trim()}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Add Shift
                  </button>
                </div>

                {/* Shift Badges Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {shifts.map((shift: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-canvas/60 border border-divider hover:border-purple-500/40 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold font-mono text-xs flex items-center justify-center">
                          {shift.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary block">Shift {shift}</span>
                          <span className="text-[10px] text-tertiary">Active Plant Shift</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveShift(shift)}
                        className="text-tertiary hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {shifts.length === 0 && (
                    <div className="col-span-3 py-6 text-center text-xs text-tertiary bg-canvas/40 border border-dashed border-divider rounded-xl">
                      No shifts defined. Click reset or add a shift above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & AUDIO */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Notification Audio Preferences */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" /> Audio Chimes & Sound Synthesis
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Web Audio procedural chimes triggered when incoming orders, checklist checks, or messages arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isMuted 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isMuted ? 'Audio Muted' : 'Sound Enabled'}</span>
                  </button>
                </div>

                <div className="p-4 bg-canvas/50 border border-divider rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-primary block">Test Priority Chimes</span>
                      <span className="text-[11px] text-tertiary">Listen to the procedural tones used for each notification level.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playNotificationChime('normal')}
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => playNotificationChime('high')}
                        className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        High
                      </button>
                      <button
                        type="button"
                        onClick={() => playNotificationChime('urgent')}
                        className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Urgent
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Alerts Overview */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400" /> Operational Notification Triggers
                </h3>
                <p className="text-xs text-tertiary mb-4">
                  The following automatic system events broadcast real-time notifications to all logged-in operators:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-primary block">New Production Orders</span>
                      <span className="text-tertiary text-[11px]">Triggers immediately when a machine order is scheduled or completed.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-primary block">Maintenance Checklists</span>
                      <span className="text-tertiary text-[11px]">Alerts team when checklist items or spare parts requests are checked.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-primary block">Broadcast System Messages</span>
                      <span className="text-tertiary text-[11px]">Factory-wide broadcasts or targeted alerts dispatched via header button.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-primary block">CNC Mold Tickets</span>
                      <span className="text-tertiary text-[11px]">Dispatches notifications when molds are sent for tooling or completed.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & BACKUPS */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Backup Snapshot Actions */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" /> Database Backup & Snapshot
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Export full system data (orders, machines, shifts, workers, roles, notifications) to a portable JSON backup.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    Neon / SQLite Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Card */}
                  <div className="p-5 bg-canvas/60 border border-divider rounded-xl flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                        <Download className="w-4 h-4 text-blue-400" /> Export System Backup
                      </div>
                      <p className="text-[11px] text-tertiary leading-relaxed">
                        Generates a structured timestamped snapshot file containing all tables, settings, and logs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON Snapshot</span>
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="p-5 bg-canvas/60 border border-divider rounded-xl flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                        <Upload className="w-4 h-4 text-amber-400" /> Restore from Snapshot
                      </div>
                      <p className="text-[11px] text-tertiary leading-relaxed">
                        Restore factory database records from a previously exported JSON backup file.
                      </p>
                    </div>

                    <label className="w-full py-2.5 bg-surface hover:bg-surface-elevated text-secondary hover:text-white border border-divider rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Select Backup File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {backupSuccess && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>System backup snapshot generated and downloaded successfully!</span>
                  </div>
                )}

                {importError && (
                  <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>

              {/* Database Storage Specs */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" /> Storage Architecture & State
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl">
                    <span className="text-[10px] text-tertiary block font-medium uppercase tracking-wider">Sync State</span>
                    <span className="text-xs font-bold text-emerald-400 mt-1 block">Live Real-Time</span>
                  </div>
                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl">
                    <span className="text-[10px] text-tertiary block font-medium uppercase tracking-wider">Polling Interval</span>
                    <span className="text-xs font-bold text-primary mt-1 block">5,000 ms</span>
                  </div>
                  <div className="p-3 bg-canvas/50 border border-divider rounded-xl">
                    <span className="text-[10px] text-tertiary block font-medium uppercase tracking-wider">Cache Layer</span>
                    <span className="text-xs font-bold text-indigo-400 mt-1 block">LocalStorage + Memory</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM & DIAGNOSTICS */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" /> Application Runtime & Diagnostics
                </h3>

                <div className="divide-y divide-divider/50 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary block">App Version</span>
                      <span className="text-[11px] text-tertiary">Current deployment version string</span>
                    </div>
                    <span className="font-mono font-bold text-secondary bg-canvas px-2.5 py-1 rounded-lg border border-divider">
                      {/* @ts-ignore */}
                      {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.2.0-production'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary block">Core Framework</span>
                      <span className="text-[11px] text-tertiary">Frontend reactive rendering engine</span>
                    </div>
                    <span className="font-mono text-secondary">React 19 + Vite 6 + Tailwind</span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary block">Server API Endpoint</span>
                      <span className="text-[11px] text-tertiary">Active data synchronization bridge</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">/api/data/:key</span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary block">Client Timestamp</span>
                      <span className="text-[11px] text-tertiary">Browser local time</span>
                    </div>
                    <span className="font-mono text-tertiary">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subsystems Health Card */}
              <div className="bg-surface/70 border border-divider rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Subsystems Operational Health
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[
                    { name: 'Production', status: 'Operational' },
                    { name: 'Maintenance', status: 'Operational' },
                    { name: 'CNC Tooling', status: 'Operational' },
                    { name: 'Notifications', status: 'Operational' }
                  ].map(sub => (
                    <div key={sub.name} className="p-3 bg-canvas/40 border border-divider rounded-xl">
                      <span className="text-xs font-bold text-primary block">{sub.name}</span>
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
