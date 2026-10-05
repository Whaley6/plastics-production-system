import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          login(data.user);
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        setError(res.ok ? 'Unexpected response' : 'Server error');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas text-primary">
      <div className="w-full max-w-sm bg-surface border border-divider p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-400 tracking-tighter mb-1">APEX PLASTICS</h1>
          <p className="text-sm text-tertiary uppercase tracking-wider">Operations Suite</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-secondary mb-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-tertiary" />
              </div>
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-secondary mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-tertiary" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-canvas text-primary border border-divider-subtle rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>
          
          {error && <div className="text-red-400 text-xs font-medium text-center">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
