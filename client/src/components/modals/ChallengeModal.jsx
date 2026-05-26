import React, { useState, useEffect } from 'react';
import { X, Info, Bookmark, ThumbsUp, Download, FileText, Globe, ExternalLink, Calendar, Award, Clock, Activity, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import { submitFlag, likeChallenge, fetchChallengeLeaderboard } from '../../services/challengeService';
import API_URL from '../../constants/api';
import '../../styles/components/ChallengeModal.css';

const ChallengeModal = ({ challenge: initialChallenge, onClose, onSolve, eventId }) => {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [flag, setFlag] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [activeTab, setActiveTab] = useState('overview'); // overview, files, hints
  const [revealedHints, setRevealedHints] = useState([]);
  const [hintToUnlock, setHintToUnlock] = useState(null); // holds index of hint to confirm unlock
  
  // Attempts tracking state
  const [attemptsSubmitted, setAttemptsSubmitted] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState('');
  const [likeLoading, setLikeLoading] = useState(false);

  // Fetch fresh user-specific challenge stats (attempts, solve status) on mount
  useEffect(() => {
    const fetchFreshStats = async () => {
      try {
        const id = initialChallenge._id || initialChallenge.id;
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/challenges/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChallenge(data);
          setAttemptsSubmitted(data.attemptsSubmitted || 0);
          setRemainingAttempts(data.remainingAttempts);
          
          // If a teammate solved it while the grid was open, sync the solved badge to the grid
          if (data.isSolved && !initialChallenge.isSolved && onSolve) {
            onSolve(id);
          }
        }
      } catch (err) {
        console.error('Failed to load fresh challenge details', err);
      }
    };
    if (initialChallenge) {
      setChallenge(initialChallenge);
      fetchFreshStats();
    }
  }, [initialChallenge]);

  if (!challenge) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flag.trim()) return;

    try {
      const res = await submitFlag(challenge._id || challenge.id, flag, revealedHints);
      if (res.success) {
        setStatus({ type: 'success', message: res.message || `Correct! You earned ${res.points} points!` });
        setIsAnimating('correct');
        setChallenge(prev => ({ 
          ...prev, 
          isSolved: true, 
          currentPoints: res.points > 0 ? res.points : prev.currentPoints 
        }));
        if (onSolve) onSolve(challenge._id || challenge.id, res.points > 0);
      } else {
        setStatus({ type: 'error', message: 'Incorrect flag. Try again!' });
        setIsAnimating('incorrect');
      }
      
      // Increment attempt tracking locally
      setAttemptsSubmitted(prev => prev + 1);
      if (res.remainingAttempts !== undefined) {
        setRemainingAttempts(res.remainingAttempts);
      }

      // Reset animation after 1 second
      setTimeout(() => setIsAnimating(''), 1000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Error submitting flag.' });
      setIsAnimating('incorrect');
      setTimeout(() => setIsAnimating(''), 1000);
    }
  };

  const handleLike = async () => {
    if (!challenge.isSolved || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await likeChallenge(challenge._id || challenge.id);
      if (res.success) {
        setChallenge({ 
          ...challenge, 
          likes: Array.from({ length: res.likes }),
          likeCount: res.likes,
          isLiked: res.isLiked
        });
      }
    } catch (err) {
      console.error('Failed to like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  // Unlocking Hints Logic
  const handleRevealHintClick = (idx, cost) => {
    if (cost > 0) {
      setHintToUnlock(idx); // Show warning confirmation modal
    } else {
      setRevealedHints([...revealedHints, idx]);
    }
  };

  const confirmUnlockHint = () => {
    if (hintToUnlock !== null) {
      setRevealedHints([...revealedHints, hintToUnlock]);
      setHintToUnlock(null);
    }
  };

  const totalLikes = challenge.likeCount ?? (challenge.likes?.length || 0);
  const diffDisplay = challenge.difficulty || 'Easy';
  const scoringType = challenge.scoringType || 'static';

  return (
    <div className={`cm-overlay ${isAnimating}`} onClick={onClose}>
      <div 
        className={`cm-modal ${isAnimating}`} 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', height: '85vh' }}
      >
        <button className="cm-close-top" onClick={onClose}>
          <X size={14} />
        </button>

        {/* Outer Grid Wrapper */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
          
          {/* LEFT PANEL: TABBED VIEWER */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#14161d', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 28px 12px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="cm-tag cm-category">{challenge.category}</span>
                <span className={`cm-tag cm-difficulty ${diffDisplay.toLowerCase()}`} style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                  {diffDisplay}
                </span>
                {scoringType === 'dynamic' && (
                  <span style={{ fontSize: '0.7rem', color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    DYNAMIC DECAY
                  </span>
                )}
                {challenge.status && challenge.status !== 'active' && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    backgroundColor: challenge.status === 'draft' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: challenge.status === 'draft' ? '#eab308' : '#ef4444',
                    border: challenge.status === 'draft' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {challenge.status}
                  </span>
                )}
                {challenge.isSolved && <span style={{ fontSize: '0.7rem', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>✓ SOLVED</span>}
              </div>
              <h2 className="cm-title" style={{ fontSize: '1.75rem', fontWeight: '800' }}>{challenge.title}</h2>
              <p className="cm-author">created by {challenge.author || 'Admin'}</p>
            </div>

            {/* Modal Tabs Menu */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 28px' }}>
              {['overview', 'files', 'hints'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 16px',
                    color: activeTab === tab ? '#fff' : '#64748b',
                    borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents Frame */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                  {challenge.status && challenge.status !== 'active' && (
                    <div style={{
                      backgroundColor: challenge.status === 'draft' ? 'rgba(234, 179, 8, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: challenge.status === 'draft' ? '1px solid rgba(234, 179, 8, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      color: challenge.status === 'draft' ? '#f59e0b' : '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      <AlertTriangle size={16} />
                      <span>
                        {challenge.status === 'draft' 
                          ? 'This target is currently a DRAFT. It is only accessible to you and admins.' 
                          : 'This target is currently HIDDEN. It is only visible to admins and supervisors.'}
                      </span>
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {challenge.description}
                  </div>
                </div>
              )}

              {/* TAB 2: FILES & RESOURCES */}
              {activeTab === 'files' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', margin: '0 0 4px 0', fontWeight: '700' }}>Downloadable Resources & Instances</h4>
                  {challenge.files && challenge.files.length > 0 ? (
                    challenge.files.map((file, idx) => (
                      <a 
                        key={idx} 
                        href={file.url} 
                        className={`cm-resource-item ${file.type || 'file'}`} 
                        download={file.type !== 'link'}
                        target="_blank"
                        rel="noreferrer"
                        style={{ border: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#181b24' }}
                      >
                        <div className="cm-resource-icon">
                          {file.type === 'link' ? <Globe size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="cm-resource-info">
                          <span className="cm-resource-name">{file.name}</span>
                          <span className="cm-resource-subtext">
                            {file.type === 'link' ? 'External Web Instance' : `Download • ${file.size || 'N/A'}`}
                          </span>
                        </div>
                        <div className="cm-resource-action">
                          {file.type === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
                        </div>
                      </a>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '0.85rem' }}>
                      No downloadable files or instances attached to this challenge.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HINTS */}
              {activeTab === 'hints' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', margin: '0 0 4px 0', fontWeight: '700' }}>Challenge Hints</h4>
                  <div className="cm-hints-list">
                    {(challenge.hints || []).map((hint, idx) => {
                      const isUnlocked = revealedHints.includes(idx);
                      return (
                        <div key={idx} className="cm-hint-item">
                          {isUnlocked ? (
                            <div style={{ padding: '12px 16px', backgroundColor: '#181b24', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Hint #{idx + 1} Unlocked</div>
                              {hint.text}
                            </div>
                          ) : (
                            <button
                              className="cm-reveal-btn"
                              onClick={() => handleRevealHintClick(idx, hint.cost || 0)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#101219', border: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <span>Reveal Hint #{idx + 1}</span>
                              <span style={{ fontSize: '0.75rem', color: hint.cost > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                                {hint.cost > 0 ? `-${hint.cost} PTS` : 'FREE'}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {(!challenge.hints || challenge.hints.length === 0) && (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '0.85rem' }}>
                        No hints are available for this challenge.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* RIGHT PANEL: SIDEBAR */}
          <div style={{ width: '280px', backgroundColor: '#181b24', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Flag submission area */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUBMIT SYSTEM FLAG</span>
              
              <form onSubmit={handleSubmit} style={{ marginTop: '10px' }}>
                <input 
                  type="text" 
                  placeholder="spectre{flag_here}"
                  value={flag}
                  onChange={e => setFlag(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#101217',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                
                {/* Attempt warnings & limits */}
                {challenge.maxAttempts > 0 && !challenge.isSolved && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                    <span>Attempts: {attemptsSubmitted}/{challenge.maxAttempts}</span>
                    <span style={{ color: remainingAttempts <= 2 ? '#ef4444' : '#94a3b8' }}>
                      {remainingAttempts} left
                    </span>
                  </div>
                )}

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button 
                    type="submit" 
                    style={{
                      backgroundColor: '#ff7b1a',
                      color: '#fff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: '0.2s',
                      width: '100%',
                      marginTop: '8px'
                    }}
                  >
                    {challenge.isSolved ? 'Check Flag Again' : 'Submit Flag'}
                  </button>
                  
                  {challenge.isSolved && !status.message && (
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem', padding: '8px', borderRadius: '6px', textAlign: 'center', marginTop: '8px' }}>
                      ✓ SOLVED BY TEAM
                    </div>
                  )}

                  {status.message && (
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      color: status.type === 'success' ? '#10b981' : '#ef4444',
                      marginTop: '4px'
                    }}>
                      {status.message}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Challenge Stats */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHALLENGE METRICS</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Points Value:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {challenge.currentPoints || challenge.points} PTS
                  </span>
                </div>
                {scoringType === 'dynamic' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: '#64748b' }}>Decay Base:</span>
                    <span style={{ color: '#cbd5e1' }}>
                      {challenge.initialPoints} PTS
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Total Solves:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {challenge.solves || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Max Attempts:</span>
                  <span style={{ color: '#fff' }}>
                    {challenge.maxAttempts > 0 ? challenge.maxAttempts : 'Infinite'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Walkthrough url (visible only when solved) */}
            {challenge.isSolved && challenge.walkthroughUrl && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SOLUTION GUIDE</span>
                <a 
                  href={challenge.walkthroughUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    color: '#c084fc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    textAlign: 'center'
                  }}
                >
                  <BookOpen size={14} /> Open Walkthrough
                </a>
              </div>
            )}

            {/* 4. Tags */}
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>KEYWORDS & TAGS</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {challenge.tags && challenge.tags.length > 0 ? (
                  challenge.tags.map(tag => (
                    <span 
                      key={tag} 
                      style={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        backgroundColor: '#101217',
                        border: '1px solid rgba(255,255,255,0.03)',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#475569', fontSize: '0.75rem' }}>No tags available</span>
                )}
              </div>
            </div>

            {/* Likes row */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: eventId ? 'flex-end' : 'space-between', alignItems: 'center' }}>
              {!eventId && (
                <button 
                  className={`cm-footer-btn cm-like-btn ${challenge.isLiked ? 'active' : ''} ${!challenge.isSolved ? 'disabled' : ''}`}
                  onClick={handleLike}
                  title={!challenge.isSolved ? "Solve to leave a like" : ""}
                  style={{
                    background: challenge.isLiked ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (challenge.isLiked ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.08)'),
                    color: challenge.isLiked ? '#00f0ff' : '#94a3b8',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: !challenge.isSolved ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem'
                  }}
                >
                  <ThumbsUp size={14} />
                  <span>{totalLikes} Likes</span>
                </button>
              )}

              <button 
                onClick={onClose} 
                className="cm-close-btn"
                style={{ fontSize: '0.75rem', padding: '6px 16px', borderRadius: '6px' }}
              >
                Close
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* CONFIRM UNLOCK HINT MODAL */}
      {hintToUnlock !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>Unlock Hint Confirmation</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.4', margin: '10px 0 20px 0' }}>
              Unlocking this hint will deduct <strong>{challenge.hints[hintToUnlock]?.cost} points</strong> from your final reward. Do you wish to continue?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setHintToUnlock(null)} 
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontWeight: '700', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmUnlockHint} 
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: '700', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Unlock Hint
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChallengeModal;
