import { useState, useEffect } from 'react';
import { ArrowLeft, User, Calendar, Award, Flame, Zap, HelpCircle, Activity, TrendingDown, Clock } from 'lucide-react';
import { fetchChallengeAnalytics } from '../../../services/adminChallengeService';

export default function SolveTracker({ challenge, onCancel }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await fetchChallengeAnalytics(challenge._id);
        setAnalytics(data);
      } catch (err) {
        setError(err.message || 'Failed to load challenge analytics');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [challenge._id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', color: '#94a3b8' }}>
        <div style={{ height: '40px', width: '200px', backgroundColor: '#1b1e28', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ height: '100px', backgroundColor: '#1b1e28', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <div style={{ height: '300px', backgroundColor: '#1b1e28', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#1a1015', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '12px', padding: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <HelpCircle size={20} />
        <div>
          <h4 style={{ margin: 0, fontWeight: '700' }}>Error Loading Analytics</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#fca5a5' }}>{error}</p>
        </div>
        <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  const {
    title,
    currentPoints,
    initialPoints,
    minimumPoints,
    scoringType,
    decayType,
    totalSolves,
    firstBlood,
    averageAttempts,
    hintsUnlockedCount,
    topSolvers = [],
    timeline = []
  } = analytics;

  // Filter solvers
  const filteredSolvers = topSolvers.filter(s =>
    s.username.toLowerCase().includes(leaderboardSearch.toLowerCase())
  );

  // Generate SVG Path for point decay over time
  // x: solve index, y: points
  const pointsHistory = [];
  let tempPoints = initialPoints;
  timeline.forEach((solve, index) => {
    // Reconstruct decay points at each solve index
    const count = index + 1;
    let pt = initialPoints;
    if (scoringType === 'dynamic') {
      const factor = Number(challenge.decayFactor) || 5;
      if (decayType === 'linear') {
        pt = initialPoints - (count * factor);
      } else if (decayType === 'logarithmic') {
        pt = Math.round(initialPoints - (initialPoints - minimumPoints) * (Math.log(1 + count * factor) / Math.log(100)));
      } else if (decayType === 'exponential') {
        pt = Math.round(minimumPoints + (initialPoints - minimumPoints) * Math.exp(-count / factor));
      }
      pt = Math.max(minimumPoints, pt);
    }
    pointsHistory.push(pt);
  });

  const chartWidth = 500;
  const chartHeight = 120;
  const padding = 10;
  const maxVal = initialPoints;
  const minVal = minimumPoints;
  
  let svgPointsPath = '';
  if (pointsHistory.length > 0) {
    const pointsCoords = pointsHistory.map((p, idx) => {
      const x = padding + (idx / Math.max(1, pointsHistory.length - 1)) * (chartWidth - padding * 2);
      // Map points range to height (flip y)
      const range = maxVal - minVal || 1;
      const y = chartHeight - padding - ((p - minVal) / range) * (chartHeight - padding * 2);
      return `${x},${y}`;
    });
    svgPointsPath = `M ${pointsCoords.join(' L ')}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onCancel} 
            style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>Analytics: {title}</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Challenge Lifecycle & Solve Statistics</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '6px 12px', borderRadius: '6px', backgroundColor: scoringType === 'dynamic' ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)', color: scoringType === 'dynamic' ? '#c084fc' : '#60a5fa', border: `1px solid ${scoringType === 'dynamic' ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
            {scoringType} score
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
            Status: {challenge.status || 'draft'}
          </span>
        </div>
      </div>

      {/* Grid Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Total Solves Card */}
        <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'transform 0.2s', cursor: 'default' }}>
          <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: '10px' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Solves</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{totalSolves}</div>
          </div>
        </div>

        {/* Current Points Card */}
        <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '12px', borderRadius: '10px' }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Value</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>{currentPoints}</span>
              {scoringType === 'dynamic' && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <TrendingDown size={12} /> -{initialPoints - currentPoints}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Average Attempts Card */}
        <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '12px', borderRadius: '10px' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Attempts</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{averageAttempts}</div>
          </div>
        </div>

        {/* Hints Unlocked Card */}
        <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '10px' }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hints Unlocked</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{hintsUnlockedCount}</div>
          </div>
        </div>

      </div>

      {/* Main Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Left Side: First Blood & Points Decay Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* First Blood Spot */}
          <div style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#16181f', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '20px' }}>
            {/* Background Glow */}
            <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.08)', filter: 'blur(30px)' }} />
            
            <div style={{ display: 'flex', justifySelf: 'flex-start', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              <Flame size={12} fill="#f59e0b" /> First Blood
            </div>

            {firstBlood ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {firstBlood.user.avatarUrl ? (
                  <img src={firstBlood.user.avatarUrl} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #f59e0b', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {firstBlood.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>{firstBlood.user.username}</h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(firstBlood.solvedAt).toLocaleTimeString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} /> {firstBlood.attempts} {firstBlood.attempts === 1 ? 'attempt' : 'attempts'}
                    </span>
                    <span style={{ color: '#10b981', fontWeight: '700' }}>
                      +{firstBlood.awardedPoints} pts
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '10px 0' }}>No blood spilled yet. Be the first to solve!</div>
            )}
          </div>

          {/* Points Decay Timeline Graph */}
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points Decay Curve</h3>
            
            {scoringType === 'dynamic' ? (
              <>
                <div style={{ width: '100%', height: '130px', position: 'relative', overflow: 'hidden' }}>
                  {svgPointsPath ? (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(168,85,247,0.3)" />
                          <stop offset="100%" stopColor="rgba(168,85,247,0.0)" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path 
                        d={`${svgPointsPath} L ${chartWidth - padding},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`} 
                        fill="url(#chartGlow)" 
                      />
                      {/* Stroke Line */}
                      <path 
                        d={svgPointsPath} 
                        fill="none" 
                        stroke="#a855f7" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                      {/* Control Guidelines */}
                      <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                      <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                    </svg>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>No solves to compute decay</div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                  <span>Solve #0 ({initialPoints} pts)</span>
                  <span>Solve #{totalSolves} ({currentPoints} pts)</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <span>Scoring is configured as STATIC.</span>
                <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Decay curve is only calculated for dynamically scored challenges.</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Leaderboard Table */}
        <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leaderboard (Top Solvers)</h3>
            <div style={{ position: 'relative', width: '160px' }}>
              <input 
                type="text" 
                placeholder="Search solver..." 
                value={leaderboardSearch}
                onChange={e => setLeaderboardSearch(e.target.value)}
                style={{ width: '100%', fontSize: '0.75rem', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 8px 6px 24px', borderRadius: '6px', outline: 'none' }}
              />
              <User size={12} color="#64748b" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            {filteredSolvers.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 10px', fontSize: '0.85rem' }}>No solvers found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '10px 8px', fontWeight: '600', width: '50px' }}>Rank</th>
                    <th style={{ padding: '10px 8px', fontWeight: '600' }}>Solver</th>
                    <th style={{ padding: '10px 8px', fontWeight: '600', textAlign: 'center' }}>Attempts</th>
                    <th style={{ padding: '10px 8px', fontWeight: '600', textAlign: 'right' }}>Locked Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSolvers.map(s => {
                    const isFirst = s.rank === 1;
                    const isSecond = s.rank === 2;
                    const isThird = s.rank === 3;
                    return (
                      <tr key={s.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#fff' }}>
                        <td style={{ padding: '12px 8px' }}>
                          {isFirst || isSecond || isThird ? (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '50%', 
                              fontSize: '0.7rem', 
                              fontWeight: 'bold',
                              color: '#fff',
                              backgroundColor: isFirst ? '#f59e0b' : isSecond ? '#94a3b8' : '#b45309' 
                            }}>
                              {s.rank}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', paddingLeft: '6px' }}>{s.rank}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#e2e8f0' }}>{s.username}</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <Calendar size={10} /> {new Date(s.solvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: '#cbd5e1' }}>
                          {s.attempts}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                          {s.awardedPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
