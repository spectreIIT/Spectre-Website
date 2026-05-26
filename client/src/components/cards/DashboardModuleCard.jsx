import React from 'react';

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const DashboardModuleCard = ({ mod, onContinue }) => {
  return (
    <div className={`module-card ${mod.pct === 100 ? 'completed' : ''}`}>
      <div className="module-header">
        <div className="module-icon-wrapper" style={{ backgroundColor: hexToRgba(mod.color, 0.12) }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{mod.icon}</span>
        </div>
        <div className="module-info">
          <div className="module-cat-row">
            <span className="module-cat" style={{ color: mod.color }}>{mod.pct === 100 ? 'Completed' : `${mod.pct}% done`}</span>
            <span className="module-percent">{mod.completedCount}/{mod.totalSections} sections</span>
          </div>
          <h4 className="module-title">{mod.title}</h4>
        </div>
      </div>
      <div className="module-progress-section">
        <div className="module-progress-labels">
          <span className="progress-val" style={{ color: mod.color }}>{mod.pct}%</span>
          <button
            className="continue-btn"
            onClick={onContinue}
            style={{ borderColor: mod.color, color: mod.color }}
          >
            {mod.pct === 100 ? 'Review' : 'Continue'}
          </button>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${mod.pct}%`,
              backgroundColor: mod.color,
              boxShadow: `0 0 10px ${hexToRgba(mod.color, 0.5)}`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardModuleCard;
