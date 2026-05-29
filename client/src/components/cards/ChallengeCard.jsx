import React from 'react';
import { Users, Box } from 'lucide-react';

const ChallengeCard = ({ chal, onClick }) => {
  const diffClass = (chal.difficulty || 'Easy').toLowerCase();

  const getCategoryImage = (category) => {
    if (!category) return '/Illustration.png';
    const cat = category.toLowerCase();
    if (cat.includes('web')) return '/images/challenges/Web.jpg';
    if (cat.includes('forensic')) return '/images/challenges/Forensics.jpg';
    if (cat.includes('osint')) return '/images/challenges/OSINT.jpeg';
    if (cat.includes('reverse') || cat.includes('reversing')) return '/images/challenges/Reverse.jpg';
    if (cat.includes('crypto')) return '/images/challenges/Crypto.jpg';
    if (cat.includes('binary') || cat.includes('pwn')) return '/images/challenges/Binary.jpg';
    if (cat.includes('misc')) return '/images/challenges/Misc.jpg';
    return '/Illustration.png';
  };

  const imageSrc = getCategoryImage(chal.category);

  const cardStyle = chal.status && chal.status !== 'active' ? {
    opacity: 0.9,
    border: chal.status === 'draft' ? '1px dashed rgba(234, 179, 8, 0.6)' : '1px dashed rgba(239, 68, 68, 0.6)',
    cursor: 'pointer'
  } : { cursor: 'pointer' };

  return (
    <div 
      className={`challenge-box ${diffClass} ${chal.isSolved ? 'solved' : ''}`} 
      onClick={() => onClick(chal)}
      style={cardStyle}
    >
      <div className="ch-top-bar">
        <div className={`ch-diff-badge ${diffClass}`}>
          {chal.difficulty || 'EASY'}
        </div>
        
        {chal.isSolved && (
          <div className="solved-badge">✓</div>
        )}
        {chal.status && chal.status !== 'active' && !chal.isSolved && (
          <span className={`status-badge-${chal.status}`} style={{
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            backgroundColor: chal.status === 'draft' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: chal.status === 'draft' ? '#eab308' : '#ef4444',
            border: chal.status === 'draft' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            {chal.status}
          </span>
        )}
      </div>

      <div className="ch-image-container">
        <img src={imageSrc} alt={`${chal.category} Illustration`} style={{ borderRadius: '12px' }} />
      </div>

      <div className="ch-content">
        <h3 className="ch-new-title">{chal.title}</h3>
        <p className="ch-new-category">{chal.category}</p>
      </div>
      
      <div className="ch-new-footer">
        <div className={`ch-new-points ${diffClass}`}>
          <Box size={16} /> {chal.points} pts
        </div>
        <div className="ch-new-solves">
          <Users size={16} /> {chal.solves?.toLocaleString() || 0}
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
