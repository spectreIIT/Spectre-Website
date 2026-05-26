import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { Bell, Trash2, Send, CheckCircle, Search } from 'lucide-react';
import '../../styles/pages/Writeups.css'; // Reuse some standard styling
import { useLocation } from 'react-router-dom';

export default function EventNotifications() {
  const { event } = useEvent();
  const location = useLocation();
  const isAdminOrSupervisorView = location.pathname.includes('/admin/events') || location.pathname.includes('/supervisor/events');

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [isPermanent, setIsPermanent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications?eventId=${event._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        
        // Auto mark as read for participants
        if (!isAdminOrSupervisorView) {
          const unreadIds = data.filter(n => !n.isRead).map(n => n._id);
          for (const id of unreadIds) {
            await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/${id}/read`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching event notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [event._id]);

  const handlePostNotification = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/events/${event._id}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          message,
          type,
          isPermanent,
          recipients: 'all' // Event notifications generally go to all participants
        })
      });

      if (res.ok) {
        setTitle('');
        setMessage('');
        fetchNotifications();
      } else {
        const data = await res.json();
        setActionError(data.message || 'Failed to post notification');
      }
    } catch (err) {
      setActionError('Server error posting notification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/events/${event._id}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      } else {
        alert('Failed to delete notification');
      }
    } catch (err) {
      alert('Error deleting notification');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {isAdminOrSupervisorView && (
        <div style={{ background: '#12141a', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} color="#a855f7" /> Post Event Notification
          </h3>
          
          {actionError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {actionError}
            </div>
          )}

          <form onSubmit={handlePostNotification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input
                type="text"
                placeholder="Notification Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', color: '#fff', borderRadius: '8px', fontSize: '0.9rem' }}
              />
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', color: '#fff', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="info">Info (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Yellow)</option>
                <option value="error">Critical (Red)</option>
              </select>
            </div>
            
            <textarea
              placeholder="Notification Message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={3}
              style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={e => setIsPermanent(e.target.checked)}
                />
                Make Permanent (Visible to late joiners)
              </label>

              <button
                type="submit"
                disabled={submitting}
                style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Posting...' : 'Post Notification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ background: '#12141a', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="#a855f7" /> {isAdminOrSupervisorView ? 'Event Notifications Log' : 'Event Announcements'}
        </h3>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            No announcements for this event yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map(n => (
              <div key={n._id} style={{ 
                background: '#090a0f', 
                borderLeft: `4px solid ${n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : n.type === 'success' ? '#10b981' : '#3b82f6'}`,
                padding: '16px', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem' }}>{n.title}</h4>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(n.createdAt).toLocaleString()}</span>
                    {!n.isRead && !isAdminOrSupervisorView && (
                      <span style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>NEW</span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>{n.message}</p>
                </div>
                {isAdminOrSupervisorView && (
                  <button
                    onClick={() => handleDeleteNotification(n._id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Delete Notification"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
