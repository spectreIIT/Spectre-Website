import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { Users, Filter } from 'lucide-react';
import API_URL from '../../constants/api';
import './EventScoreboard.css'; // Reusing base layout styles

export default function EventParticipants() {
  const { event } = useEvent();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/events/${event._id}/participants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setParticipants(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
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
        <h1>{event.title} Participants</h1>
        <p>{participants.length} hackers competing in this solo event.</p>
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
                <th style={{ padding: '16px' }}>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{p.username}</span>
                  </td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>
                    {new Date(p.registeredAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
