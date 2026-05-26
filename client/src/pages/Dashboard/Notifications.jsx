import { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, CheckCheck } from 'lucide-react';
import '../../styles/pages/Dashboard.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />;
      case 'success': return <CheckCircle size={20} color="#10b981" />;
      case 'error': return <AlertTriangle size={20} color="#ef4444" />;
      default: return <Info size={20} color="#3b82f6" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning': return 'rgba(245,158,11,0.12)';
      case 'success': return 'rgba(16,185,129,0.12)';
      case 'error': return 'rgba(239,68,68,0.12)';
      default: return 'rgba(59,130,246,0.12)';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="dashboard-main-container" style={{ flexDirection: 'column' }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={24} color="#a855f7" /> Notifications
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '20px',
              padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700
            }}>
              {unreadCount} unread
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '8px 16px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: '#64748b', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px'
          }}>
            <Bell size={48} color="#334155" />
            <p>You have no notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              style={{
                backgroundColor: notif.isRead ? '#12141a' : '#16181f',
                border: notif.isRead
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(168,85,247,0.25)',
                borderLeft: notif.isRead
                  ? '3px solid transparent'
                  : '3px solid #a855f7',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                transition: 'border-color 0.2s',
                cursor: notif.isRead ? 'default' : 'pointer',
              }}
              onClick={() => !notif.isRead && markAsRead(notif._id)}
            >
              <div style={{
                marginTop: '2px',
                background: getTypeColor(notif.type),
                borderRadius: '8px',
                padding: '8px',
                flexShrink: 0,
              }}>
                {getIcon(notif.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '4px', fontWeight: 600 }}>
                    {notif.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {!notif.isRead && (
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#a855f7', display: 'inline-block', flexShrink: 0
                      }} />
                    )}
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  {notif.message}
                </p>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '8px', display: 'flex', gap: '16px' }}>
                  <span>{new Date(notif.createdAt).toLocaleString()}</span>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif._id); }}
                      style={{
                        background: 'none', border: 'none', color: '#a855f7',
                        cursor: 'pointer', fontSize: '0.75rem', padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;
