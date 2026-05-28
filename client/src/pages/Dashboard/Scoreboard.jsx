import React, { useState, useEffect } from 'react';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import ProgressionGraph from '../../components/leaderboard/ProgressionGraph';
import { userService } from '../../services/userService';
import { Loader2, Info } from 'lucide-react';
import '../../styles/pages/Scoreboard.css';

function Scoreboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await userService.getLeaderboard();
        // Add rank to the data
        const rankedData = data.map((user, index) => ({
          ...user,
          rank: index + 1
        }));
        setLeaderboardData(rankedData);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load scoreboard. Systems offline.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="scoreboard-page">
      <div className="scoreboard-header">
        <h1>Live Scoreboard</h1>
        <p>Real-time ranking of the most elite operatives</p>
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#e2e8f0',
        fontSize: '0.9rem'
      }}>
        <div style={{ color: '#a855f7' }}>
          <Info size={20} />
        </div>
        <span><strong>Protocol Directive:</strong> Operatives are awarded <strong>2 points</strong> for their first daily login to the global network. Maintain your streak to climb the ranks.</span>
      </div>
      
      {loading ? (
        <div className="scoreboard-loading">
          <Loader2 className="spin-icon" size={32} />
          <span>Intercepting ranking data...</span>
        </div>
      ) : error ? (
        <div className="scoreboard-error">{error}</div>
      ) : (
        <>
          <ProgressionGraph data={leaderboardData} />
          <LeaderboardTable data={leaderboardData} />
        </>
      )}
    </div>
  );
}

export default Scoreboard;
