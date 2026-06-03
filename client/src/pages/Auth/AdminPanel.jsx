import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Target, Calendar, Bell, ShieldAlert, BookOpen, Trash2, FileText, ChevronDown } from 'lucide-react';
import ModuleBuilder from '../../components/modules/ModuleBuilder';
import ReviewPanel from '../../components/writeups/ReviewPanel';
import ChallengesManager from '../../components/admin/challenges/ChallengesManager';
import EventsManager from '../../components/admin/events/EventsManager';
import '../../styles/pages/Dashboard.css';

const recipientOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'members', label: 'Members Only' },
  { value: 'supervisors', label: 'Supervisors Only' },
  { value: 'specific', label: 'Specific Users' },
];

const typeOptions = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

function CustomSelect({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#12141a',
          color: '#fff',
          border: isOpen ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
          padding: '0 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '40px',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 12px rgba(236, 72, 153, 0.15)' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
          {selectedOption.label}
        </div>
        <div style={{
          color: '#64748b',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'flex',
          alignItems: 'center'
        }}>
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#161821',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '10px',
            padding: '5px',
            zIndex: 50,
            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: opt.value === value ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                  color: opt.value === value ? '#ec4899' : '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdminPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const setActiveTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };
  const [users, setUsers] = useState([]);
  const [writeups, setWriteups] = useState([]);

  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifEmail, setNotifEmail] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [isPermanent, setIsPermanent] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');

  // Notifications history state
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Role change modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [roleError, setRoleError] = useState('');

  // Delete Notification modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const confirmDeleteNotification = (id) => {
    setPendingDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteNotification = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/notifications/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== pendingDeleteId));
        setIsDeleteModalOpen(false);
        setPendingDeleteId(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete notification');
      }
    } catch (err) {
      console.error(err);
      alert('Server error deleting notification');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWriteups = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWriteups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeWriteupDelete = async (writeupId) => {
    if (!window.confirm("Are you sure you want to permanently delete this writeup?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${writeupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setWriteups(prev => prev.filter(w => w._id !== writeupId));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete writeup');
      }
    } catch (err) {
      console.error(err);
      alert('Server error deleting writeup');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'writeups') {
      fetchWriteups();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const confirmRoleChange = (userId, newRole) => {
    setPendingRoleChange({ userId, newRole });
    setAdminPassword('');
    setRoleError('');
    setIsRoleModalOpen(true);
  };

  const executeRoleChange = async () => {
    try {
      setRoleError('');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/users/${pendingRoleChange.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: pendingRoleChange.newRole, adminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setIsRoleModalOpen(false);
        fetchUsers();
      } else {
        setRoleError(data.message || 'Failed to update role');
      }
    } catch (err) {
      setRoleError('Server error updating role');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setNotifSuccess('');
    setNotifError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          recipients: notifTarget,
          targetEmail: notifTarget === 'specific' ? notifEmail : undefined,
          isPermanent,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNotifTitle('');
        setNotifMessage('');
        setNotifTarget('all');
        setNotifEmail('');
        setNotifType('info');
        setIsPermanent(false);
        setNotifSuccess('Notification broadcast successfully!');
        fetchNotifications();
        setTimeout(() => setNotifSuccess(''), 4000);
      } else {
        setNotifError(data.message || 'Failed to broadcast notification');
      }
    } catch (err) {
      console.error(err);
      setNotifError('Server error broadcasting notification');
    }
  };

  return (
    <div className="dashboard-main-container" style={{ flexDirection: 'column' }}>
      <div className="section-header">
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={24} color="#ec4899" /> Admin Control Panel
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('users')} style={{ background: activeTab === 'users' ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === 'users' ? '#ec4899' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Users size={16} /> Manage Users
        </button>
        <button onClick={() => setActiveTab('notifications')} style={{ background: activeTab === 'notifications' ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === 'notifications' ? '#ec4899' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Bell size={16} /> Notifications
        </button>
        <button onClick={() => setActiveTab('challenges')} style={{ background: activeTab === 'challenges' ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === 'challenges' ? '#ec4899' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Target size={16} /> Challenges
        </button>
        <button onClick={() => setActiveTab('modules')} style={{ background: activeTab === 'modules' ? 'rgba(0,240,255,0.15)' : 'transparent', color: activeTab === 'modules' ? '#00f0ff' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <BookOpen size={16} /> Modules
        </button>
        <button onClick={() => setActiveTab('writeups')} style={{ background: activeTab === 'writeups' ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === 'writeups' ? '#ec4899' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FileText size={16} /> Manage Writeups
        </button>
        <button onClick={() => setActiveTab('events')} style={{ background: activeTab === 'events' ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === 'events' ? '#ec4899' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={16} /> Events
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'users' && (
          <div>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Registered Users</h3>
            <div style={{ backgroundColor: '#12141a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '11px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px' }}>Username</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Challenges</th>
                    <th style={{ padding: '12px 16px' }}>Modules</th>
                    <th style={{ padding: '12px 16px' }}>Writeups</th>
                    <th style={{ padding: '12px 16px' }}>Score</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                      <td
                        style={{ padding: '12px 16px', fontWeight: 600, color: '#00f0ff', cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/users/${u._id}`)}
                      >
                        {u.username}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>{u.solvesCount || 0}</td>
                      <td style={{ padding: '12px 16px', color: '#00f0ff', fontWeight: 600 }}>{u.modulesCount || 0}</td>
                      <td style={{ padding: '12px 16px', color: '#a855f7', fontWeight: 600 }}>{u.writeupsCount || 0}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#10b981' }}>{u.score}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={u.role}
                          onChange={(e) => confirmRoleChange(u._id, e.target.value)}
                          style={{ 
                            backgroundColor: '#1e212b', 
                            color: u.role === 'Admin' ? '#ef4444' : u.role === 'Supervisor' ? '#eab308' : '#10b981', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600 
                          }}
                        >
                          <option value="Member" style={{ color: '#10b981' }}>Member</option>
                          <option value="Supervisor" style={{ color: '#eab308' }}>Supervisor</option>
                          <option value="Admin" style={{ color: '#ef4444' }}>Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start', paddingBottom: '40px' }}>
            {/* Left Column: Broadcast Form */}
            <div>
              <h3 style={{ color: '#fff', marginBottom: '4px' }}>Broadcast Notification</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
                Send a message to all members, only members, supervisors, or specific users.
              </p>
              {notifSuccess && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                  ✓ {notifSuccess}
                </div>
              )}
              {notifError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                  ❌ {notifError}
                </div>
              )}
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input
                  type="text"
                  placeholder="Notification Title"
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  style={{ backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.95rem' }}
                  required
                />
                <textarea
                  placeholder="Notification Message"
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  rows={4}
                  style={{ backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.5, fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', Monaco, Consolas, monospace" }}
                  required
                />
                <div style={{ display: 'flex', gap: '16px', maxWidth: '380px' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <CustomSelect
                      label="Recipients"
                      value={notifTarget}
                      onChange={val => setNotifTarget(val)}
                      options={recipientOptions}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <CustomSelect
                      label="Type"
                      value={notifType}
                      onChange={val => setNotifType(val)}
                      options={typeOptions}
                    />
                  </div>
                </div>

                {notifTarget === 'specific' && (
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Target User Email(s)</label>
                    <input
                      type="text"
                      placeholder="user@example.com, another@example.com"
                      value={notifEmail}
                      onChange={e => setNotifEmail(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '12px 16px', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.95rem' }}
                      required
                    />
                    <span style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Separate multiple email addresses with commas.</span>
                  </div>
                )}

                {/* Permanent / Temporary Toggle */}
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    background: isPermanent ? 'rgba(168,85,247,0.07)' : 'rgba(255,255,255,0.02)',
                    border: isPermanent ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setIsPermanent(p => !p)}
                >
                  <div style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: isPermanent ? '#a855f7' : '#334155',
                    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '3px',
                      left: isPermanent ? '23px' : '3px',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                      {isPermanent ? 'Permanent Notification' : 'Temporary Notification'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                      {isPermanent
                        ? 'Always visible — new users who join later will also see this.'
                        : 'Only visible to currently registered users. New joiners will not see it.'}
                    </div>
                  </div>
                </div>

                <button type="submit" style={{ backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '13px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Broadcast Notification
                </button>
              </form>
            </div>

            {/* Right Column: Sent Notifications History */}
            <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '24px', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '680px', overflowY: 'auto' }}>
              <div>
                <h3 style={{ color: '#fff', marginBottom: '4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} color="#ec4899" /> Broadcast History
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                  Manage previously sent notification broadcasts.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingNotifications ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    Loading active broadcasts...
                  </p>
                ) : notifications.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    No broadcasts sent yet.
                  </p>
                ) : (
                  notifications.map(n => {
                    const badgeStyles = {
                      info: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' },
                      success: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
                      warning: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
                      error: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
                    }[n.type || 'info'];

                    const targetLabels = {
                      all: 'All Users',
                      members: 'Members Only',
                      supervisors: 'Supervisors Only',
                      specific: 'Specific Users'
                    }[n.recipients || 'all'];

                    return (
                      <div key={n._id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', ...badgeStyles }}>
                            {n.type || 'info'}
                          </span>
                          <button
                            onClick={() => confirmDeleteNotification(n._id)}
                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                            title="Delete notification permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                          {n.title}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', Monaco, Consolas, monospace" }}>
                          {n.message}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                          <span>Target: <strong style={{ color: '#fff' }}>{targetLabels}</strong></span>
                          <span>•</span>
                          <span>{n.isPermanent ? 'Permanent' : 'Temporary'}</span>
                          <span>•</span>
                          <span>By: <strong style={{ color: '#fff' }}>{n.sender?.username || 'System'}</strong></span>
                          <span>•</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'challenges' && (
          <div style={{ marginTop: '8px' }}>
            <ChallengesManager />
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ marginTop: '8px' }}>
            <EventsManager />
          </div>
        )}

        {activeTab === 'modules' && <ModuleBuilder />}

        {activeTab === 'writeups' && (
          <div style={{ marginTop: '8px' }}>
            <ReviewPanel />
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {isRoleModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#16181f', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Confirm Role Change</h3>
            <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.6' }}>
              You are about to change this user's role to{' '}
              <span
                style={{
                  backgroundColor:
                    pendingRoleChange?.newRole === 'Admin'
                      ? 'rgba(244, 63, 94, 0.15)'
                      : pendingRoleChange?.newRole === 'Supervisor'
                        ? 'rgba(251, 191, 36, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                  color:
                    pendingRoleChange?.newRole === 'Admin'
                      ? '#f43f5e'
                      : pendingRoleChange?.newRole === 'Supervisor'
                        ? '#fbbf24'
                        : '#38bdf8',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'inline-block',
                  margin: '0 4px',
                  boxShadow: '0 0 10px rgba(0,0,0,0.3)'
                }}
              >
                {pendingRoleChange?.newRole}
              </span>
              . Please enter your admin password to confirm.
            </p>
            {roleError && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>{roleError}</div>}
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{ width: '100%', backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsRoleModalOpen(false)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={executeRoleChange} style={{ background: '#ec4899', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Confirm Update</button>
            </div>
          </div>
        </div>
      )}
  
      {/* Delete Notification Modal */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#16181f', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Delete Broadcast</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Are you sure you want to permanently delete this notification?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setIsDeleteModalOpen(false); setPendingDeleteId(null); }} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={executeDeleteNotification} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
