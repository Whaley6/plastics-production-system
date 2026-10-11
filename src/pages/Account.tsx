import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Shield, 
  Users, 
  Plus, 
  Trash2, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Search, 
  UserPlus, 
  RefreshCw, 
  Copy, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Fingerprint, 
  CheckCheck, 
  Factory, 
  Wrench,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Role, defaultRoles } from './Roles';
import { logAction } from '../utils/logger';

// Password strength evaluator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'None', color: 'bg-divider' };
  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 25;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 25;
  if (/[^a-zA-Z0-9]/.test(password)) score += 25;

  if (score <= 25) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 50) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 75) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

// Secure readable password generator
function generateSecurePassword(): string {
  const words = ['Apex', 'Delta', 'Nova', 'Vortex', 'Steel', 'Prime', 'Shield', 'Matrix', 'Pulse', 'Forge'];
  const symbols = ['!', '@', '#', '$', '%', '*', '&'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${randomWord}${randomNum}${randomSym}`;
}

export default function Account() {
  const { user, login } = useAuth();
  const [roles] = useLocalStorage<Role[]>('app_roles', []);
  const allRoles = useMemo(() => roles.length > 0 ? roles : defaultRoles, [roles]);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState('worker');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

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
  const [targetUserRole, setTargetUserRole] = useState<string>('');
  const [targetUserNewPass, setTargetUserNewPass] = useState('');
  const [targetUserConfirmPass, setTargetUserConfirmPass] = useState('');
  const [showTargetPass, setShowTargetPass] = useState(false);
  const [targetModalError, setTargetModalError] = useState('');
  const [targetModalSuccess, setTargetModalSuccess] = useState('');
  const [isTargetModalSubmitting, setIsTargetModalSubmitting] = useState(false);
  const [copiedTargetPass, setCopiedTargetPass] = useState(false);

  // Admin changing specific user role modal state
  const [targetRoleModal, setTargetRoleModal] = useState<string | null>(null);
  const [targetSelectedRole, setTargetSelectedRole] = useState<string>('worker');
  const [roleModalError, setRoleModalError] = useState('');
  const [roleModalSuccess, setRoleModalSuccess] = useState('');
  const [isRoleModalSubmitting, setIsRoleModalSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
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
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super-admin') {
      fetchUsers();
    }
  }, [user]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearch, roleFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter(u => u.role === 'super-admin' || u.username === 'admin').length;
    const managers = usersList.filter(u => u.role === 'manager' || u.role === 'supervisor').length;
    const operators = usersList.filter(u => u.role === 'worker' || (!['super-admin', 'manager', 'supervisor'].includes(u.role) && u.username !== 'admin')).length;
    return { total, admins, managers, operators };
  }, [usersList]);

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!newUsername.trim()) {
      setCreateError('Username is required');
      return;
    }
    if (usersList.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setCreateError('A user with this username already exists');
      return;
    }
    if (!newPassword) {
      setCreateError('Password is required');
      return;
    }
    if (newPassword.length < 3) {
      setCreateError('Password must be at least 3 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: newUsername.trim(), 
          password: newPassword, 
          role: newRole 
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreateSuccess(`Account "${newUsername}" created successfully!`);
        await logAction('Account', `Created new user account: ${newUsername} (${newRole})`, 'success');
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');
        fetchUsers();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateSuccess('');
        }, 1200);
      } else {
        setCreateError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setCreateError('Connection error occurred');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (username: string) => {
    if (username === 'admin') {
      alert('The root system admin account cannot be deleted.');
      return;
    }
    if (username === user?.username) {
      alert('You cannot delete your own currently active account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user account "${username}"?`)) return;

    try {
      const res = await fetch(`/api/users/${username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await logAction('Account', `Deleted user account: ${username}`, 'warning');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user account');
    }
  };

  // Change Current User Password Handler
  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Please enter your current password');
      return;
    }
    if (!profileNewPassword) {
      setPassError('Please enter a new password');
      return;
    }
    if (profileNewPassword.length < 3) {
      setPassError('New password must be at least 3 characters');
      return;
    }
    if (profileNewPassword !== confirmNewPassword) {
      setPassError('New passwords do not match');
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
        setPassSuccess('Your password has been updated successfully!');
        await logAction('Account', `Changed password for user: ${user?.username}`, 'info');
        setCurrentPassword('');
        setProfileNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPassSuccess(''), 4000);
      } else {
        setPassError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setPassError('Connection error occurred');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Admin Override Password for Target User
  const handleSaveTargetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserModal) return;
    setTargetModalError('');
    setTargetModalSuccess('');

    if (!targetUserNewPass) {
      setTargetModalError('Please enter a new password');
      return;
    }
    if (targetUserNewPass.length < 3) {
      setTargetModalError('Password must be at least 3 characters');
      return;
    }
    if (targetUserNewPass !== targetUserConfirmPass) {
      setTargetModalError('Passwords do not match');
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
        setTargetModalSuccess(`Password for "${targetUserModal}" updated successfully!`);
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
      setTargetModalError('Connection error occurred');
    } finally {
      setIsTargetModalSubmitting(false);
    }
  };

  // Admin Override Role for Target User
  const handleSaveTargetUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoleModal) return;
    setRoleModalError('');
    setRoleModalSuccess('');

    if (targetRoleModal === 'admin' && targetSelectedRole !== 'super-admin') {
      setRoleModalError('Root admin account cannot be demoted.');
      return;
    }

    setIsRoleModalSubmitting(true);
    try {
      const res = await fetch(`/api/users/${targetRoleModal}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetSelectedRole
        })
      });
      const data = await res.json();
      if (data.success) {
        const roleLabel = allRoles.find(r => r.id === targetSelectedRole)?.name || targetSelectedRole;
        setRoleModalSuccess(`Role for "${targetRoleModal}" updated to ${roleLabel}!`);
        await logAction('Account', `Admin updated role for user: ${targetRoleModal} to ${targetSelectedRole}`, 'warning');
        if (targetRoleModal === user?.username) {
          login({ ...user, role: targetSelectedRole });
        }
        fetchUsers();
        setTimeout(() => {
          setTargetRoleModal(null);
          setRoleModalSuccess('');
        }, 1200);
      } else {
        setRoleModalError(data.error || 'Failed to update user role');
      }
    } catch (err) {
      setRoleModalError('Connection error occurred');
    } finally {
      setIsRoleModalSubmitting(false);
    }
  };

  // Helper for Role UI styling
  const getRoleStyle = (roleId: string, roleName?: string) => {
    switch (roleId) {
      case 'super-admin':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dot: 'bg-purple-400',
          avatarGradient: 'from-purple-600 to-indigo-600',
          name: roleName || 'Super Admin',
          icon: ShieldAlert
        };
      case 'manager':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          dot: 'bg-blue-400',
          avatarGradient: 'from-blue-600 to-cyan-600',
          name: roleName || 'Plant Manager',
          icon: ShieldCheck
        };
      case 'supervisor':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400',
          avatarGradient: 'from-amber-600 to-orange-600',
          name: roleName || 'Shift Supervisor',
          icon: Users
        };
      case 'worker':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
          avatarGradient: 'from-emerald-600 to-teal-600',
          name: roleName || 'Machine Operator',
          icon: Factory
        };
      default:
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-400',
          avatarGradient: 'from-indigo-600 to-violet-600',
          name: roleName || roleId,
          icon: Shield
        };
    }
  };

  const currentRoleStyle = getRoleStyle(user?.role || '', allRoles.find(r => r.id === user?.role)?.name);
  const myPasswordStrength = getPasswordStrength(profileNewPassword);

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-4 border-b border-divider/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              Account & Identity Center
              <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border ${currentRoleStyle.bg}`}>
                {currentRoleStyle.name}
              </span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Manage personal credentials, review security settings, and administer authorized shop-floor operator accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.role === 'super-admin' && (
            <>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-elevated border border-divider text-secondary hover:text-primary rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                title="Refresh user roster"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-blue-400' : 'text-tertiary'}`} />
                <span className="hidden sm:inline">Sync Roster</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setCreateError('');
                  setCreateSuccess('');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Roster Overview Metric Cards (Super Admin) */}
      {user?.role === 'super-admin' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
          <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Total Accounts</p>
              <p className="text-lg font-bold text-primary tracking-tight mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Admins & Root</p>
              <p className="text-lg font-bold text-purple-400 tracking-tight mt-0.5">{metrics.admins}</p>
            </div>
          </div>

          <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Supervisors & Mgrs</p>
              <p className="text-lg font-bold text-amber-400 tracking-tight mt-0.5">{metrics.managers}</p>
            </div>
          </div>

          <div className="bg-surface border border-divider/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Factory className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Operators & Staff</p>
              <p className="text-lg font-bold text-emerald-400 tracking-tight mt-0.5">{metrics.operators}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto pr-1 pb-10 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Personal Profile & Security */}
        <div className={`w-full ${user?.role === 'super-admin' ? 'lg:w-[380px] xl:w-[420px]' : 'max-w-2xl mx-auto'} shrink-0 space-y-6`}>
          
          {/* Identity & Profile Card */}
          <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentRoleStyle.avatarGradient} flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-surface shrink-0 relative`}>
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'US'}
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-surface"></span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-primary truncate capitalize">
                    {user?.username || 'Authenticated User'}
                  </h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">
                    Online
                  </span>
                </div>
                <p className="text-xs text-tertiary mt-0.5">
                  @{user?.username || 'user'}
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-canvas/60">
                  <currentRoleStyle.icon className={`w-3.5 h-3.5 ${currentRoleStyle.dot.replace('bg-', 'text-')}`} />
                  <span className="text-secondary">{currentRoleStyle.name}</span>
                </div>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="space-y-3 pt-4 border-t border-divider/60 text-xs">
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-elevated/50 border border-divider-subtle">
                <span className="text-tertiary flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Clearance Level
                </span>
                <span className="font-semibold text-primary capitalize">
                  {user?.role === 'super-admin' ? 'Root Full Control' : user?.role || 'Standard'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-elevated/50 border border-divider-subtle">
                <span className="text-tertiary flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Active Session
                </span>
                <span className="font-medium text-secondary">
                  Local Terminal
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-elevated/50 border border-divider-subtle">
                <span className="text-tertiary flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Security Provider
                </span>
                <span className="font-medium text-secondary">
                  SQLite / Postgres Auth
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Change Password</h3>
                  <p className="text-[11px] text-tertiary">Update personal login credentials</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangeMyPassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'} 
                    value={profileNewPassword} 
                    onChange={e => setProfileNewPassword(e.target.value)} 
                    placeholder="Enter new secure password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {profileNewPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-tertiary">Strength:</span>
                      <span className={`font-semibold ${
                        myPasswordStrength.score <= 25 ? 'text-rose-400' :
                        myPasswordStrength.score <= 50 ? 'text-amber-400' :
                        myPasswordStrength.score <= 75 ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {myPasswordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${myPasswordStrength.color}`}
                        style={{ width: `${Math.max(15, myPasswordStrength.score)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? 'text' : 'password'} 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmNewPassword && profileNewPassword && (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-medium ${
                    confirmNewPassword === profileNewPassword ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {confirmNewPassword === profileNewPassword ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                    ) : (
                      <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>
                    )}
                  </p>
                )}
              </div>

              {passError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isChangingPass}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer pt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isChangingPass ? 'Updating Credentials...' : 'Save New Password'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Super-Admin User Management Hub */}
        {user?.role === 'super-admin' && (
          <div className="flex-1 space-y-6 min-w-0">
            <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-sm flex flex-col h-full">
              
              {/* Header and Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider/60">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    Authorized System Users
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-elevated text-secondary border border-divider">
                      {filteredUsers.length} accounts
                    </span>
                  </h3>
                  <p className="text-xs text-tertiary mt-0.5">
                    Configure operator access credentials, role designations, and administrative resets.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search username..."
                    className="w-full pl-9 pr-3.5 py-2 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 transition-all placeholder:text-tertiary/60"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-divider/40 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-surface-elevated/70 hover:bg-surface-elevated text-secondary hover:text-primary border border-divider-subtle'
                  }`}
                >
                  All ({usersList.length})
                </button>
                {allRoles.map(r => {
                  const count = usersList.filter(u => u.role === r.id).length;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleFilter(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        roleFilter === r.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-surface-elevated/70 hover:bg-surface-elevated text-secondary hover:text-primary border border-divider-subtle'
                      }`}
                    >
                      {r.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Users Roster Table / Card List */}
              <div className="flex-1 overflow-x-auto pt-3">
                {filteredUsers.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center text-tertiary mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-primary">No accounts found</h4>
                    <p className="text-xs text-tertiary max-w-xs mx-auto mt-1">
                      {userSearch ? `No accounts match "${userSearch}".` : 'No accounts registered under this role filter.'}
                    </p>
                    {(userSearch || roleFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setUserSearch(''); setRoleFilter('all'); }}
                        className="mt-3.5 px-3 py-1.5 bg-surface-elevated hover:bg-surface-strong text-primary rounded-xl text-xs font-semibold transition border border-divider cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-divider/60 text-[11px] font-semibold text-tertiary uppercase tracking-wider">
                        <th className="pb-3 pl-2">User Identity</th>
                        <th className="pb-3 px-3">Role Designation</th>
                        <th className="pb-3 px-3 hidden md:table-cell">Account Status</th>
                        <th className="pb-3 pr-2 text-right">Security Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/40">
                      {filteredUsers.map((u, i) => {
                        const roleObj = allRoles.find(r => r.id === u.role);
                        const rStyle = getRoleStyle(u.role, roleObj?.name);
                        const isSelf = u.username === user?.username;
                        const isRootAdmin = u.username === 'admin';

                        return (
                          <tr key={i} className="hover:bg-surface-elevated/40 transition-colors group">
                            {/* User Identity Column */}
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${rStyle.avatarGradient} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0`}>
                                  {u.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-primary text-xs tracking-tight">
                                      {u.username}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">
                                        You
                                      </span>
                                    )}
                                    {isRootAdmin && (
                                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-semibold">
                                        System Root
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-tertiary mt-0.5 truncate">
                                    Local Database Account
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role Column */}
                            <td className="py-3.5 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isRootAdmin) return;
                                  setTargetRoleModal(u.username);
                                  setTargetSelectedRole(u.role);
                                  setRoleModalError('');
                                  setRoleModalSuccess('');
                                }}
                                disabled={isRootAdmin}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${rStyle.bg} ${
                                  isRootAdmin 
                                    ? 'cursor-default' 
                                    : 'hover:opacity-90 hover:ring-1 hover:ring-purple-400/40 cursor-pointer'
                                }`}
                                title={isRootAdmin ? "Root admin role is locked" : `Click to change role for ${u.username}`}
                              >
                                <rStyle.icon className="w-3.5 h-3.5" />
                                <span>{rStyle.name}</span>
                                {!isRootAdmin && (
                                  <span className="text-[10px] opacity-70 underline ml-0.5 font-normal">Edit</span>
                                )}
                              </button>
                            </td>

                            {/* Status Column */}
                            <td className="py-3.5 px-3 hidden md:table-cell">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                                <span className="text-secondary font-medium text-xs">Active</span>
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3.5 pr-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isRootAdmin) return;
                                    setTargetRoleModal(u.username);
                                    setTargetSelectedRole(u.role);
                                    setRoleModalError('');
                                    setRoleModalSuccess('');
                                  }}
                                  disabled={isRootAdmin}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                                    isRootAdmin
                                      ? 'opacity-40 cursor-not-allowed bg-surface-elevated/40 text-tertiary border-divider-subtle'
                                      : 'bg-surface-elevated/70 hover:bg-purple-500/10 hover:border-purple-500/30 text-secondary hover:text-purple-400 border-divider-subtle cursor-pointer'
                                  }`}
                                  title={isRootAdmin ? "Root admin role is locked" : `Modify role and permissions for ${u.username}`}
                                >
                                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="hidden sm:inline">Change Role</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetUserModal(u.username);
                                    setTargetUserRole(rStyle.name);
                                    setTargetUserNewPass('');
                                    setTargetUserConfirmPass('');
                                    setTargetModalError('');
                                    setTargetModalSuccess('');
                                    setCopiedTargetPass(false);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated/70 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-secondary hover:text-emerald-400 border border-divider-subtle rounded-xl text-xs font-medium transition cursor-pointer"
                                  title={`Reset password for ${u.username}`}
                                >
                                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="hidden sm:inline">Set Password</span>
                                </button>

                                {!isRootAdmin && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.username)}
                                    className="p-1.5 text-tertiary hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition cursor-pointer"
                                    title={`Delete account ${u.username}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-divider rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">Create User Account</h3>
                  <p className="text-xs text-tertiary">Grant new credentials and permissions</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-elevated cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Account Username
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newUsername} 
                    onChange={e => setNewUsername(e.target.value)} 
                    placeholder="e.g. jsmith or operator_04"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Operational Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allRoles.map(r => {
                    const isSelected = newRole === r.id;
                    const rStyle = getRoleStyle(r.id, r.name);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setNewRole(r.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-canvas hover:bg-surface-elevated border-divider text-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <rStyle.icon className="w-3.5 h-3.5" />
                          <span className={isSelected ? 'text-blue-400' : 'text-primary'}>{r.name}</span>
                        </div>
                        <p className="text-[10px] text-tertiary truncate">
                          {r.description || 'Custom factory role'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateSecurePassword();
                      setNewPassword(generated);
                      setConfirmPassword(generated);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showCreatePass ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Enter or generate password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors cursor-pointer"
                  >
                    {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Confirm Password
                </label>
                <input 
                  type={showCreatePass ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Re-enter password"
                  required
                  className="w-full px-3.5 py-2.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingUser ? 'Creating User...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN RESET PASSWORD MODAL */}
      {targetUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-divider rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Admin Password Reset
                  </h3>
                  <p className="text-[11px] text-tertiary">
                    Target account: <span className="font-semibold text-blue-400">{targetUserModal}</span> ({targetUserRole})
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setTargetUserModal(null)}
                className="text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-elevated cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Generator Toolbar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated/70 border border-divider-subtle">
              <span className="text-[11px] font-medium text-secondary">Quick Pass Generator:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const gen = generateSecurePassword();
                    setTargetUserNewPass(gen);
                    setTargetUserConfirmPass(gen);
                    setCopiedTargetPass(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate</span>
                </button>
                {targetUserNewPass && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(targetUserNewPass);
                      setCopiedTargetPass(true);
                      setTimeout(() => setCopiedTargetPass(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedTargetPass ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTargetPass ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveTargetUserPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showTargetPass ? 'text' : 'password'} 
                    value={targetUserNewPass} 
                    onChange={e => setTargetUserNewPass(e.target.value)} 
                    placeholder="Enter new password"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowTargetPass(!showTargetPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-colors cursor-pointer"
                  >
                    {showTargetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Confirm Password
                </label>
                <input 
                  type={showTargetPass ? 'text' : 'password'} 
                  value={targetUserConfirmPass} 
                  onChange={e => setTargetUserConfirmPass(e.target.value)} 
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3.5 py-2.5 bg-canvas text-primary border border-divider rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-tertiary/60" 
                />
              </div>

              {targetModalError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{targetModalError}</span>
                </div>
              )}

              {targetModalSuccess && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{targetModalSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTargetModalSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isTargetModalSubmitting ? 'Saving...' : 'Apply Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER ROLE MODAL */}
      {targetRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-divider rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Modify Account Role
                  </h3>
                  <p className="text-[11px] text-tertiary">
                    Target account: <span className="font-semibold text-blue-400">{targetRoleModal}</span>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setTargetRoleModal(null)}
                className="text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-elevated cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning if editing own role */}
            {targetRoleModal === user?.username && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Notice: You are updating your own active account role. System clearances will immediately reflect the new permissions.</span>
              </div>
            )}

            {/* Role Selection Grid */}
            <form onSubmit={handleSaveTargetUserRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Select New Operational Role
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {allRoles.map(r => {
                    const isSelected = targetSelectedRole === r.id;
                    const rStyle = getRoleStyle(r.id, r.name);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTargetSelectedRole(r.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-600/10 border-purple-500/40 text-purple-400 ring-1 ring-purple-500/30'
                            : 'bg-canvas hover:bg-surface-elevated border-divider text-secondary'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${rStyle.avatarGradient} flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs`}>
                            <rStyle.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-bold text-xs ${isSelected ? 'text-purple-400' : 'text-primary'}`}>
                              {r.name}
                            </p>
                            <p className="text-[11px] text-tertiary mt-0.5 line-clamp-2">
                              {r.description || 'Standard access permissions'}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {roleModalError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{roleModalError}</span>
                </div>
              )}

              {roleModalSuccess && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{roleModalSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetRoleModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-tertiary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRoleModalSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isRoleModalSubmitting ? 'Saving Role...' : 'Assign Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
