import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, ChevronDown, User as UserIcon, LogOut, Shield, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { userService } from '../../services/userService';

export default function Topbar({ unreadCount, setUnreadCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
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
    </header>
  );
}
