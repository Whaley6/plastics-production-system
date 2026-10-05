const fs = require('fs');
let code = fs.readFileSync('src/pages/Roles.tsx', 'utf8');

const labelsTarget = `  const permissionLabels: Record<keyof Role['permissions'], string> = {
    workers: 'Worker Management',
    maintenance: 'Maintenance & Orders',
    cnc: 'CNC Mold Tickets',
    auxiliary: 'Utilities Equipment',
    production: 'Production Orders',
    complaints: 'Worker KPIs',
    machines: 'Machine Directory',
    archive: 'System Archive',
    settings: 'System Settings',
    workers_view_all: 'View All Workers',
    workers_view_titles: 'Visible Job Titles'
  };`;

const labelsReplacement = `  const permissionModules = [
    { key: 'workers', label: 'Worker Management', readonlyKey: 'workers_readonly' },
    { key: 'maintenance', label: 'Maintenance & Orders', readonlyKey: 'maintenance_readonly' },
    { key: 'cnc', label: 'CNC Mold Tickets', readonlyKey: 'cnc_readonly' },
    { key: 'auxiliary', label: 'Utilities Equipment', readonlyKey: 'auxiliary_readonly' },
    { key: 'production', label: 'Production Orders', readonlyKey: 'production_readonly' },
    { key: 'complaints', label: 'Worker KPIs', readonlyKey: 'complaints_readonly' },
    { key: 'machines', label: 'Machine Directory', readonlyKey: 'machines_readonly' },
    { key: 'archive', label: 'System Archive', readonlyKey: 'archive_readonly' },
  ];`;

code = code.replace(labelsTarget, labelsReplacement);

const uiTarget = `<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
            {(Object.keys(permissionLabels) as Array<keyof Role['permissions']>).map(key => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">{permissionLabels[key]}</p>
                </div>
                <button
                  onClick={() => handlePermissionChange(key)}
                  disabled={selectedRole.id === 'super-admin'}
                  className={\`w-10 h-5 rounded-full p-0.5 transition-colors \${selectedRole.permissions[key] ? 'bg-blue-600' : 'bg-slate-500'} \${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}\`}
                >
                  <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${selectedRole.permissions[key] ? 'translate-x-5' : 'translate-x-0'}\`} />
                </button>
              </div>
            ))}
          </div>`;

const uiReplacement = `<div className="w-full">
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
                          <button
                            onClick={() => handlePermissionChange(mod.key as keyof Role['permissions'])}
                            disabled={selectedRole.id === 'super-admin'}
                            className={\`inline-flex w-10 h-5 rounded-full p-0.5 transition-colors \${selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'bg-blue-600' : 'bg-slate-500'} \${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}\`}
                          >
                            <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'translate-x-5' : 'translate-x-0'}\`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handlePermissionChange(mod.readonlyKey as keyof Role['permissions'])}
                            disabled={selectedRole.id === 'super-admin' || !selectedRole.permissions[mod.key as keyof Role['permissions']]}
                            className={\`inline-flex w-10 h-5 rounded-full p-0.5 transition-colors \${selectedRole.permissions[mod.readonlyKey as keyof Role['permissions']] ? 'bg-amber-500' : 'bg-slate-500'} \${selectedRole.id === 'super-admin' || !selectedRole.permissions[mod.key as keyof Role['permissions']] ? 'opacity-50 cursor-not-allowed' : ''}\`}
                          >
                            <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${selectedRole.permissions[mod.readonlyKey as keyof Role['permissions']] ? 'translate-x-5' : 'translate-x-0'}\`} />
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
                <button
                  onClick={() => handlePermissionChange('settings')}
                  disabled={selectedRole.id === 'super-admin'}
                  className={\`w-10 h-5 rounded-full p-0.5 transition-colors \${selectedRole.permissions.settings ? 'bg-blue-600' : 'bg-slate-500'} \${selectedRole.id === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}\`}
                >
                  <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${selectedRole.permissions.settings ? 'translate-x-5' : 'translate-x-0'}\`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">View All Workers</p>
                <button
                  onClick={() => handlePermissionChange('workers_view_all')}
                  disabled={selectedRole.id === 'super-admin' || !selectedRole.permissions.workers}
                  className={\`w-10 h-5 rounded-full p-0.5 transition-colors \${selectedRole.permissions.workers_view_all ? 'bg-blue-600' : 'bg-slate-500'} \${selectedRole.id === 'super-admin' || !selectedRole.permissions.workers ? 'opacity-50 cursor-not-allowed' : ''}\`}
                >
                  <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${selectedRole.permissions.workers_view_all ? 'translate-x-5' : 'translate-x-0'}\`} />
                </button>
              </div>
            </div>
          </div>`;

code = code.replace(uiTarget, uiReplacement);
fs.writeFileSync('src/pages/Roles.tsx', code);
