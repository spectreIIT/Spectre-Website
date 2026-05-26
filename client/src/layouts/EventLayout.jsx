import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useEvent } from '../context/EventContext';
import { Target, Flag, Trophy, Users, ShieldAlert, FileText, Settings, ChevronLeft, Calendar, Bell, PenTool } from 'lucide-react';
import API_URL from '../constants/api';
import './EventLayout.css';

const EventLayoutContent = () => {
  const { event, loading, error, isAdminOrSupervisor, isRegistered } = useEvent();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!event || !event._id) return;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/notifications/unread-count?eventId=${event._id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread || 0);
        }
      } catch (err) {
        console.error('Failed to fetch event unread count', err);
      }
    };
    
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [event]);

  useEffect(() => {
    if (!event || !event._id) return;
    
    // Evaluate conditions here to avoid ReferenceError
    const isPrivileged = location.pathname.includes('/admin/events') || location.pathname.includes('/supervisor/events');
    const isPractice = event.lifecycleStatus === 'past' && !isRegistered;
    
    if (isPrivileged || isPractice) return;
    
    // Track time spent in the event arena (1 minute intervals)
    const timeInterval = setInterval(async () => {
      try {
        await fetch(`${API_URL}/api/activity/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            type: event.eventType === 'ctf' ? 'event_ctf' : 'event_custom',
            eventId: event._id,
            eventName: event.title,
            durationMinutes: 1
          })
        });
      } catch (err) {
        console.error('Failed to log event duration', err);
      }
    }, 60000); // 1 minute

    return () => clearInterval(timeInterval);
  }, [event, location.pathname, isRegistered]);

  if (loading) {
    return (
      <div className="event-layout-loading">
        <div className="event-spinner"></div>
        <p>Entering Event Environment...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-layout-error">
        <ShieldAlert size={48} color="#ef4444" />
        <h2>Access Denied</h2>
        <p>{error || 'Event not found.'}</p>
        <Link to="/events" className="btn-return">Return to Event Hub</Link>
      </div>
    );
  }

  const isAdminView = location.pathname.includes('/admin/events');
  const isSupervisorView = location.pathname.includes('/supervisor/events');
  const isPrivilegedView = isAdminView || isSupervisorView;
  
  const basePath = isAdminView ? `/admin/events/${event._id}` : 
                   isSupervisorView ? `/supervisor/events/${event._id}` : 
                   `/events/${event._id}/arena`;
  const rootPath = `/events/${event._id}`;

  const navItems = [];

  if (event.eventType === 'ctf') {
    navItems.push({ name: 'Challenges', path: `${basePath}/challenges`, icon: <Flag size={18} /> });
  } else if (event.eventType === 'module') {
    navItems.push({ name: 'Modules', path: `${basePath}/modules`, icon: <FileText size={18} /> });
  }

  // Common tabs for both views
  navItems.push({ name: 'Scoreboard', path: `${basePath}/scoreboard`, icon: <Trophy size={18} /> });
  navItems.push({ name: event.participationType === 'team' ? 'Teams' : 'Participants', path: event.participationType === 'team' ? `${basePath}/teams` : `${basePath}/participants`, icon: <Users size={18} /> });
  navItems.push({ name: 'Notifications', path: `${basePath}/notifications`, icon: <Bell size={18} />, badge: (!isPrivilegedView && unreadCount > 0) ? unreadCount : null });

  // Practice mode is when an unregistered user enters a past event
  const isPracticeMode = event.lifecycleStatus === 'past' && !isRegistered;

  // Writeups logic
  if (event.allowWriteups && (isAdminView || isSupervisorView)) {
    navItems.push({ name: 'Writeups', path: `${basePath}/writeups`, icon: <PenTool size={18} /> });
  }

  const getExitPath = () => {
    if (isAdminView) return "/admin?tab=events";
    if (isSupervisorView) return "/supervisor?tab=events";
    return "/events";
  };

  return (
    <div className="event-layout-container">
      {/* Event Topbar */}
      <div className="event-topbar">
        <div className="event-topbar-left">
          <Link to={getExitPath()} className="event-back-btn" title="Leave Event">
            <ChevronLeft size={20} /> Exit
          </Link>
          <div className="event-brand">
            <Calendar size={20} color={event.color || '#a855f7'} />
            <h1>{event.title}</h1>
          </div>
        </div>
      </div>

      {isPracticeMode && (
        <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
          <ShieldAlert size={16} color="#38bdf8" />
          <span><strong>ARCHIVED EVENT:</strong> This event has ended. </span>
        </div>
      )}
      {!isPracticeMode && event.lifecycleStatus === 'past' && (
        <div style={{ backgroundColor: '#475569', borderBottom: '1px solid #334155', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '0.85rem' }}>
          <Trophy size={16} color="#fbbf24" />
          <span><strong>FINAL SCOREBOARD:</strong> This event has ended. Rankings and scores are frozen permanently.</span>
        </div>
      )}

      <div className="event-body">
        {/* Event Sidebar */}
        <div className="event-sidebar">
          <div className="event-nav">
            {navItems.map((item) => {
              const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} className={`event-nav-item ${isActive ? 'active' : ''}`}>
                  {item.icon}
                  <span>{item.name}</span>
                  {item.badge && <span className="event-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Event Main Content */}
        <div className="event-main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default function EventLayout() {
  return <EventLayoutContent />;
}
