import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Lock, 
  Eye, 
  Edit3, 
  Ban, 
  Search, 
  Sparkles, 
  PackageSearch, 
  Wrench, 
  Cpu, 
  Settings2, 
  Users, 
  MessageSquareWarning, 
  Factory, 
  Activity, 
  Settings, 
  Save, 
  Sliders, 
  Copy,
  ChevronRight,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useJobTitles } from '../hooks/useJobTitles';
import { logAction } from '../utils/logger';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: {
    workers: boolean;
    workers_readonly?: boolean;
    workers_view_all?: boolean;
    workers_view_titles?: string[];
    maintenance: boolean;
    maintenance_readonly?: boolean;
    cnc: boolean;
    cnc_readonly?: boolean;
    auxiliary: boolean;
    auxiliary_readonly?: boolean;
    production: boolean;
    production_readonly?: boolean;
    complaints: boolean;
    complaints_readonly?: boolean;
    machines: boolean;
    machines_readonly?: boolean;
    machine_health?: boolean;
    'machine-health'?: boolean;
    machine_health_readonly?: boolean;
    'machine-health_readonly'?: boolean;
    archive: boolean;
    archive_readonly?: boolean;
    settings: boolean;
  };
}

export const defaultRoles: Role[] = [
  {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Unrestricted full administrative control across all factory operations and system settings.',
    permissions: {
      workers: true,
      workers_readonly: false,
      workers_view_all: true,
      maintenance: true,
      maintenance_readonly: false,
      cnc: true,
      cnc_readonly: false,
      auxiliary: true,
      auxiliary_readonly: false,
      production: true,
      production_readonly: false,
      complaints: true,
      complaints_readonly: false,
      machines: true,
      machines_readonly: false,
      machine_health: true,
      'machine-health': true,
      machine_health_readonly: false,
      archive: true,
      archive_readonly: false,
      settings: true
    }
  },
  {
    id: 'manager',
    name: 'Plant Manager',
    description: 'Full management clearance over production, maintenance, and analytics, without system configuration rights.',
    permissions: {
      workers: true,
      workers_readonly: false,
      workers_view_all: true,
      maintenance: true,
      maintenance_readonly: false,
      cnc: true,
      cnc_readonly: false,
      auxiliary: true,
      auxiliary_readonly: false,
      production: true,
      production_readonly: false,
      complaints: true,
      complaints_readonly: false,
      machines: true,
      machines_readonly: false,
      machine_health: true,
      'machine-health': true,
      machine_health_readonly: false,
      archive: false,
      archive_readonly: true,
      settings: false
    }
  },
  {
    id: 'supervisor',
    name: 'Shift Supervisor',
    description: 'Operational leader managing active production lines, worker scheduling, and maintenance dispatch.',
    permissions: {
      workers: true,
      workers_readonly: false,
      workers_view_all: true,
      maintenance: true,
      maintenance_readonly: false,
      cnc: false,
      cnc_readonly: true,
      auxiliary: false,
      auxiliary_readonly: true,
      production: true,
      production_readonly: false,
      complaints: true,
      complaints_readonly: false,
      machines: true,
      machines_readonly: true,
      machine_health: true,
      'machine-health': true,
      machine_health_readonly: true,
      archive: false,
      archive_readonly: false,
      settings: false
    }
  },
  {
    id: 'worker',
    name: 'Machine Operator',
    description: 'Shop floor personnel executing production orders and viewing active machine status.',
    permissions: {
      workers: false,
      workers_readonly: true,
      workers_view_all: false,
      maintenance: false,
      maintenance_readonly: true,
      cnc: false,
      cnc_readonly: true,
      auxiliary: false,
      auxiliary_readonly: true,
      production: true,
      production_readonly: true,
      complaints: false,
      complaints_readonly: true,
      machines: true,
      machines_readonly: true,
      machine_health: true,
      'machine-health': true,
      machine_health_readonly: true,
      archive: false,
      archive_readonly: false,
      settings: false
    }
  }
];

