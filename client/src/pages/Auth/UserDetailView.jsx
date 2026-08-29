import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Target, BookOpen, FileText, Calendar, CheckCircle2, Clock, ExternalLink, Trophy } from 'lucide-react';
import ChallengeModal from '../../components/modals/ChallengeModal';
import '../../styles/pages/Dashboard.css';

export default function UserDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'challenges');
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const isSupervisorRoute = location.pathname.startsWith('/supervisor');
  const backUrl = isSupervisorRoute ? '/supervisor' : '/admin';

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['challenges', 'modules', 'writeups', 'events'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const fetchUserDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/users/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setUserData(data);
        } else {
          try {
            const errData = await res.json();
            if (isMounted) setError(errData.error ? `Error: ${errData.error} | ${errData.stack}` : 'Failed to fetch user details');
          } catch(e) {
            if (isMounted) setError('Failed to fetch user details');
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError('Server error loading user details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUserDetails();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-main-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#64748b', fontSize: '1.2rem' }}>Loading user dossier...</div>
      </div>
    );
  }

  if (error || !userData?.user) {
    return (
      <div className="dashboard-main-container" style={{ flexDirection: 'column', gap: '20px' }}>
        <button onClick={() => navigate(backUrl)} style={{ alignSelf: 'flex-start', background: '#1e212b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Back to Panel
        </button>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '20px', borderRadius: '12px' }}>
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  const { user, solves, modules, writeups, events = [] } = userData;

  return (
    <div className="dashboard-main-container" style={{ flexDirection: 'column', gap: '24px' }}>
      {/* Top Row: Back Button */}
      <div style={{ marginBottom: '4px' }}>
        <button 
          onClick={() => navigate(backUrl)} 
          style={{ background: '#12141a', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <ArrowLeft size={14} /> Back to Panel
        </button>
      </div>

      {/* User Header & Stat Cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1e293b', border: '2px solid #00f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f0ff', fontSize: '1.8rem', fontWeight: 'bold' }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (user.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user.username}
            </h2>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{user.email}</span>
              <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>{user.role}</span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>{user.score} pts</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: '#12141a', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>{solves.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>Challenges</div>
          </div>
          <div style={{ background: '#12141a', border: '1px solid rgba(0, 240, 255, 0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f0ff' }}>{modules.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>Modules</div>
          </div>
          <div style={{ background: '#12141a', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7' }}>{writeups.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>Writeups</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => handleTabChange('challenges')} 
          style={{ background: activeTab === 'challenges' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', color: activeTab === 'challenges' ? '#38bdf8' : '#94a3b8', border: activeTab === 'challenges' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Target size={14} /> Solved Challenges ({solves.length})
        </button>
        <button 
          onClick={() => handleTabChange('modules')} 
          style={{ background: activeTab === 'modules' ? 'rgba(0, 240, 255, 0.15)' : 'transparent', color: activeTab === 'modules' ? '#00f0ff' : '#94a3b8', border: activeTab === 'modules' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <BookOpen size={14} /> Completed Modules ({modules.length})
        </button>
        <button 
          onClick={() => handleTabChange('writeups')} 
          style={{ background: activeTab === 'writeups' ? 'rgba(168, 85, 247, 0.15)' : 'transparent', color: activeTab === 'writeups' ? '#a855f7' : '#94a3b8', border: activeTab === 'writeups' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <FileText size={14} /> Writeups ({writeups.length})
        </button>
        <button 
          onClick={() => handleTabChange('events')} 
          style={{ background: activeTab === 'events' ? 'rgba(245, 158, 11, 0.15)' : 'transparent', color: activeTab === 'events' ? '#f59e0b' : '#94a3b8', border: activeTab === 'events' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Calendar size={14} /> Events ({events.length})
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'challenges' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {solves.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>No challenges solved yet.</div>
            ) : (
              solves.map((s, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (s.challengeId) {
                      setSelectedChallenge({
                        ...(typeof s.challengeId === 'object' ? s.challengeId : {}),
                        _id: s.challengeId._id || s.challengeId.id || s.challengeId,
                        id: s.challengeId._id || s.challengeId.id || s.challengeId,
                        title: s.challengeId.title || 'Challenge',
                        isSolved: true
                      });
                    }
                  }}
                  style={{ 
                    background: '#12141a', 
                    border: '1px solid rgba(56, 189, 248, 0.2)', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'; 
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(56, 189, 248, 0.15)'; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)'; 
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; 
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{s.challengeId?.title || 'Unknown Challenge'}</h4>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {s.awardedPoints !== undefined ? s.awardedPoints : (s.awardedPointsAtSolveTime !== undefined ? s.awardedPointsAtSolveTime : (s.challengeId?.points || 0))} pts
                      </span>
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {s.challengeId?.category || 'General'} • {s.challengeId?.difficulty || 'EASY'}
                      {s.challengeId?.eventId && <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '0.75rem' }}>[EVENT]</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Solved on {formatDate(s.solvedAt || s.timestamp || Date.now())}
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ExternalLink size={12} /> Inspect
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'modules' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {modules.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>No modules completed yet.</div>
            ) : (
              modules.map((m, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    const modId = m.moduleId || m._id || m.id;
                    const returnPath = `${location.pathname}?tab=modules`;
                    navigate(`/modules?moduleId=${modId}`, {
                      state: { returnTo: returnPath }
                    });
                  }}
                  style={{ 
                    background: '#12141a', 
                    border: '1px solid rgba(0, 240, 255, 0.2)', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'; 
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 240, 255, 0.15)'; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)'; 
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.3 }}>
                      <CheckCircle2 size={18} color="#00f0ff" style={{ flexShrink: 0 }} /> {m.title}
                    </h4>
                    <span style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {m.earnedPoints !== undefined ? m.earnedPoints : (m.points || 100)} pts
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Completed on {formatDate(m.completedAt || Date.now())}
                    </span>
                    <span style={{ color: '#00f0ff', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ExternalLink size={12} /> Open Module
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'writeups' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {writeups.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>No writeups submitted yet.</div>
            ) : (
              writeups.map((w, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate(`/writeups/${w._id}`)}
                  style={{ 
                    background: '#12141a', 
                    border: '1px solid rgba(168, 85, 247, 0.2)', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(168, 85, 247, 0.15)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {w.title}
                      </h4>
                      <span style={{ 
                        background: (w.status === 'approved' || w.status === 'Approved' || w.status === 'Published') 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : (w.status === 'pending' || w.status === 'Pending Review' || w.status === 'under_review' || w.status === 'under review') 
                            ? 'rgba(245, 158, 11, 0.15)' 
                            : 'rgba(239, 68, 68, 0.15)', 
                        color: (w.status === 'approved' || w.status === 'Approved' || w.status === 'Published') 
                          ? '#10b981' 
                          : (w.status === 'pending' || w.status === 'Pending Review' || w.status === 'under_review' || w.status === 'under review') 
                            ? '#f59e0b' 
                            : '#ef4444', 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 
                      }}>
                        {w.status === 'pending' ? 'Pending Review' : w.status === 'approved' ? 'Approved' : w.status === 'rejected' ? 'Rejected' : w.status === 'under_review' ? 'Under Review' : w.status}
                      </span>
                    </div>
                    <div style={{ color: '#a855f7', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                      Challenge: {w.challengeName}
                    </div>
                    {w.reviewRemarks && (
                      <div style={{ background: '#0e1015', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #a855f7', color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Remarks: {w.reviewRemarks}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {formatDate(w.createdAt)}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{w.pointsAwarded || 0} pts</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/writeups/${w._id}`); }}
                      style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s ease' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'; }}
                    >
                      <ExternalLink size={12} /> View Writeup
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {events.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>No events participated yet.</div>
            ) : (
              events.map((e, idx) => (
                <div key={idx} style={{ background: '#12141a', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={18} color="#f59e0b" /> {e.event?.title || 'Unknown Event'}
                      </h4>
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                        Rank #{e.rank}
                      </span>
                    </div>
                    {e.team ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <strong style={{ color: '#e2e8f0' }}>Team:</strong> {e.team.name} ({e.team.members?.length || 0} members)
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <strong style={{ color: '#e2e8f0' }}>Participation:</strong> Solo
                      </div>
                    )}
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      Score: {e.score} pts
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <Calendar size={14} /> Registered on {formatDate(e.registeredAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Challenge Inspect Modal */}
      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          readOnly={true}
        />
      )}
    </div>
  );
}
