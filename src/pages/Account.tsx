import React, { useState, useEffect } from 'react';
import { User, Shield, Users, Plus, Trash2, Key, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Role, defaultRoles } from './Roles';
import { logAction } from '../utils/logger';

export default function Account() {
  const { user } = useAuth();
  const [roles] = useLocalStorage<Role[]>('app_roles', []);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('worker');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change state for current user
  const [currentPassword, setCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Admin changing specific user password modal state
  const [targetUserModal, setTargetUserModal] = useState<string | null>(null);
  const [targetUserNewPass, setTargetUserNewPass] = useState('');
  const [targetUserConfirmPass, setTargetUserConfirmPass] = useState('');
  const [showTargetPass, setShowTargetPass] = useState(false);
  const [targetModalError, setTargetModalError] = useState('');
  const [targetModalSuccess, setTargetModalSuccess] = useState('');
  const [isTargetModalSubmitting, setIsTargetModalSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        setUsersList([]);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setUsersList([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsersList(data);
      } else {
        setUsersList([]);
      }
    } catch (err: any) {
      console.warn("Could not fetch users list:", err?.message || err);
      setUsersList([]);
    }
  };

  useEffect(() => {
    if (user?.role === 'super-admin') {
      fetchUsers();
    }
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('User created successfully');
        await logAction('Account', `Created new user account: ${newUsername} (${newRole})`, 'success');
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
    try {
      const res = await fetch(`/api/users/${username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await logAction('Account', `Deleted user account: ${username}`, 'warning');
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!profileNewPassword) {
      setPassError('Please enter a new password');
      return;
    }
    if (profileNewPassword !== confirmNewPassword) {
      setPassError('New passwords do not match');
      return;
    }
    if (profileNewPassword.length < 3) {
      setPassError('Password must be at least 3 characters');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.username,
          currentPassword: currentPassword,
          newPassword: profileNewPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setPassSuccess('Password updated successfully');
        await logAction('Account', `Changed password for user: ${user?.username}`, 'info');
        setCurrentPassword('');
        setProfileNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPassError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setPassError('Connection error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveTargetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserModal) return;
    setTargetModalError('');
    setTargetModalSuccess('');

    if (!targetUserNewPass) {
      setTargetModalError('Please enter a new password');
      return;
    }
    if (targetUserNewPass !== targetUserConfirmPass) {
      setTargetModalError('Passwords do not match');
      return;
    }
    if (targetUserNewPass.length < 3) {
      setTargetModalError('Password must be at least 3 characters');
      return;
    }

    setIsTargetModalSubmitting(true);
    try {
      const res = await fetch(`/api/users/${targetUserModal}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: targetUserNewPass
        })
      });
      const data = await res.json();
      if (data.success) {
        setTargetModalSuccess(`Password for "${targetUserModal}" changed successfully!`);
        await logAction('Account', `Admin updated password for user: ${targetUserModal}`, 'info');
        setTimeout(() => {
          setTargetUserModal(null);
          setTargetUserNewPass('');
          setTargetUserConfirmPass('');
          setTargetModalSuccess('');
        }, 1200);
      } else {
        setTargetModalError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setTargetModalError('Connection error');
    } finally {
      setIsTargetModalSubmitting(false);
    }
  };

  const allRoles = roles.length > 0 ? roles : defaultRoles;

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-primary">Account Management</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 pb-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: My Profile & Change Password */}
        <div className="w-full max-w-md space-y-6">
          {/* My Profile Card */}
          <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> My Profile
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">Username</label>
                <input type="text" readOnly value={user?.username || ''} className="w-full px-4 py-2 bg-canvas/50 text-primary font-medium border border-divider-subtle rounded-lg text-sm outline-none cursor-not-allowed" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">Role / Permissions</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="w-4 h-4 text-yellow-500" />
                  </div>
                  <input type="text" readOnly value={allRoles.find(r => r.id === user?.role)?.name || user?.role} className="w-full pl-9 px-4 py-2 bg-canvas/50 text-tertiary border border-divider-subtle rounded-lg text-sm outline-none cursor-not-allowed capitalize font-medium" />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" /> Change My Password
            </h3>

            <form onSubmit={handleChangeMyPassword} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2 pr-10 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'} 
                    value={profileNewPassword} 
                    onChange={e => setProfileNewPassword(e.target.value)} 
                    placeholder="Enter new password"
                    required
                    className="w-full px-3.5 py-2 pr-10 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? 'text' : 'password'} 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    placeholder="Confirm new password"
                    required
                    className="w-full px-3.5 py-2 pr-10 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passError && <p className="text-red-400 text-xs font-medium bg-red-500/10 p-2 rounded border border-red-500/20">{passError}</p>}
              {passSuccess && <p className="text-emerald-400 text-xs font-medium bg-emerald-500/10 p-2 rounded border border-emerald-500/20">{passSuccess}</p>}

              <button 
                type="submit" 
                disabled={isChangingPass}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* User Management (Admin Only) */}
        {user?.role === 'super-admin' && (
          <div className="flex-1 space-y-6">
            <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Manage System Users
              </h3>

              <div className="mb-6 p-4 border border-divider-subtle rounded-lg bg-surface-elevated">
                <h4 className="text-xs font-bold text-primary mb-3">Create New User</h4>
                <form onSubmit={handleCreateUser} className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-secondary mb-1">Username</label>
                    <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-secondary mb-1">Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-secondary mb-1">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-1.5 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500">
                      {allRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition h-[34px] flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Create
                  </button>
                </form>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                {success && <p className="text-emerald-400 text-xs mt-2">{success}</p>}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-divider text-xs text-tertiary">
                      <th className="pb-2 font-medium">Username</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u, i) => (
                      <tr key={i} className="border-b border-divider-subtle hover:bg-white/5 transition-colors">
                        <td className="py-2.5 text-primary font-medium flex items-center gap-2">
                          <span>{u.username}</span>
                          {u.username === 'admin' && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                          )}
                        </td>
                        <td className="py-2.5 text-secondary capitalize">{allRoles.find(r => r.id === u.role)?.name || u.role}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button" 
                              onClick={() => {
                                setTargetUserModal(u.username);
                                setTargetUserNewPass('');
                                setTargetUserConfirmPass('');
                                setTargetModalError('');
                                setTargetModalSuccess('');
                              }} 
                              className="text-tertiary hover:text-emerald-400 p-1.5 rounded hover:bg-surface-elevated transition-colors flex items-center gap-1 text-xs"
                              title={`Change password for ${u.username}`}
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Set Password</span>
                            </button>
                            {u.username !== 'admin' && (
                              <button 
                                type="button" 
                                onClick={() => handleDeleteUser(u.username)} 
                                className="text-tertiary hover:text-red-400 p-1.5 rounded hover:bg-surface-elevated transition-colors"
                                title={`Delete ${u.username}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target User Change Password Modal */}
      {targetUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-divider rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-primary">
                  Change Password: <span className="text-blue-400">{targetUserModal}</span>
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setTargetUserModal(null)}
                className="text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTargetUserPassword} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showTargetPass ? 'text' : 'password'} 
                    value={targetUserNewPass} 
                    onChange={e => setTargetUserNewPass(e.target.value)} 
                    placeholder="Enter new password"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2 pr-10 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowTargetPass(!showTargetPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors"
                  >
                    {showTargetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-secondary mb-1">Confirm New Password</label>
                <input 
                  type={showTargetPass ? 'text' : 'password'} 
                  value={targetUserConfirmPass} 
                  onChange={e => setTargetUserConfirmPass(e.target.value)} 
                  placeholder="Confirm new password"
                  required
                  className="w-full px-3.5 py-2 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" 
                />
              </div>

              {targetModalError && <p className="text-red-400 text-xs font-medium bg-red-500/10 p-2 rounded border border-red-500/20">{targetModalError}</p>}
              {targetModalSuccess && <p className="text-emerald-400 text-xs font-medium bg-emerald-500/10 p-2 rounded border border-emerald-500/20">{targetModalSuccess}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTargetModalSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isTargetModalSubmitting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