interface ModuleDefinition {
  key: keyof Role['permissions'];
  readonlyKey?: keyof Role['permissions'];
  label: string;
  description: string;
  icon: any;
  category: 'production' | 'maintenance' | 'workforce' | 'admin';
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // Production
  {
    key: 'production',
    readonlyKey: 'production_readonly',
    label: 'Production Orders',
    description: 'Create, schedule, run, and track factory production machine orders',
    icon: PackageSearch,
    category: 'production'
  },
  {
    key: 'machines',
    readonlyKey: 'machines_readonly',
    label: 'Machine Directory',
    description: 'Configure machines, cycle times, cavities, and operational presets',
    icon: Factory,
    category: 'production'
  },
  {
    key: 'machine_health',
    readonlyKey: 'machine_health_readonly',
    label: 'Machine Health & Downtime',
    description: 'Log downtime reasons, calculate OEE metrics, and track availability',
    icon: Activity,
    category: 'production'
  },
  // Maintenance
  {
    key: 'maintenance',
    readonlyKey: 'maintenance_readonly',
    label: 'Maintenance & Work Orders',
    description: 'Manage preventive maintenance checklists and spare parts requests',
    icon: Wrench,
    category: 'maintenance'
  },
  {
    key: 'cnc',
    readonlyKey: 'cnc_readonly',
    label: 'CNC Mold Tickets',
    description: 'Submit mold maintenance tickets, track machining repairs, and tooling',
    icon: Cpu,
    category: 'maintenance'
  },
  {
    key: 'auxiliary',
    readonlyKey: 'auxiliary_readonly',
    label: 'Utilities Equipment',
    description: 'Maintain chillers, air compressors, cooling towers, and auxiliary units',
    icon: Settings2,
    category: 'maintenance'
  },
  // Workforce
  {
    key: 'workers',
    readonlyKey: 'workers_readonly',
    label: 'Worker Management',
    description: 'Staff directory, shifts, salary calculations, and employee records',
    icon: Users,
    category: 'workforce'
  },
  {
    key: 'complaints',
    readonlyKey: 'complaints_readonly',
    label: 'Worker KPIs & Ratings',
    description: 'Worker performance evaluations, incident reports, and KPI ratings',
    icon: MessageSquareWarning,
    category: 'workforce'
  },
  // Administration
  {
    key: 'archive',
    readonlyKey: 'archive_readonly',
    label: 'System Archive & Trash',
    description: 'View historical archive and restore deleted production or maintenance records',
    icon: Trash2,
    category: 'admin'
  },
  {
    key: 'settings',
    label: 'System Settings',
    description: 'Manage global factory shifts, plant job titles, and appearance preferences',
    icon: Settings,
    category: 'admin'
  }
];

