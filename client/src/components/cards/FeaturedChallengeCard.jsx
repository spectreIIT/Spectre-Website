import React from 'react';
import { Box, ArrowRight } from 'lucide-react';

const FeaturedChallengeCard = ({ chal }) => {
  return (
    <div className="featured-card">
      <div className={`diff-badge badge-${chal.diffClass}`}>{chal.diff}</div>

      <div className="chal-icon-container" style={{ boxShadow: `0 0 40px -10px ${chal.color}` }}>
        <chal.icon size={48} color={chal.color} strokeWidth={1.5} />
      </div>

      <div className="chal-details">
        <h3>{chal.title}</h3>
        <p>{chal.desc}</p>

        <div className="chal-footer">
          <div className={`chal-points points-${chal.diffClass}`}>
            <Box size={14} /> {chal.points} pts
          </div>
          <button className={`play-btn btn-${chal.diffClass}`}>
            Play <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedChallengeCard;
