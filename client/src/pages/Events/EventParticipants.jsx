import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEvent } from '../../context/EventContext';
import { useAuth } from '../../hooks/useAuth';
import { Users, ArrowRight, X, ExternalLink, Award, CheckCircle2, BookOpen, Flag, Calendar } from 'lucide-react';
import ChallengeModal from '../../components/modals/ChallengeModal';
import API_URL from '../../constants/api';
import './EventScoreboard.css'; // Reusing base layout styles

const formatJoinedDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
};

export default function EventParticipants() {
  const { event } = useEvent();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isPrivileged = user?.role === 'Admin' || user?.role === 'Supervisor';

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events/${event._id}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to fetch participants');
      }
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (event?._id) {
      fetchParticipants();
    }
  }, [event?._id]);

  if (loading) {
    return (
      <div className="event-scoreboard-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="event-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-scoreboard-page">
        <div className="es-empty">
          <Users size={48} color="#ef4444" />
          <h3 style={{ color: '#ef4444' }}>Unable to Load Participants</h3>
          <p>{error}</p>
          <button 
            onClick={fetchParticipants}
            style={{ marginTop: '16px', background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isModuleEvent = event.eventType === 'module';

  return (
    <div className="event-scoreboard-page">
      <div className="es-header">
        <h1>{event.title} Participants</h1>
        <p>{participants.length} hackers competing in this {event.participationType === 'team' ? 'team' : 'solo'} event.</p>
      </div>

      {participants.length === 0 ? (
        <div className="es-empty">
          <Users size={48} />
          <h3>No Participants Yet</h3>
          <p>Be the first to join the competition.</p>
        </div>
      ) : (
        <div style={{ marginTop: '24px', background: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px' }}>Hacker</th>
                {event.participationType === 'team' && <th style={{ padding: '16px' }}>Team</th>}
                <th style={{ padding: '16px' }}>Joined</th>
                {isPrivileged && <th style={{ padding: '16px' }}>Solves</th>}
              </tr>
            </thead>
            <tbody>
              {participants.map(p => {
                const count = p.solvesCount !== undefined
                  ? p.solvesCount
                  : (isModuleEvent ? (p.moduleSolvesCount || 0) : (p.challengeSolvesCount || 0));

                return (
                  <tr key={p._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                          {p.username ? p.username.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{p.username}</span>
                    </td>
                    {event.participationType === 'team' && (
                      <td style={{ padding: '16px', color: p.teamName ? '#a855f7' : '#64748b', fontWeight: p.teamName ? 600 : 'normal' }}>
                        {p.teamName || 'Solo / No Team'}
                      </td>
                    )}
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {formatJoinedDateTime(p.registeredAt)}
                    </td>
                    {isPrivileged && (
                      <td style={{ padding: '16px' }}>
                        {count === 0 ? (
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>0 solves</span>
                        ) : (
                          <button
                            onClick={() => setSelectedParticipant(p)}
                            style={{
                              background: isModuleEvent ? 'rgba(168, 85, 247, 0.12)' : 'rgba(0, 240, 255, 0.12)',
                              border: isModuleEvent ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(0, 240, 255, 0.35)',
                              color: isModuleEvent ? '#c084fc' : '#00f0ff',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease',
                              boxShadow: isModuleEvent ? '0 2px 8px rgba(168,85,247,0.1)' : '0 2px 8px rgba(0,240,255,0.1)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = isModuleEvent ? '0 4px 14px rgba(168,85,247,0.25)' : '0 4px 14px rgba(0,240,255,0.25)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = isModuleEvent ? '0 2px 8px rgba(168,85,247,0.1)' : '0 2px 8px rgba(0,240,255,0.1)';
                            }}
                          >
                            <span>{count} {isModuleEvent ? (count === 1 ? 'Module' : 'Modules') : (count === 1 ? 'Solve' : 'Solves')}</span>
                            <ArrowRight size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Solves Drill-Down Modal */}
      {selectedParticipant && (
        <div 
          onClick={() => setSelectedParticipant(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d0f14',
              border: isModuleEvent ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#12141a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedParticipant.avatarUrl ? (
                  <img src={selectedParticipant.avatarUrl} alt={selectedParticipant.username} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                    {selectedParticipant.username ? selectedParticipant.username.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedParticipant.username}
                    <span style={{ fontSize: '0.75rem', color: isModuleEvent ? '#c084fc' : '#00f0ff', background: isModuleEvent ? 'rgba(168,85,247,0.15)' : 'rgba(0,240,255,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {event.title}
                    </span>
                  </h3>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                    {isModuleEvent 
                      ? `${(selectedParticipant.solvedModules || []).length} Completed ${(selectedParticipant.solvedModules || []).length === 1 ? 'Module' : 'Modules'}`
                      : `${(selectedParticipant.solvedChallenges || []).length} Solved ${(selectedParticipant.solvedChallenges || []).length === 1 ? 'Challenge' : 'Challenges'}`}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParticipant(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isModuleEvent ? (
                // Completed Modules
                (selectedParticipant.solvedModules && selectedParticipant.solvedModules.length > 0) ? (
                  selectedParticipant.solvedModules.map((mod, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedParticipant(null);
                        navigate(`/modules?moduleId=${mod._id}`, {
                          state: { returnTo: location.pathname }
                        });
                      }}
                      style={{
                        background: '#12141a',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{mod.icon || '📘'}</span>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={15} color="#22c55e" /> {mod.title}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> Completed on {formatJoinedDateTime(mod.completedAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                          +{mod.points} pts
                        </span>
                        <ExternalLink size={14} color="#64748b" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No completed modules recorded for this event.
                  </div>
                )
              ) : (
                // Solved Challenges
                (selectedParticipant.solvedChallenges && selectedParticipant.solvedChallenges.length > 0) ? (
                  selectedParticipant.solvedChallenges.map((chal, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedChallenge({
                          _id: chal._id,
                          id: chal._id,
                          title: chal.title,
                          category: chal.category,
                          points: chal.points,
                          isSolved: true
                        });
                      }}
                      style={{
                        background: '#12141a',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Flag size={18} color="#00f0ff" />
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={15} color="#22c55e" /> {chal.title}
                            {chal.category && (
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {chal.category}
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> Solved on {formatJoinedDateTime(chal.solvedAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                          +{chal.points} pts
                        </span>
                        <ExternalLink size={14} color="#64748b" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No solved challenges recorded for this event.
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#12141a'
            }}>
              <button
                onClick={() => setSelectedParticipant(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Preview Modal */}
      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          readOnly={true}
          eventId={event._id}
        />
      )}
    </div>
  );
}
