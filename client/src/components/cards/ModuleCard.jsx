import React from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';

const ModuleCard = ({ mod, isPrivileged, prereqLabel, pct, onClick }) => {
  const locked = !mod.accessGranted;

  const cardStyle = mod.status && mod.status !== 'active' ? {
    opacity: 0.9,
    border: mod.status === 'draft' ? '1px dashed rgba(234, 179, 8, 0.6)' : '1px dashed rgba(239, 68, 68, 0.6)',
    background: mod.status === 'draft' ? 'linear-gradient(135deg, #1e1b15 0%, #111317 100%)' : 'linear-gradient(135deg, #221518 0%, #111317 100%)',
    boxShadow: mod.status === 'draft' ? '0 0 15px rgba(234, 179, 8, 0.03)' : '0 0 15px rgba(239, 68, 68, 0.03)',
    '--module-color': mod.color
  } : { '--module-color': mod.color };

  return (
    <div
      className={`module-card ${locked && !isPrivileged ? 'locked' : ''} ${pct === 100 ? 'completed' : ''}`}
      style={cardStyle}
    >
      {/* Admin/Supervisor ghost badge on locked modules */}
      {locked && isPrivileged && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.68rem', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
          LOCKED (preview)
        </div>
      )}

      {/* Draft/Hidden badge */}
      {mod.status && mod.status !== 'active' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: locked && isPrivileged ? '110px' : '10px',
          fontSize: '0.65rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          backgroundColor: mod.status === 'draft' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: mod.status === 'draft' ? '#eab308' : '#ef4444',
          border: mod.status === 'draft' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          padding: '2px 8px',
          borderRadius: '4px',
          zIndex: 2
        }}>
          {mod.status}
        </div>
      )}

      <div className="module-card-top">
        <span className="module-emoji">{mod.icon}</span>
        {locked && !isPrivileged
          ? <Lock size={16} className="lock-icon" />
          : locked && isPrivileged
          ? <Lock size={16} style={{ color: '#a855f7', opacity: 0.6 }} />
          : <Unlock size={16} className="lock-icon unlocked" />}
      </div>

      <h3 className="module-card-title">{mod.title}</h3>
      <p className="module-card-desc">{mod.description}</p>

      {/* Pages count — always visible */}
      <div className="module-card-meta-row">
        <span className="module-meta">{mod.pages?.length || mod.sections?.length || 0} Pages</span>
        <span className="module-meta" style={{ color: '#00f0ff', fontWeight: 600 }}>
          {mod.pointsMode === 'page' ? `${mod.earnedPoints || 0}/${mod.points || 0}` : (mod.points || 100)} pts
        </span>
        {pct > 0 && (
          <span className="module-meta" style={{ color: pct === 100 ? '#22c55e' : mod.color }}>
            {pct === 100 ? '✓ Done' : `${pct}% done`}
          </span>
        )}
        {locked && !isPrivileged && prereqLabel && (
          <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={11} /> Requires: {prereqLabel}
          </span>
        )}
      </div>

      {/* Progress bar — always show (0% = empty bar) */}
      <div className="module-card-progress">
        <div className="module-card-progress-fill" style={{ width: `${pct}%`, background: mod.color }} />
      </div>

      {/* Enter button */}
      <div className="module-card-actions">
        <button
          className="module-enter-btn"
          style={{
            borderColor: locked && !isPrivileged ? 'rgba(255,255,255,0.1)' : mod.color,
            color: locked && !isPrivileged ? '#64748b' : mod.color,
            cursor: locked && !isPrivileged ? 'not-allowed' : 'pointer',
          }}
          disabled={locked && !isPrivileged}
          onClick={(e) => {
            e.stopPropagation();
            if (!locked || isPrivileged) onClick(mod);
          }}
        >
          {locked && !isPrivileged ? <><Lock size={13} /> Locked</> : <>{pct === 100 ? '✓ Review' : pct > 0 ? '▶ Continue' : '▶ Enter'}</>}
        </button>
      </div>
    </div>
  );
};

export default ModuleCard;
