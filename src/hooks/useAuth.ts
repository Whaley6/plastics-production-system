import { useState, useEffect } from 'react';

export interface User {
  username: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('auth_user');
      setUser(stored ? JSON.parse(stored) : null);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth_change', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth_change', handleStorageChange);
    };
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('auth_user', JSON.stringify(userData));
    window.dispatchEvent(new Event('auth_change'));
  };

  const logout = () => {
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth_change'));
  };

  return { user, login, logout };
}
