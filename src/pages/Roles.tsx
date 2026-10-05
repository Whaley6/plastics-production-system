import { useState } from 'react';
import { Shield, Save, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useJobTitles } from '../hooks/useJobTitles';

export interface Role {
  id: string;
  name: string;
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
    machine_health_readonly?: boolean;
    archive: boolean;
    archive_readonly?: boolean;
    settings: boolean;
  };
}

export const defaultRoles: Role[] = [
  {
    id: 'super-admin',
    name: 'Super Administrator',
    permissions: { workers: true, workers_view_all: true, maintenance: true, cnc: true, auxiliary: true, production: true, complaints: true, machines: true, machine_health: true, archive: true, settings: true }
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: { workers: true, workers_view_all: true, maintenance: true, cnc: true, auxiliary: true, production: true, complaints: true, machines: true, machine_health: true, archive: false, settings: false }
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    permissions: { workers: true, workers_view_all: true, maintenance: true, cnc: false, auxiliary: false, production: true, complaints: true, machines: true, machine_health: true, archive: false, settings: false }
  },
  {
    id: 'worker',
    name: 'Worker',
    permissions: { workers: false, workers_readonly: true, workers_view_all: false, maintenance: false, maintenance_readonly: true, cnc: false, cnc_readonly: true, auxiliary: false, auxiliary_readonly: true, production: true, production_readonly: true, complaints: false, complaints_readonly: true, machines: true, machines_readonly: true, machine_health: true, machine_health_readonly: true, archive: false, archive_readonly: true, settings: false }
  }
];

