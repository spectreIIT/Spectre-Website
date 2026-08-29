import React, { useMemo, useContext } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AuthContext } from '../../context/AuthContext';

const CustomDot = (props) => {
  const { cx, cy, payload, dataKey, stroke } = props;
  
  if (
    payload.isInitial || 
    payload.isFinal || 
    (payload.activeUsersList && payload.activeUsersList.includes(dataKey))
  ) {
    return (
      <circle cx={cx} cy={cy} r={3} fill={stroke} strokeWidth={0} />
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label, currentUser }) => {
  if (active && payload && payload.length) {
    let filteredPayload = payload;
    
    if (currentUser && currentUser.username) {
      // The user explicitly requested to ONLY see their own points
      filteredPayload = payload.filter(p => p.dataKey === currentUser.username);
    }
    
    // If the user isn't plotted on this graph (or hasn't scored), hide tooltip completely
    if (filteredPayload.length === 0) {
      return null;
    }

    return (
      <div style={{ background: '#12141a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <p style={{ color: '#64748b', fontSize: '10px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Timestamp: {new Date(label).toLocaleString()}
        </p>
        {filteredPayload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '13px', fontWeight: '800', margin: '4px 0' }}>
            {entry.name} : {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ProgressionGraph = ({ data }) => {
  const { user: currentUser } = useContext(AuthContext);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter to only include users with at least one point
    const activeUsers = data.filter(u => u.score > 0);
    if (activeUsers.length === 0) return [];

    const allEvents = [];
    activeUsers.forEach(user => {
      const userContributions = [];
      let calculatedPoints = 0;

      // Build progression purely from verifiable track records (solves and modules)
      (user.solves || []).forEach(solve => {
        const points = solve.awardedPointsAtSolveTime !== undefined 
          ? solve.awardedPointsAtSolveTime 
          : (solve.awardedPoints !== undefined ? solve.awardedPoints : (solve.challengeId?.points || 0));
        const time = new Date(solve.solvedAt || solve.timestamp || 0).getTime();
        if (!isNaN(time) && time > 0 && points > 0) {
          userContributions.push({ time, points });
          calculatedPoints += points;
        }
      });

      (user.completedModules || []).forEach(mod => {
        const points = mod.earnedPoints || mod.points || 100;
        const time = new Date(mod.completedAt || mod.timestamp || 0).getTime();
        if (!isNaN(time) && time > 0 && points > 0) {
          userContributions.push({ time, points });
          calculatedPoints += points;
        }
      });

      (user.writeups || []).forEach(w => {
        const points = w.pointsAwarded || w.points || 0;
        const time = new Date(w.reviewedAt || w.publishedAt || w.timestamp || 0).getTime();
        if (!isNaN(time) && time > 0 && points > 0) {
          userContributions.push({ time, points });
          calculatedPoints += points;
        }
      });

      // Factor in login points or unstructured score differences
      const missingPoints = (user.score || 0) - calculatedPoints;
      if (missingPoints > 0) {
        // Anchor to the earliest actual solve time if available, or lastActivityAt/updatedAt
        const baseTime = userContributions.length > 0 
          ? userContributions[0].time 
          : (user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : (user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()));
        userContributions.push({ time: baseTime, points: missingPoints });
      }

      // Sort chronological contributions for this user
      userContributions.sort((a, b) => a.time - b.time);

      let runningScore = 0;
      userContributions.forEach(event => {
        runningScore += event.points;
        allEvents.push({
          time: event.time,
          username: user.username,
          score: runningScore
        });
      });
    });

    if (allEvents.length === 0) return [];

    // Sort all events across all users by time
    allEvents.sort((a, b) => a.time - b.time);

    const firstTime = allEvents[0].time;
    const latestTime = allEvents[allEvents.length - 1].time;
    const timeSpan = Math.max(0, latestTime - firstTime);

    // Initial baseline offset (5-15 mins before first event or proportional)
    const initialOffset = timeSpan > 0 ? Math.min(3600000, Math.max(300000, timeSpan * 0.05)) : 600000;

    const points = [];
    const currentScores = {};
    activeUsers.forEach(u => currentScores[u.username] = 0);

    // Initial baseline point (everyone at 0)
    points.push({
      time: firstTime - initialOffset,
      isInitial: true,
      ...currentScores
    });

    // Group events by exact timestamp
    const eventsByTime = {};
    allEvents.forEach(event => {
      if (!eventsByTime[event.time]) eventsByTime[event.time] = [];
      eventsByTime[event.time].push(event);
    });

    const sortedTimes = Object.keys(eventsByTime).map(Number).sort((a, b) => a - b);
    
    sortedTimes.forEach(time => {
      const timeEvents = eventsByTime[time];
      const activeUsernames = [];
      
      timeEvents.forEach(event => {
        currentScores[event.username] = event.score;
        activeUsernames.push(event.username);
      });
      
      points.push({
        time,
        activeUsersList: activeUsernames,
        ...JSON.parse(JSON.stringify(currentScores))
      });
    });

    // The graph now ends ("freezes") precisely at the timestamp of the latest earned point.
    // No artificial Date.now() is appended, preventing long empty flat lines.

    return points;
  }, [data]);

  const formatTime = (time) => {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const colors = [
    '#00f0ff', '#a855f7', '#f97316', '#10b981', '#3b82f6', 
    '#ef4444', '#eab308', '#ec4899', '#6366f1', '#14b8a6'
  ];

  const activeUsersForLegend = useMemo(() => 
    data.filter(u => u.score > 0).slice(0, 10),
  [data]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className="progression-graph-container">
        <div className="graph-placeholder">
          <p>No infiltration data available.</p>
          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Only active operatives with points are displayed here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="progression-graph-container" style={{ position: 'relative' }}>
      <div className="graph-header">
        <h3>System Infiltration Progress</h3>
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip currentUser={currentUser} />} cursor={{ stroke: 'rgba(0, 240, 255, 0.2)', strokeWidth: 1 }} />
            <Legend 
              wrapperStyle={{ paddingTop: '25px', fontSize: '11px', fontWeight: '600' }}
              iconType="circle"
              iconSize={8}
            />
            {activeUsersForLegend.map((user, idx) => (
              <Line
                key={user.username}
                type="linear"
                dataKey={user.username}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: colors[idx % colors.length] }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressionGraph;
