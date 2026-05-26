import React from 'react';

const LeaderboardTable = ({ data }) => {
  return (
    <div className="scoreboard-table-container">
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th className="rank-col">Rank</th>
            <th>Operative</th>
            <th className="score-col">Score</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map(user => (
              <tr key={user._id} className={`rank-${user.rank}`}>
                <td className="rank-col">
                  <span className={`rank-badge ${user.rank <= 3 ? 'top-tier' : ''}`}>
                    #{user.rank}
                  </span>
                </td>
                <td className="user-cell">
                  <div className="user-info-flex">
                    <div className="user-avatar-mini">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="username-text">{user.username}</span>
                  </div>
                </td>
                <td className="score-col">
                  <span className="score-value">{user.score.toLocaleString()}</span>
                  <span className="score-unit">PTS</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No operatives active in the field yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
