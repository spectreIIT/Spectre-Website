import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, ChevronDown, User as UserIcon, LogOut, Shield, Eye, Bug, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { userService } from '../../services/userService';
import API_URL from '../../constants/api';

export default function Topbar({ unreadCount, setUnreadCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugStatus, setBugStatus] = useState({ loading: false, success: false, error: null });
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      userService.getUserProfile()
        .then(data => setProfileData(data))
        .catch(err => console.error('Failed to fetch profile for topbar', err));
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear search query when moving between different main pages to keep them "independent"
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      // If we are already on a page that supports search, don't redirect
      const searchablePages = ['/challenges', '/modules', '/writeups'];
      if (!searchablePages.includes(location.pathname)) {
        navigate(`/challenges?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const submitBugReport = async () => {
    if (!bugDescription.trim()) return;
    setBugStatus({ loading: true, success: false, error: null });
    try {
      const res = await fetch(`${API_URL}/api/users/report-bug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ description: bugDescription })
      });
      if (res.ok) {
        setBugStatus({ loading: false, success: true, error: null });
        setTimeout(() => {
          setIsBugModalOpen(false);
          setBugDescription('');
          setBugStatus({ loading: false, success: false, error: null });
        }, 2000);
      } else {
        const data = await res.json();
        setBugStatus({ loading: false, success: false, error: data.message || 'Failed to submit' });
      }
    } catch (err) {
      setBugStatus({ loading: false, success: false, error: 'Network error occurred' });
    }
  };

  const isParticularWriteup = location.pathname.startsWith('/writeups/') && location.pathname !== '/writeups';
  const isAdminOrSupervisor = location.pathname.startsWith('/admin') || location.pathname.startsWith('/supervisor');
  const hideSearch = location.pathname === '/profile' || location.pathname === '/dashboard' || location.pathname === '/scoreboard' || isAdminOrSupervisor || isParticularWriteup;

  return (
    <header className="topbar">
      <div className="topbar-left">
        {!hideSearch && (
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search challenges, users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <div className="search-shortcut">⌘K</div>
          </div>
        )}
      </div>
      
      <div className="topbar-right">
        <button
          onClick={() => setIsBugModalOpen(true)}
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            color: '#ef4444', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '8px',
            marginRight: '8px'
          }}
        >
          <Bug size={16} />
          <span style={{ display: 'none' }} className="hidden-mobile">Report Bug</span>
        </button>
        <Link
          to="/notifications"
          className="notification-btn"
          onClick={() => setUnreadCount(0)}
        >
          <Bell size={20} />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </Link>
        <div className="user-profile" style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="avatar">
              {(profileData?.avatarUrl || user?.avatarUrl) ? (
                <img 
                  src={profileData?.avatarUrl || user?.avatarUrl} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                style={{ 
                  display: (profileData?.avatarUrl || user?.avatarUrl) ? 'none' : 'flex', 
                  width: '100%', height: '100%', borderRadius: '50%', 
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#1e293b', color: '#00f0ff', fontWeight: 'bold'
                }}
              >
                {(profileData?.username || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="user-info">
              <span className="username">{profileData?.username || user?.username || 'Guest'}</span>
              <span className="user-rank">Rank #{profileData?.rank || '--'}</span>
            </div>
            <ChevronDown size={16} className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
          </div>
          
          {isDropdownOpen && (
            <div className="profile-dropdown">
              <button 
                onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                className="dropdown-item"
              >
                <UserIcon size={16} /> View Profile
              </button>
              {user?.role === 'Admin' && (
                <button 
                  onClick={() => { navigate('/admin'); setIsDropdownOpen(false); }}
                  className="dropdown-item"
                >
                  <Shield size={16} /> Admin Panel
                </button>
              )}
              {user?.role === 'Supervisor' && (
                <button 
                  onClick={() => { navigate('/supervisor'); setIsDropdownOpen(false); }}
                  className="dropdown-item"
                >
                  <Eye size={16} /> Supervisor Panel
                </button>
              )}
              <button 
                onClick={() => { logout(); setIsDropdownOpen(false); }}
                className="dropdown-item logout"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {isBugModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#11131a', border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsBugModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bug size={20} color="#ef4444" /> Report a Bug
            </h2>
            <textarea
              placeholder="Describe the issue you encountered..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', padding: '12px', borderRadius: '8px', resize: 'none', fontFamily: 'inherit',
                fontSize: '0.9rem', marginBottom: '16px', outline: 'none'
              }}
            />
            {bugStatus.error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>{bugStatus.error}</div>}
            {bugStatus.success && <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '12px' }}>Bug reported successfully!</div>}
            <button
              onClick={submitBugReport}
              disabled={bugStatus.loading || !bugDescription.trim() || bugStatus.success}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                background: bugStatus.success ? '#10b981' : '#ef4444', color: '#fff', fontWeight: 600,
                cursor: (bugStatus.loading || !bugDescription.trim() || bugStatus.success) ? 'not-allowed' : 'pointer',
                opacity: (bugStatus.loading || !bugDescription.trim() || bugStatus.success) ? 0.7 : 1,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              {bugStatus.loading ? <Loader2 size={16} className="spin-icon" /> : bugStatus.success ? 'Sent' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
