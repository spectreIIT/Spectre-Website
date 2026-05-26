import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Activity, FileText, Shield, LogOut, Trophy, Eye, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { socket } from '../../sockets/socket';
import { eventService } from '../../services/eventService';

export default function Sidebar({ unreadCount }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [playersOnline, setPlayersOnline] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);

  // ── Real-time player count via Socket.io ────────────────────────
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleCount = (count) => setPlayersOnline(count);
    socket.on('players:count', handleCount);

    return () => {
      socket.off('players:count', handleCount);
    };
  }, []);

  // ── Fetch currently active/live event ───────────────────────────
  useEffect(() => {
    eventService.getActive()
      .then(data => setActiveEvent(data))
      .catch(() => setActiveEvent(null));
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Challenges', path: '/challenges', icon: Target, show: true },
    { name: 'Scoreboard', path: '/scoreboard', icon: Activity, show: true },
    { name: 'Modules', path: '/modules', icon: BookOpen, show: true },
    { name: 'Events', path: '/events', icon: Trophy, show: true },
    { name: 'Writeups', path: '/writeups', icon: FileText, show: true },
  ].filter(item => item.show);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/Illustration.png"
            alt="Spectre Logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(0,240,255,0.4))' }}
          />
          <img 
            src="https://see.fontimg.com/api/rf5/0Mxv/ZDNmMDAxY2QxNjZjNGFjMzk1MWQ3Njg2MDZhZmIzZDAudHRm/U1BFQ1RSRQ/pixeldraw.png?r=fs&h=65&w=1000&fg=00F0FF&tb=1&s=65" 
            alt="Spectre" 
            style={{ height: '24px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' }}
          />
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link 
              key={item.name} 
              to={item.path} 
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {/* Real-time connection status */}
        <div className="connection-status">
          <div className="status-indicator">
            <span className="status-dot green"></span>
            <span className="status-text">CONNECTED</span>
          </div>
          <div className="status-players">
            {playersOnline} {playersOnline === 1 ? 'Player' : 'Players'} Online
          </div>
        </div>

        {/* Real active event — only shown when an admin has marked one live */}
        {activeEvent && (
          <div className="promo-card">
            <div className="promo-icon">
              <Trophy size={18} color="#a855f7" />
            </div>
            <div className="promo-info">
              <div className="promo-title">{activeEvent.title}</div>
              <div className="promo-subtitle">Live Now</div>
            </div>
          </div>
        )}

        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
