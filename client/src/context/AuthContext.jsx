import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { socket } from '../sockets/socket';

export const AuthContext = createContext();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isRefreshing = false;
    let lastActivity = Date.now();
    let tokenExpiry = localStorage.getItem('tokenExpiry') ? parseInt(localStorage.getItem('tokenExpiry'), 10) : 0;

    const activityHandler = () => {
      lastActivity = Date.now();
      // If active again but token expired, try to refresh immediately
      if (Date.now() > tokenExpiry - 60000 && !isRefreshing) {
        doSilentRefresh();
      }
    };

    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keydown', activityHandler);
    window.addEventListener('click', activityHandler);

    const doSilentRefresh = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const { res, data } = await authService.refresh();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          tokenExpiry = Date.now() + (data.expiresIn * 1000);
          localStorage.setItem('tokenExpiry', tokenExpiry.toString());
          setUser(prev => prev || data); // keep existing user or set new
        } else {
          // Refresh failed (expired or invalid), log out
          localStorage.removeItem('token');
          localStorage.removeItem('tokenExpiry');
          setUser(null);
        }
      } catch (err) {
        console.error('Silent refresh error:', err);
      } finally {
        isRefreshing = false;
        setLoading(false);
      }
    };

    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token || Date.now() > tokenExpiry - 60000) {
        // No token or expired, try to refresh via cookie
        await doSilentRefresh();
      } else {
        // Token exists and valid, fetch profile
        try {
          const data = await authService.getMe();
          setUser(data);
        } catch (error) {
          // If profile fetch fails (e.g., 401), try refresh
          await doSilentRefresh();
        }
        setLoading(false);
      }
    };

    initializeAuth();

    // Refresh token periodically if user is active
    const refreshInterval = setInterval(() => {
      // Check if user was active in the last 14 mins (just before 15m token expires)
      if (Date.now() - lastActivity < 14 * 60 * 1000) {
        doSilentRefresh();
      }
    }, 10 * 60 * 1000); // Check every 10 mins

    // Listen for storage changes to sync logout and refresh across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setUser(null);
        } else if (!user) {
          // Another tab logged in / refreshed, sync
          authService.getMe().then(setUser).catch(() => setUser(null));
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Listen for real-time logout signals across devices/browsers
    const handleForceLogout = () => {
      logout();
    };

    socket.on('auth:force_logout', handleForceLogout);

    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      window.removeEventListener('click', activityHandler);
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleStorageChange);
      socket.off('auth:force_logout', handleForceLogout);
    };
  }, []);

  // Ensure socket joins the user's room for real-time signals
  useEffect(() => {
    if (user?._id) {
      if (!socket.connected) socket.connect();
      socket.emit('activity:join', user._id);
    }
  }, [user]);

  // rememberMe: true = 30 days, false = 1 day
  const login = async (email, password, rememberMe = false) => {
    try {
      const { res, data } = await authService.login(email, password, rememberMe);
      if (res.ok) {
        const expiry = Date.now() + (data.expiresIn * 1000);
        localStorage.setItem('token', data.token);
        localStorage.setItem('tokenExpiry', expiry.toString());
        setUser(data);
        return { success: true };
      }
      return { success: false, message: data.message, requiresVerification: data.requiresVerification };
    } catch (err) {
      return { success: false, message: 'Server error during login' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const { res, data } = await authService.register(username, email, password);
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (err) {
      return { success: false, message: 'Server error during registration' };
    }
  };

  const verifyOtp = async (email, otp) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setUser(data);
      return { success: true };
    }
    return { success: false, message: data.message };
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message };
  };

  const resetPassword = async (email, token, newPassword) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    if (user?._id) {
      socket.emit('activity:leave', user._id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