export default function Roles() {
  const [storedRoles, setRoles] = useLocalStorage<Role[]>('app_roles', defaultRoles);
  const roles = storedRoles.map(r => ({
    ...r,
    permissions: {
      ...r.permissions,
      workers_view_all: r.id === 'super-admin' ? true : (r.permissions.workers_view_all ?? true),
      workers_view_titles: r.id === 'super-admin' ? [] : (Array.isArray(r.permissions.workers_view_titles) ? r.permissions.workers_view_titles : [])
    }
  }));
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id);
  const [isAdding, setIsAdding] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [workers] = useLocalStorage<any[]>('workers_data', []);
  const [jobTitles] = useJobTitles();
  const uniqueJobTitles = jobTitles;

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: newRoleName.trim(),
      permissions: { workers: false, workers_readonly: false, workers_view_all: false, maintenance: false, maintenance_readonly: false, cnc: false, cnc_readonly: false, auxiliary: false, auxiliary_readonly: false, production: false, production_readonly: false, complaints: false, complaints_readonly: false, machines: false, machines_readonly: false, machine_health: false, machine_health_readonly: false, archive: false, archive_readonly: false, settings: false }
    };
    setRoles([...roles, newRole]);
    setSelectedRoleId(newRole.id);
    setIsAdding(false);
    setNewRoleName('');
  };

  const handleDeleteRole = (id: string) => {
    const updated = roles.filter(r => r.id !== id);
    setRoles(updated);
    if (selectedRoleId === id) setSelectedRoleId(updated[0]?.id);
  };

  const handleSaveRoleName = (id: string) => {
    if (!editRoleName.trim()) return;
    setRoles(roles.map(r => r.id === id ? { ...r, name: editRoleName.trim() } : r));
    setEditingRoleId(null);
  };


  const handleTitleToggle = (title: string) => {
    if (selectedRole.id === 'super-admin') return;
    const currentTitles = Array.isArray(selectedRole.permissions.workers_view_titles) ? selectedRole.permissions.workers_view_titles : [];
    const newTitles = currentTitles.includes(title) 
      ? currentTitles.filter(t => t !== title)
      : [...currentTitles, title];
      
    setRoles(storedRoles.map(r => {
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

  const handlePermissionChange = (key: keyof Role['permissions']) => {
    if (selectedRole.id === 'super-admin') return; // Cannot edit super admin
    
    setRoles(roles.map(r => {
      if (r.id === selectedRole.id) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [key]: !r.permissions[key]
          }
        };
      }
      return r;
    }));
  };

  const handleSave = () => {
    // Note: since we use local storage, changes are saved automatically, but a visual feedback is nice.
    alert('Roles and permissions saved successfully.');
  };

  const permissionModules = [
    { key: 'workers', label: 'Worker Management', readonlyKey: 'workers_readonly' },
    { key: 'maintenance', label: 'Maintenance & Orders', readonlyKey: 'maintenance_readonly' },
    { key: 'cnc', label: 'CNC Mold Tickets', readonlyKey: 'cnc_readonly' },
    { key: 'auxiliary', label: 'Utilities Equipment', readonlyKey: 'auxiliary_readonly' },
    { key: 'production', label: 'Production Orders', readonlyKey: 'production_readonly' },
    { key: 'complaints', label: 'Worker KPIs', readonlyKey: 'complaints_readonly' },
    { key: 'machines', label: 'Machine Directory', readonlyKey: 'machines_readonly' },
    { key: 'machine_health', label: 'Machine Health & Downtime', readonlyKey: 'machine_health_readonly' },
    { key: 'archive', label: 'System Archive', readonlyKey: 'archive_readonly' },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-primary">Roles & Permissions</h2>
        <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden pb-8">
        {/* Roles List */}
        <div className="w-64 bg-surface border border-divider rounded-xl flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              <Shield className="w-4 h-4" /> System Roles
            </h3>
            <button type="button" onClick={() => setIsAdding(true)} className="text-tertiary hover:text-primary transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {isAdding && (
            <div className="p-3 border-b border-divider bg-surface-elevated flex flex-col gap-2">
              <input 
                autoFocus
                type="text" 
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="Role name..."
                className="w-full px-2 py-1.5 bg-canvas border border-divider-subtle rounded-lg text-sm text-primary outline-none focus:border-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleAddRole()}
              />
              <div className="flex items-center gap-2 justify-center">
                <button type="button" onClick={() => { setIsAdding(false); setNewRoleName(''); }} className="text-xs text-secondary hover:text-primary">Cancel</button>
                <button type="button" onClick={handleAddRole} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">Add</button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {roles.map(role => (
              <div key={role.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${selectedRoleId === role.id ? 'bg-surface-elevated' : 'hover:bg-white/5'}`}>
                {editingRoleId === role.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <input 
                      autoFocus
                      type="text" 
                      value={editRoleName}
                      onChange={e => setEditRoleName(e.target.value)}
                      className="w-full min-w-0 px-1 py-0.5 bg-canvas border border-divider-subtle rounded-lg text-sm text-primary outline-none focus:border-blue-500"
                      onKeyDown={e => e.key === 'Enter' && handleSaveRoleName(role.id)}
                    />
                    <button type="button" onClick={() => handleSaveRoleName(role.id)} className="text-blue-400 hover:text-blue-300"><Check className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setEditingRoleId(null)} className="text-secondary hover:text-primary"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`flex-1 text-sm truncate pr-2 ${selectedRoleId === role.id ? 'text-blue-400 font-medium' : 'text-secondary hover:text-primary'}`}
                  >
                    {role.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="flex-1 bg-surface border border-divider rounded-xl p-6 overflow-y-auto">
          <div className="mb-6 pb-4 border-b border-divider flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-primary">{selectedRole.name}</h3>
                {selectedRole.id !== 'super-admin' && (
                  <button type="button" onClick={() => { setEditingRoleId(selectedRole.id); setEditRoleName(selectedRole.name); }} className="text-tertiary hover:text-primary transition" title="Edit Role Name">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-tertiary">
                {selectedRole.id === 'super-admin' 
                  ? 'Super Administrators have full access to all system modules. These permissions cannot be modified.'
                  : 'Configure access levels for this role across different system modules.'}
              </p>
            </div>
            {selectedRole.id !== 'super-admin' && (
              <button type="button" 
                onClick={() => handleDeleteRole(selectedRole.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Role
              </button>
            )}
          </div>

          <div className="w-full">
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="overflow-hidden border border-divider rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-surface-elevated">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider">Module</th>
                      <th className="px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider text-center">Enable Access</th>
                      <th className="px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider text-center">Read Only</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-transparent">
                    {permissionModules.map(mod => (
                      <tr key={mod.key}>
                        <td className="px-4 py-3 text-sm font-medium text-primary">{mod.label}</td>
                        <td className="px-4 py-3 text-center">
                          <button type="button"
                            onClick={() => handlePermissionChange(mod.key as keyof Role['permissions'])}
                            disabled={selectedRole.id === 'super-admin'}
                            className={`inline-flex w-10 h-5 rounded-full p-0.5 transition-colors ${selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'bg-blue-600' : 'bg-slate-500'} ${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button"
                            onClick={() => handlePermissionChange(mod.readonlyKey as keyof Role['permissions'])}
                            disabled={selectedRole.id === 'super-admin' || !selectedRole.permissions[mod.key as keyof Role['permissions']]}
                            className={`inline-flex w-10 h-5 rounded-full p-0.5 transition-colors ${selectedRole.permissions[mod.readonlyKey as keyof Role['permissions']] ? 'bg-amber-500' : 'bg-slate-500'} ${selectedRole.id === 'super-admin' || !selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${selectedRole.permissions[mod.readonlyKey as keyof Role['permissions']] ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 pt-6 border-t border-divider">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">System Settings</p>
                <button type="button"
                  onClick={() => handlePermissionChange('settings')}
                  disabled={selectedRole.id === 'super-admin'}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${selectedRole.permissions.settings ? 'bg-blue-600' : 'bg-slate-500'} ${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${selectedRole.permissions.settings ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">View All Workers</p>
                <button type="button"
                  onClick={() => handlePermissionChange('workers_view_all')}
                  disabled={selectedRole.id === 'super-admin' || !selectedRole.permissions.workers}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${selectedRole.permissions.workers_view_all ? 'bg-blue-600' : 'bg-slate-500'} ${selectedRole.id === 'super-admin' || !selectedRole.permissions.workers ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${selectedRole.permissions.workers_view_all ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {selectedRole.permissions.workers && !selectedRole.permissions.workers_view_all && (
            <div className="mt-8 pt-6 border-t border-divider">
              <h4 className="text-sm font-bold text-primary mb-2">Visible Job Titles</h4>
              <p className="text-xs text-tertiary mb-4">Select which job titles this role is allowed to see.</p>
              <div className="flex flex-wrap gap-2">
                {uniqueJobTitles.map((title: any) => {
                  const viewTitles = Array.isArray(selectedRole.permissions.workers_view_titles) ? selectedRole.permissions.workers_view_titles : [];
                  const isSelected = viewTitles.includes(title);
                  return (
                    <button type="button"
                      key={title}
                      onClick={() => handleTitleToggle(title)}
                      disabled={selectedRole.id === 'super-admin'}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-colors border ${isSelected ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-surface border-divider text-secondary hover:text-primary hover:border-divider-subtle'} ${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
