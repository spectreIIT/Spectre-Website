import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Target, Calendar, Eye, BookOpen, FileText, Search } from 'lucide-react';
import ModuleBuilder from '../../components/modules/ModuleBuilder';
import ReviewPanel from '../../components/writeups/ReviewPanel';
import ChallengesManager from '../../components/admin/challenges/ChallengesManager';
import EventsManager from '../../components/admin/events/EventsManager';
import '../../styles/pages/Dashboard.css';

function SupervisorPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const setActiveTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };
  const [users, setUsers] = useState([]);
  


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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const [userSearchTerm, setUserSearchTerm] = useState('');

  const filteredUsers = users.filter(u => {
    const term = userSearchTerm.toLowerCase();
    return (u.username && u.username.toLowerCase().includes(term)) || 
           (u.email && u.email.toLowerCase().includes(term));
  });

  return (
    <div className="dashboard-main-container" style={{ flexDirection: 'column' }}>
      <div className="section-header">
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={24} color="#3b82f6" /> Supervisor Dashboard
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('users')} style={{ background: activeTab === 'users' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: activeTab === 'users' ? '#3b82f6' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Users size={16} /> View Users
        </button>
        <button onClick={() => setActiveTab('challenges')} style={{ background: activeTab === 'challenges' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: activeTab === 'challenges' ? '#3b82f6' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Target size={16} /> View Challenges
        </button>
        <button onClick={() => setActiveTab('modules')} style={{ background: activeTab === 'modules' ? 'rgba(0,240,255,0.15)' : 'transparent', color: activeTab === 'modules' ? '#00f0ff' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <BookOpen size={16} /> Modules
        </button>
        <button onClick={() => setActiveTab('writeups')} style={{ background: activeTab === 'writeups' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: activeTab === 'writeups' ? '#3b82f6' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FileText size={16} /> Review Writeups
        </button>
        <button onClick={() => setActiveTab('events')} style={{ background: activeTab === 'events' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: activeTab === 'events' ? '#3b82f6' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={16} /> View Events
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Registered Users (Read Only) <span style={{ color: '#64748b', fontSize: '0.9rem', marginLeft: '8px' }}>({users.length} total)</span></h3>
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{ backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', width: '300px' }}
              />
            </div>
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
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                      <td 
                        style={{ padding: '12px 16px', fontWeight: 600, color: '#00f0ff', cursor: 'pointer'}}
                        onClick={() => navigate(`/supervisor/users/${u._id}`)}
                      >
                        {u.username}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>{u.solvesCount || 0}</td>
                      <td style={{ padding: '12px 16px', color: '#00f0ff', fontWeight: 600 }}>{u.modulesCount || 0}</td>
                      <td style={{ padding: '12px 16px', color: '#a855f7', fontWeight: 600 }}>{u.writeupsCount || 0}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#10b981' }}>{u.score}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          backgroundColor: u.role === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'Supervisor' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                          color: u.role === 'Admin' ? '#ef4444' : u.role === 'Supervisor' ? '#eab308' : '#10b981', 
                          border: `1px solid ${u.role === 'Admin' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'Supervisor' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600 
                        }}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <EventsManager readOnly={true} />
          </div>
        )}

        {activeTab === 'modules' && <ModuleBuilder />}

        {activeTab === 'writeups' && (
          <div style={{ marginTop: '8px' }}>
            <ReviewPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export default SupervisorPanel;
