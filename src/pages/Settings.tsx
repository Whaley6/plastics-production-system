import { Clock } from "lucide-react";
import { Moon, Sun, Monitor, Type, Plus, Minus, Users, Trash2, Info } from 'lucide-react';
import { useState } from 'react';
import { useJobTitles } from '../hooks/useJobTitles';
import { useShifts } from '../hooks/useShifts';

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  textScale: number;
  setTextScale: (val: number) => void;
}

export default function Settings({ isDarkMode, setIsDarkMode, textScale, setTextScale }: SettingsProps) {
  const [jobTitles, setJobTitles] = useJobTitles();
  const [shifts, setShifts] = useShifts();
  
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newShift, setNewShift] = useState('');

  const handleAddJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      setJobTitles([...jobTitles, newJobTitle.trim()]);
      setNewJobTitle('');
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    if (window.confirm(`Are you sure you want to remove the job role "${title}"?`)) {
      setJobTitles(jobTitles.filter(t => t !== title));
    }
  };

  const handleAddShift = () => {
    if (newShift.trim() && !shifts.includes(newShift.trim())) {
      setShifts([...shifts, newShift.trim()]);
      setNewShift('');
    }
  };

  const handleRemoveShift = (shift: string) => {
    if (window.confirm(`Are you sure you want to remove the shift "${shift}"?`)) {
      setShifts(shifts.filter(s => s !== shift));
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-primary">System Settings</h2>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        <div className="max-w-2xl space-y-6">
          <div className="bg-surface border border-divider rounded-xl p-5">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Appearance
            </h3>
            
            <div className="flex items-center justify-between py-3 border-b border-divider">
              <div>
                <p className="text-sm font-medium text-primary">Dark Mode</p>
                <p className="text-xs text-tertiary mt-1">Adjust the interface theme to reduce eye strain.</p>
              </div>
              <button type="button" 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-400'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'} flex items-center justify-center`}>
                  {isDarkMode ? <Moon className="w-2.5 h-2.5 text-blue-600" /> : <Sun className="w-2.5 h-2.5 text-slate-400" />}
                </div>
              </button>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-primary flex items-center gap-2">
                  <Type className="w-4 h-4 text-secondary" /> Interface Text Size
                </p>
                <p className="text-xs text-tertiary mt-1">Adjust the global text size for better readability.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" 
                  onClick={() => setTextScale(Math.max(1, textScale - 1))}
                  className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-secondary w-4 text-center">{textScale}</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={textScale} 
                    onChange={(e) => setTextScale(Number(e.target.value))}
                    className="w-24 h-1.5 bg-divider rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <button type="button" 
                  onClick={() => setTextScale(Math.min(10, textScale + 1))}
                  className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-divider rounded-xl p-5">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Job Roles (Titles)
            </h3>
            
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="text" 
                value={newJobTitle}
                onChange={e => setNewJobTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddJobTitle()}
                placeholder="Enter new job role..."
                className="flex-1 bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button type="button" 
                onClick={handleAddJobTitle}
                disabled={!newJobTitle.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add Role
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {jobTitles.map((title: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-canvas border border-divider rounded-lg">
                  <span className="text-sm text-secondary font-medium"><bdi dir="auto">{title}</bdi></span>
                  <button type="button" 
                    onClick={() => handleRemoveJobTitle(title)}
                    className="p-1 text-tertiary hover:text-red-400 transition-colors rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {jobTitles.length === 0 && (
                <div className="p-4 text-center text-sm text-tertiary border border-dashed border-surface-elevated rounded-lg">
                  No job roles defined.
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-divider rounded-xl p-5">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Shift Names
            </h3>
            
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="text" 
                value={newShift}
                onChange={e => setNewShift(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddShift()}
                placeholder="Enter new shift name (e.g. Morning, Shift D)..."
                className="flex-1 bg-canvas border border-divider rounded-lg px-4 py-2 text-sm text-secondary focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button type="button" 
                onClick={handleAddShift}
                disabled={!newShift.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add Shift
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {shifts.map((shift: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-canvas border border-divider rounded-lg">
                  <span className="text-sm text-secondary font-medium"><bdi dir="auto">Shift {shift}</bdi></span>
                  <button type="button" 
                    onClick={() => handleRemoveShift(shift)}
                    className="p-1 text-tertiary hover:text-red-400 transition-colors rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {shifts.length === 0 && (
                <div className="p-4 text-center text-sm text-tertiary border border-dashed border-surface-elevated rounded-lg">
                  No shifts defined.
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-divider rounded-xl p-5">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" /> System Information
            </h3>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-primary">App Version</p>
                <p className="text-xs text-tertiary mt-1">Current build version of the application.</p>
              </div>
              <div className="text-sm font-medium text-secondary bg-surface-elevated px-3 py-1.5 rounded-lg border border-divider">
                {/* @ts-ignore */}
                {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Development'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
