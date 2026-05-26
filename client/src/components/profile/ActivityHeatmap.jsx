import React from 'react';
import { useActivity } from '../../hooks/useActivity';
import '../../styles/components/activity-heatmap.css';

const ActivityHeatmap = ({ userId, score }) => {
  const { heatmap, loading } = useActivity(userId);

  if (loading) {
    return (
      <div className="activity-loading">
        Loading activity...
      </div>
    );
  }

  const weeksToRender = heatmap.weeks || [];

  return (
    <div className="profile-panel">
      <h3 className="panel-title">
        <span className="panel-title-prefix">&gt;_</span> Activity Log
      </h3>

      <div className="activity-header">
        <div className="activity-stat">
          Active Days: <span className="activity-stat-val">{heatmap.activeDays || 0}</span>
        </div>
      </div>

      <div className="activity-graph">
        <div className="graph-months" style={{ position: 'relative', height: '20px', marginLeft: '32px' }}>
          {heatmap.months?.map((m, i) => (
            <span key={i} style={{ position: 'absolute', left: `${m.index * 16}px` }}>{m.name}</span>
          ))}
        </div>
        <div className="graph-grid">
          <div className="graph-y-axis">
            <span>Sun</span><span>Tue</span><span>Thu</span><span>Sat</span>
          </div>
          <div className="graph-weeks">
            {weeksToRender.map((week, i) => (
               <div key={i} className="graph-week">
                {week.map((day, j) => (
                  <div 
                    key={j} 
                    className={`graph-day level-${day.level || 0}`} 
                    title={day.date ? `${day.count} activities (${day.points || 0} pts) on ${day.date}` : ''}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="activity-legend">
        <span>Less</span>
        <span className="legend-cell" style={{ background: 'rgba(255,255,255,0.07)' }}></span>
        <span className="legend-cell" style={{ background: 'rgba(0,240,255,0.2)' }}></span>
        <span className="legend-cell" style={{ background: 'rgba(0,240,255,0.5)' }}></span>
        <span className="legend-cell" style={{ background: 'rgba(0,240,255,0.8)' }}></span>
        <span className="legend-cell" style={{ background: '#00f0ff' }}></span>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
