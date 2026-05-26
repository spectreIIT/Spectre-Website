import { useState, useMemo } from 'react';
import { Edit2, Eye, Activity, ChevronUp, ChevronDown, Lock } from 'lucide-react';

export default function ChallengeList({ challenges, onEdit, onViewSolves }) {
  const [sortField, setSortField] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' }; // green
      case 'medium': return { bg: 'rgba(249,115,22,0.15)', color: '#f97316' }; // orange
      case 'hard': return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }; // red
      case 'advanced': return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' }; // blue
      case 'expert': return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }; // violet
      default: return { bg: 'rgba(255,255,255,0.1)', color: '#cbd5e1' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { color: '#10b981', label: 'Active' };
      case 'hidden': return { color: '#f59e0b', label: 'Hidden' };
      case 'draft': return { color: '#64748b', label: 'Draft' };
      default: return { color: '#94a3b8', label: 'Draft' };
    }
  };

  // Handle Sort Header click
  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Sort Challenges
  const sortedChallenges = useMemo(() => {
    const sorted = [...challenges];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Custom resolvers for subdocuments or points
      if (sortField === 'points') {
        aVal = a.currentPoints ?? a.points;
        bVal = b.currentPoints ?? b.points;
      } else if (sortField === 'creator') {
        aVal = a.createdBy?.username || a.author || '';
        bVal = b.createdBy?.username || b.author || '';
      } else if (sortField === 'solves') {
        aVal = a.solves || 0;
        bVal = b.solves || 0;
      } else if (sortField === 'lastUpdated') {
        aVal = a.updatedAt || a.createdAt || '';
        bVal = b.updatedAt || b.createdAt || '';
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? (aVal || 0) - (bVal || 0) 
          : (bVal || 0) - (aVal || 0);
      }
    });
    return sorted;
  }, [challenges, sortField, sortDirection]);

  if (challenges.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#16181f', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>No challenges matched the specified filters.</p>
      </div>
    );
  }

  // Sort Indicator Helper
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginBottom: '48px' }}>
      {/* Main Table */}
      <div style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th onClick={() => handleSort('title')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Challenge Name <SortIndicator field="title" /></span>
              </th>
              <th onClick={() => handleSort('category')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Category <SortIndicator field="category" /></span>
              </th>
              <th onClick={() => handleSort('difficulty')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Difficulty <SortIndicator field="difficulty" /></span>
              </th>
              <th onClick={() => handleSort('status')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Status <SortIndicator field="status" /></span>
              </th>
              <th onClick={() => handleSort('creator')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Creator <SortIndicator field="creator" /></span>
              </th>
              <th onClick={() => handleSort('points')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Points <SortIndicator field="points" /></span>
              </th>
              <th onClick={() => handleSort('solves')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Solves <SortIndicator field="solves" /></span>
              </th>
              <th onClick={() => handleSort('lastUpdated')} style={{ padding: '16px 24px', fontWeight: '600', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Last Updated <SortIndicator field="lastUpdated" /></span>
              </th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedChallenges.map(c => {
              const diffStyle = getDifficultyColor(c.difficulty);
              const statusStyle = getStatusColor(c.status);
              const displayPoints = c.currentPoints ?? c.points;
              const hasDecayed = c.scoringType === 'dynamic' && (c.initialPoints > displayPoints);
              
              const updatedDate = c.updatedAt || c.createdAt || new Date();
              const formattedDate = new Date(updatedDate).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });

              return (
                <tr 
                  key={c._id} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)', 
                    transition: 'all 0.2s', 
                    color: '#fff',
                    backgroundColor: 'transparent'
                  }} 
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'} 
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#f8fafc' }}>{c.title}</div>
                    {c.scoringType === 'dynamic' && (
                      <div style={{ fontSize: '0.65rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '2px' }}>
                        Dynamic Decay
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#94a3b8' }}>{c.category}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ backgroundColor: diffStyle.bg, color: diffStyle.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {c.difficulty || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyle.color }} />
                      <span style={{ color: '#cbd5e1', textTransform: 'capitalize', fontWeight: '600', fontSize: '0.8rem' }}>{statusStyle.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#94a3b8' }}>
                    {c.createdBy?.username || c.author || 'System'}
                  </td>
                  <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.8rem' }}>{displayPoints} PTS</div>
                    {hasDecayed && (
                      <div style={{ color: '#ef4444', fontSize: '0.6rem', textDecoration: 'line-through' }}>{c.initialPoints} PTS</div>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <button 
                      onClick={() => onViewSolves(c)}
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.15)'; }}
                    >
                      <Activity size={12} /> {c.solves || 0}
                    </button>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formattedDate}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {!c.isReadOnly ? (
                        <button onClick={() => onEdit(c)} style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', color: '#38bdf8', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.08)'} title="Edit Challenge">
                          <Edit2 size={14} />
                        </button>
                      ) : (
                        <button onClick={() => onEdit(c)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }} title="Read-Only View">
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
