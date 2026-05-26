import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { Users, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import API_URL from '../../constants/api';
import './EventScoreboard.css'; // Reusing base layout styles

export default function EventTeams() {
  const { event } = useEvent();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/events/${event._id}/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTeams(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [event._id]);

  if (loading) {
    return (
      <div className="event-scoreboard-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="event-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-scoreboard-page">
      <div className="es-header">
        <h1>{event.title} Teams</h1>
        <p>{teams.length} teams competing in this event.</p>
      </div>

      {teams.length === 0 ? (
        <div className="es-empty">
          <Users size={48} />
          <h3>No Teams Yet</h3>
          <p>Be the first to form a squad.</p>
        </div>
      ) : (
        <div style={{ marginTop: '24px', background: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px' }}>Team Name</th>
                <th style={{ padding: '16px', width: '150px' }}>Members</th>
                <th style={{ padding: '16px', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => {
                const isExpanded = expandedTeamId === team._id;
                // Safely extract captain id whether populated or not
                const captainId = team.captain && typeof team.captain === 'object' ? team.captain._id : team.captain;
                return (
                  <React.Fragment key={team._id}>
                    <tr 
                      onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: isExpanded ? 'rgba(168,85,247,0.05)' : 'transparent', transition: 'background 0.2s' }}
                    >
                      <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>
                        {team.name}
                      </td>
                      <td style={{ padding: '16px', color: '#94a3b8' }}>
                        {team.members.length} / {event.maxTeamSize}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#94a3b8' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <td colSpan="3" style={{ padding: '16px 16px 16px 40px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {team.members.map(member => (
                              <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt={member.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                ) : (
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {member.username ? member.username.charAt(0).toUpperCase() : '?'}
                                  </div>
                                )}
                                <span style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>{member.username}</span>
                                {member._id === captainId && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(168,85,247,0.2)', color: '#a855f7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', marginLeft: 'auto' }}>Captain</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