export default function Roles() {
  const [storedRoles, setRoles] = useLocalStorage<Role[]>('app_roles', defaultRoles);
  const [jobTitles] = useJobTitles();

  const roles = useMemo(() => {
    return (storedRoles || defaultRoles).map(r => ({
      ...r,
      permissions: {
        ...r.permissions,
        workers_view_all: r.id === 'super-admin' ? true : (r.permissions.workers_view_all ?? true),
        workers_view_titles: r.id === 'super-admin' ? [] : (Array.isArray(r.permissions.workers_view_titles) ? r.permissions.workers_view_titles : []),
        'machine-health': r.permissions['machine-health'] ?? r.permissions.machine_health ?? true,
        'machine-health_readonly': r.permissions['machine-health_readonly'] ?? r.permissions.machine_health_readonly ?? false,
      }
    }));
  }, [storedRoles]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'super-admin');
  const [searchRoleQuery, setSearchRoleQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleTemplate, setNewRoleTemplate] = useState<'manager' | 'supervisor' | 'worker' | 'blank'>('supervisor');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const isSuperAdmin = selectedRole.id === 'super-admin';
  const isBuiltIn = ['super-admin', 'manager', 'supervisor', 'worker'].includes(selectedRole.id);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    if (!searchRoleQuery.trim()) return roles;
    return roles.filter(r => r.name.toLowerCase().includes(searchRoleQuery.toLowerCase()));
  }, [roles, searchRoleQuery]);

  // Calculate active permissions count for a role
  const getRoleAccessCount = (role: Role) => {
    return MODULE_DEFINITIONS.filter(m => {
      const hasAccess = !!role.permissions[m.key];
      return hasAccess;
    }).length;
  };

  // Get current access level for a module: 'full' | 'readonly' | 'none'
  const getModuleAccessLevel = (role: Role, mod: ModuleDefinition): 'full' | 'readonly' | 'none' => {
    const hasAccess = !!role.permissions[mod.key];
    if (!hasAccess) return 'none';
    if (mod.readonlyKey && role.permissions[mod.readonlyKey]) return 'readonly';
    return 'full';
  };

  // Set module access level
  const setModuleAccessLevel = (mod: ModuleDefinition, level: 'full' | 'readonly' | 'none') => {
    if (isSuperAdmin) return;

    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;

      const updatedPerms = { ...r.permissions };

      if (level === 'none') {
        (updatedPerms as any)[mod.key] = false;
        if (mod.readonlyKey) (updatedPerms as any)[mod.readonlyKey] = false;
        if (mod.key === 'machine_health') {
          updatedPerms['machine-health'] = false;
          updatedPerms['machine-health_readonly'] = false;
        }
      } else if (level === 'readonly') {
        (updatedPerms as any)[mod.key] = true;
        if (mod.readonlyKey) (updatedPerms as any)[mod.readonlyKey] = true;
        if (mod.key === 'machine_health') {
          updatedPerms['machine-health'] = true;
          updatedPerms['machine-health_readonly'] = true;
        }
      } else {
        // 'full'
        (updatedPerms as any)[mod.key] = true;
        if (mod.readonlyKey) (updatedPerms as any)[mod.readonlyKey] = false;
        if (mod.key === 'machine_health') {
          updatedPerms['machine-health'] = true;
          updatedPerms['machine-health_readonly'] = false;
        }
      }

      return { ...r, permissions: updatedPerms };
    }));
  };

  // Bulk Apply Helpers
  const handleGrantAll = () => {
    if (isSuperAdmin) return;
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;
      const updated: any = { ...r.permissions, settings: true, workers_view_all: true };
      MODULE_DEFINITIONS.forEach(m => {
        updated[m.key] = true;
        if (m.readonlyKey) updated[m.readonlyKey] = false;
      });
      updated['machine-health'] = true;
      updated['machine-health_readonly'] = false;
      return { ...r, permissions: updated };
    }));
    logAction('Permissions Updated', `Granted all access to role "${selectedRole.name}".`, 'info');
  };

  const handleMakeAllReadOnly = () => {
    if (isSuperAdmin) return;
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;
      const updated: any = { ...r.permissions, settings: false, workers_view_all: true };
      MODULE_DEFINITIONS.forEach(m => {
        updated[m.key] = true;
        if (m.readonlyKey) updated[m.readonlyKey] = true;
      });
      updated['machine-health'] = true;
      updated['machine-health_readonly'] = true;
      return { ...r, permissions: updated };
    }));
    logAction('Permissions Updated', `Set all modules to Read-Only for role "${selectedRole.name}".`, 'info');
  };

  const handleRevokeAll = () => {
    if (isSuperAdmin) return;
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;
      const updated: any = { ...r.permissions, settings: false, workers_view_all: false };
      MODULE_DEFINITIONS.forEach(m => {
        updated[m.key] = false;
        if (m.readonlyKey) updated[m.readonlyKey] = false;
      });
      updated['machine-health'] = false;
      updated['machine-health_readonly'] = false;
      return { ...r, permissions: updated };
    }));
    logAction('Permissions Updated', `Revoked all access for role "${selectedRole.name}".`, 'warning');
  };

  // Create New Role
  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;

    let basePermissions: Role['permissions'];
    if (newRoleTemplate === 'blank') {
      basePermissions = {
        workers: false,
        workers_readonly: false,
        workers_view_all: false,
        maintenance: false,
        maintenance_readonly: false,
        cnc: false,
        cnc_readonly: false,
        auxiliary: false,
        auxiliary_readonly: false,
        production: false,
        production_readonly: false,
        complaints: false,
        complaints_readonly: false,
        machines: false,
        machines_readonly: false,
        machine_health: false,
        'machine-health': false,
        machine_health_readonly: false,
        archive: false,
        archive_readonly: false,
        settings: false
      };
    } else {
      const templateRole = defaultRoles.find(r => r.id === newRoleTemplate) || defaultRoles[1];
      basePermissions = { ...templateRole.permissions };
    }

    const newRole: Role = {
      id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newRoleName.trim(),
      description: `Custom role created from ${newRoleTemplate} template.`,
      permissions: basePermissions
    };

    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setIsCreateModalOpen(false);
    setNewRoleName('');
    logAction('Role Created', `Created custom role "${newRole.name}".`, 'success');
  };

  // Delete Role
  const handleDeleteRole = (id: string) => {
    if (isBuiltIn) {
      alert('Built-in system roles cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete the role "${selectedRole.name}"?`)) {
      const updated = roles.filter(r => r.id !== id);
      setRoles(updated);
      setSelectedRoleId(updated[0]?.id || 'super-admin');
      logAction('Role Deleted', `Deleted custom role "${selectedRole.name}".`, 'warning');
    }
  };

  // Save Role Name
  const handleSaveRoleName = (id: string) => {
    if (!editRoleName.trim()) return;
    setRoles(prev => prev.map(r => r.id === id ? { ...r, name: editRoleName.trim() } : r));
    setEditingRoleId(null);
    logAction('Role Renamed', `Renamed role to "${editRoleName.trim()}".`, 'info');
  };

  // Toggle Job Title for Worker Filter
  const handleTitleToggle = (title: string) => {
    if (isSuperAdmin) return;
    const currentTitles = Array.isArray(selectedRole.permissions.workers_view_titles) 
      ? selectedRole.permissions.workers_view_titles 
      : [];
    const newTitles = currentTitles.includes(title)
      ? currentTitles.filter(t => t !== title)
      : [...currentTitles, title];

    setRoles(prev => prev.map(r => {
      if (r.id === selectedRole.id) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            workers_view_titles: newTitles
          }
        };
      }
      return r;
    }));
  };

  const handleSelectAllTitles = () => {
    if (isSuperAdmin) return;
    setRoles(prev => prev.map(r => {
      if (r.id === selectedRole.id) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            workers_view_titles: [...jobTitles]
          }
        };
      }
      return r;
    }));
  };

  const handleClearAllTitles = () => {
    if (isSuperAdmin) return;
    setRoles(prev => prev.map(r => {
      if (r.id === selectedRole.id) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            workers_view_titles: []
          }
        };
      }
      return r;
    }));
  };

  const triggerSaveFeedback = () => {
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  // Category mapping
  const categories = [
    { id: 'production', label: 'Production & Manufacturing', icon: Factory, color: 'text-blue-400' },
    { id: 'maintenance', label: 'Maintenance & Tooling', icon: Wrench, color: 'text-amber-400' },
    { id: 'workforce', label: 'Personnel & KPIs', icon: Users, color: 'text-emerald-400' },
    { id: 'admin', label: 'Administration & System', icon: Shield, color: 'text-purple-400' },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-4 border-b border-divider/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              Roles & Access Permissions
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                RBAC Security
              </span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Control module visibility, configure read-only modes, and isolate departmental access across shop floor accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Custom Role</span>
          </button>

          <button
            type="button"
            onClick={triggerSaveFeedback}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              saveFeedback
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-surface hover:bg-surface-elevated border-divider text-secondary hover:text-white'
            }`}
          >
            {saveFeedback ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-blue-400" />}
            <span>{saveFeedback ? 'Changes Active' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column RBAC Studio */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden pb-4">
        {/* Left Column: Roles Roster */}
        <div className="w-full lg:w-80 shrink-0 bg-surface/70 border border-divider rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm shadow-sm">
          {/* Roster Header */}
          <div className="p-4 border-b border-divider flex items-center justify-between gap-2 shrink-0 bg-surface-elevated/40">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">System Roles</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-secondary bg-canvas px-2 py-0.5 rounded-full border border-divider">
              {roles.length} Roles
            </span>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-divider bg-canvas/30 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchRoleQuery}
                onChange={e => setSearchRoleQuery(e.target.value)}
                placeholder="Search roles..."
                className="w-full bg-canvas border border-divider rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Roles List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredRoles.map(role => {
              const isSelected = selectedRoleId === role.id;
              const accessCount = getRoleAccessCount(role);
              const isSuper = role.id === 'super-admin';

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/30'
                      : 'bg-canvas/40 hover:bg-surface-elevated/60 border-divider/60 hover:border-divider'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isSuper ? 'bg-rose-400' : isSelected ? 'bg-blue-400' : 'bg-slate-500'
                      }`} />
                      <h4 className={`text-xs font-bold truncate ${
                        isSelected ? 'text-blue-400' : 'text-primary'
                      }`}>
                        {role.name}
                      </h4>
                    </div>

                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 font-mono ${
                      isSuper 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : isBuiltIn 
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' 
                        : 'bg-canvas text-tertiary border border-divider'
                    }`}>
                      {isSuper ? 'Master' : isBuiltIn ? 'Core' : 'Custom'}
                    </span>
                  </div>

                  <p className="text-[11px] text-tertiary line-clamp-1 mb-2 font-normal">
                    {role.description || 'Custom organizational security role.'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-tertiary border-t border-divider/40 pt-1.5">
                    <span>
                      {isSuper ? 'All Modules Enabled' : `${accessCount} of ${MODULE_DEFINITIONS.length} Active`}
                    </span>
                    <div className="w-16 h-1 bg-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isSuper ? 'bg-rose-400' : 'bg-blue-500'}`}
                        style={{ width: `${(accessCount / MODULE_DEFINITIONS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRoles.length === 0 && (
              <div className="py-8 text-center text-xs text-tertiary">
                No matching roles found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Role Permissions Matrix */}
        <div className="flex-1 bg-surface/70 border border-divider rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm shadow-sm">
          {/* Active Role Title & Quick Actions Header */}
          <div className="p-5 border-b border-divider bg-surface-elevated/40 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  {editingRoleId === selectedRole.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editRoleName}
                        onChange={e => setEditRoleName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveRoleName(selectedRole.id)}
                        className="bg-canvas border border-blue-500 rounded-lg px-2.5 py-1 text-sm font-bold text-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRoleName(selectedRole.id)}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoleId(null)}
                        className="p-1.5 bg-surface text-secondary hover:text-white rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-primary">{selectedRole.name}</h3>
                      {!isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleId(selectedRole.id);
                            setEditRoleName(selectedRole.name);
                          }}
                          className="text-tertiary hover:text-blue-400 p-1 rounded-md transition-colors"
                          title="Rename Role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSuperAdmin
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                      : isBuiltIn
                      ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                      : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                  }`}>
                    {isSuperAdmin ? 'Full Master Access' : isBuiltIn ? 'Built-in Role' : 'Custom Profile'}
                  </span>
                </div>

                <p className="text-xs text-tertiary mt-1 leading-relaxed">
                  {selectedRole.description || 'Configurable module security clearance profile.'}
                </p>
              </div>

              {/* Bulk Batch Actions & Delete Button */}
              <div className="flex items-center gap-2 shrink-0">
                {!isSuperAdmin && (
                  <div className="flex items-center gap-1.5 bg-canvas/60 p-1 rounded-xl border border-divider">
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Set all modules to Full Access"
                    >
                      Grant All
                    </button>
                    <span className="text-tertiary/40">|</span>
                    <button
                      type="button"
                      onClick={handleMakeAllReadOnly}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Set all modules to View Only"
                    >
                      Read Only All
                    </button>
                    <span className="text-tertiary/40">|</span>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="px-2.5 py-1 text-[11px] font-semibold text-tertiary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Set all modules to No Access"
                    >
                      Revoke All
                    </button>
                  </div>
                )}

                {!isBuiltIn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(selectedRole.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                    title="Delete custom role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Super Admin Lock Banner */}
          {isSuperAdmin && (
            <div className="mx-6 mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-rose-300">Protected Master Security Role</h4>
                <p className="text-rose-200/80 mt-0.5 leading-relaxed">
                  Super Administrators inherently possess permanent read and write permissions across every factory module. These settings cannot be revoked to prevent administrative lockouts.
                </p>
              </div>
            </div>
          )}

          {/* Module Categories & Permissions Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {categories.map(cat => {
              const catModules = MODULE_DEFINITIONS.filter(m => m.category === cat.id);
              const CatIcon = cat.icon;

              return (
                <div key={cat.id} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-divider/60">
                    <CatIcon className={`w-4 h-4 ${cat.color}`} />
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      {cat.label}
                    </h4>
                  </div>

                  {/* Category Module Cards */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {catModules.map(mod => {
                      const ModIcon = mod.icon;
                      const level = isSuperAdmin ? 'full' : getModuleAccessLevel(selectedRole, mod);

                      return (
                        <div
                          key={mod.key}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            level === 'full'
                              ? 'bg-canvas/70 border-blue-500/30 shadow-xs'
                              : level === 'readonly'
                              ? 'bg-canvas/50 border-amber-500/30 shadow-xs'
                              : 'bg-canvas/30 border-divider/50 opacity-80'
                          }`}
                        >
                          {/* Module Info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              level === 'full'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                : level === 'readonly'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-surface text-tertiary border border-divider'
                            }`}>
                              <ModIcon className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-primary truncate">
                                  {mod.label}
                                </h5>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                                  level === 'full'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : level === 'readonly'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-surface text-tertiary'
                                }`}>
                                  {level === 'full' ? 'Read / Write' : level === 'readonly' ? 'View Only' : 'Hidden'}
                                </span>
                              </div>
                              <p className="text-[11px] text-tertiary mt-0.5 line-clamp-1">
                                {mod.description}
                              </p>
                            </div>
                          </div>

                          {/* 3-Way Permission Selector */}
                          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-divider shrink-0">
                            {/* Option 1: No Access */}
                            <button
                              type="button"
                              disabled={isSuperAdmin}
                              onClick={() => setModuleAccessLevel(mod, 'none')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                level === 'none'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'text-tertiary hover:text-secondary'
                              } ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title="Hide module completely"
                            >
                              <Ban className="w-3 h-3" />
                              <span>No Access</span>
                            </button>

                            {/* Option 2: View Only (if module supports readonly) */}
                            {mod.readonlyKey ? (
                              <button
                                type="button"
                                disabled={isSuperAdmin}
                                onClick={() => setModuleAccessLevel(mod, 'readonly')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  level === 'readonly'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-tertiary hover:text-secondary'
                                } ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                                title="Allow viewing only, disable modifications"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Only</span>
                              </button>
                            ) : null}

                            {/* Option 3: Full Access */}
                            <button
                              type="button"
                              disabled={isSuperAdmin}
                              onClick={() => setModuleAccessLevel(mod, 'full')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                level === 'full'
                                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                                  : 'text-tertiary hover:text-secondary'
                              } ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title="Full creation, edit, and deletion rights"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Full Access</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Granular Worker Titles Filter */}
            {selectedRole.permissions.workers && (
              <div className="p-5 bg-canvas/70 border border-divider rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Granular Worker Visibility
                    </h4>
                    <p className="text-xs text-tertiary mt-1">
                      Choose whether this role can see all company workers, or only workers in specific job roles.
                    </p>
                  </div>

                  {/* Toggle View All */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSuperAdmin}
                      onClick={() => {
                        if (isSuperAdmin) return;
                        setRoles(prev => prev.map(r => {
                          if (r.id !== selectedRole.id) return r;
                          return {
                            ...r,
                            permissions: {
                              ...r.permissions,
                              workers_view_all: !r.permissions.workers_view_all
                            }
                          };
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedRole.permissions.workers_view_all
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {selectedRole.permissions.workers_view_all ? 'View All Workers' : 'Restricted by Job Title'}
                    </button>
                  </div>
                </div>

                {/* Filter Titles Selector if Restricted */}
                {!selectedRole.permissions.workers_view_all && (
                  <div className="pt-3 border-t border-divider space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-tertiary">
                        Selected Titles: {(selectedRole.permissions.workers_view_titles || []).length} of {jobTitles.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllTitles}
                          className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-tertiary">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllTitles}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-canvas border border-divider rounded-xl">
                      {jobTitles.map((title: string) => {
                        const viewTitles = selectedRole.permissions.workers_view_titles || [];
                        const isChecked = viewTitles.includes(title);

                        return (
                          <button
                            type="button"
                            key={title}
                            onClick={() => handleTitleToggle(title)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-semibold'
                                : 'bg-surface border-divider text-tertiary hover:text-secondary'
                            }`}
                          >
                            {isChecked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                            <span dir="auto"><bdi>{title}</bdi></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create New Role */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="bg-canvas border border-divider rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Create New Custom Role</h3>
                  <p className="text-xs text-tertiary">Configure a customized security profile.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-tertiary hover:text-primary p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Role Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Quality Control Lead, Tooling Technician..."
                  className="w-full bg-surface border border-divider rounded-xl px-3.5 py-2.5 text-xs text-primary focus:ring-1 focus:ring-blue-500 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Initial Permissions Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'supervisor', label: 'Shift Supervisor', desc: 'Active line operations' },
                    { id: 'manager', label: 'Plant Manager', desc: 'Broad shop management' },
                    { id: 'worker', label: 'Machine Operator', desc: 'Restricted floor access' },
                    { id: 'blank', label: 'Blank (No Access)', desc: 'Configure from scratch' },
                  ].map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => setNewRoleTemplate(tpl.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        newRoleTemplate === tpl.id
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                          : 'bg-surface border-divider text-secondary hover:border-divider-subtle'
                      }`}
                    >
                      <span className="text-xs font-bold block">{tpl.label}</span>
                      <span className="text-[10px] text-tertiary block mt-0.5">{tpl.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-divider">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
