import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { Trophy, Loader2 } from 'lucide-react';
import API_URL from '../../constants/api';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import ProgressionGraph from '../../components/leaderboard/ProgressionGraph';
import './EventScoreboard.css';
import '../../styles/pages/Scoreboard.css';

export default function EventScoreboard() {
  const { event } = useEvent();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isEventStarted = new Date(event.startDate) <= new Date();

  useEffect(() => {
    if (!isEventStarted || !event?._id) {
      setLoading(false);
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/events/${event._id}/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to load scoreboard');
        }
        
        const data = await res.json();
        setLeaderboardData(data);
      } catch (err) {
        console.error('Failed to fetch event leaderboard:', err);
        setError(err.message || 'Failed to load scoreboard. Systems offline.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [event._id, isEventStarted]);

  return (
    <div className="event-scoreboard-page">
      <div className="es-header">
        <h1>{event.title} Leaderboard</h1>
        <p>Live rankings and score progression.</p>
      </div>

      {!isEventStarted ? (
        <div className="es-empty">
          <Trophy size={48} />
          <h3>Event Not Started</h3>
          <p>The scoreboard will be available once the event begins.</p>
        </div>
      ) : loading ? (
        <div className="scoreboard-loading">
          <Loader2 className="spin-icon" size={32} />
          <span>Intercepting ranking data...</span>
        </div>
      ) : error ? (
        <div className="scoreboard-error">{error}</div>
      ) : (
        <div style={{ paddingBottom: '40px' }}>
          <ProgressionGraph data={leaderboardData} />
          <LeaderboardTable data={leaderboardData} isTeam={event.participationType === 'team'} />
        </div>
      )}
    </div>
  );
}
