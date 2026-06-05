import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckCircle, BookOpen, Shield, Loader2, Info, Lightbulb, AlertTriangle, Download, ExternalLink, Send, Sparkles, Check, Play, Lock } from 'lucide-react';
import '../../styles/pages/ModuleReader.css';
import '../../styles/pages/ModuleContent.css';
import { parseMarkdownToHTML } from '../../utils/editor/markdownParser';

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000");
const token = () => localStorage.getItem('token');

const formatExternalUrl = (url) => {
  if (!url) return '';
  url = url.trim();
  
  // If it starts with http://, https://, or //
  if (/^(https?:)?\/\//i.test(url)) {
    return url;
  }
  // If it starts with /, mailto:, tel:, javascript:, or hash #
  if (/^(\/|mailto:|tel:|javascript:|#)/i.test(url)) {
    return url;
  }
  
  // Check if it looks like an IP address or localhost
  const isIPOrLocal = /^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?/i.test(url);
  
  // Prefix with http:// for IPs/localhost, otherwise default to https://
  return isIPOrLocal ? `http://${url}` : `https://${url}`;
};

const toProxyUrl = (url) => {
  if (!url) return '';
  const formattedUrl = formatExternalUrl(url);
  if (formattedUrl.startsWith('/')) return formattedUrl; // Local paths don't need proxy
  
  try {
    const encoded = btoa(formattedUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Need to use the API base URL if the React app runs on a different port than the backend
    // Since /preview is handled by the backend Express server.
    return `${API}/preview/${encoded}/`;
  } catch (err) {
    return formattedUrl;
  }
};

const InlineHint = ({ hint, isRevealed, onReveal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const toggleHint = () => {
    if (!isRevealed && !isRevealing) {
      if (hint.cost > 0) {
        setShowConfirm(true);
      } else {
        doReveal();
      }
    } else {
      if (!isRevealing) {
        setIsOpen(!isOpen);
      }
    }
  };

  const doReveal = async () => {
    setShowConfirm(false);
    setIsOpen(true);
    setIsRevealing(true);
    await onReveal();
    setIsRevealing(false);
  };

  return (
    <>
      <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', fontSize: '0.88rem' }}>
        <div 
          onClick={toggleHint}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#cbd5e1', fontWeight: '600' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={16} color="#a855f7" /> 
            Hint {hint.cost > 0 ? <span style={{ color: '#ef4444', fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', marginLeft: '6px' }}>-{hint.cost} pts</span> : ''}
          </div>
          {isRevealing ? <Loader2 size={16} className="animate-spin" /> : isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {isOpen && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(168, 85, 247, 0.2)', color: '#94a3b8', lineHeight: '1.5' }}>
            {hint.text ? (
              <span dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(hint.text) }} />
            ) : (
              <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={14} className="animate-spin" /> Fetching hint...</span>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#0f1115', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '12px', width: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '50%' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Reveal Hint</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              This hint costs <strong style={{ color: '#ef4444' }}>{hint.cost} points</strong> to reveal. These points will be deducted from your total score for this module.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={doReveal}
                style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#a855f7', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Reveal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function ModuleReader() {
  const { moduleId, sectionIdx: sectionIdxParam } = useParams();
  const navigate = useNavigate();

  const isChallengePage = sectionIdxParam === 'challenge';
  const pageIdx = isChallengePage ? null : (parseInt(sectionIdxParam, 10) || 0);

  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [completedQuestions, setCompletedQuestions] = useState(new Set());
  const [revealedHints, setRevealedHints] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Challenge validation states
  const [submittedFlag, setSubmittedFlag] = useState('');
  const [flagError, setFlagError] = useState('');
  const [flagSuccess, setFlagSuccess] = useState('');

  // Questions state
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [questionStatus, setQuestionStatus] = useState({}); // { qId: { loading, error, success } }
  const [showEmbedFor, setShowEmbedFor] = useState(null);

  const handlePaneClick = useCallback((e) => {
    const btn = e.target.closest('.copy-code-btn');
    if (btn) {
      const encodedCode = btn.getAttribute('data-code');
      if (encodedCode) {
        try {
          const codeText = decodeURIComponent(encodedCode);
          navigator.clipboard.writeText(codeText);
          
          const originalText = btn.innerHTML;
          const isIconOnly = originalText.includes('<svg') || btn.tagName.toLowerCase() === 'svg';
          
          if (isIconOnly) {
            btn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
            btn.style.color = '#10b981';
            
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.color = '';
            }, 2000);
          } else {
            btn.innerHTML = 'Copied!';
            btn.style.color = '#10b981';
            btn.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            btn.style.background = 'rgba(16, 185, 129, 0.05)';
            
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.color = '';
              btn.style.borderColor = '';
              btn.style.background = '';
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      }
    }
  }, []);

  const loadModuleProgress = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/modules/${moduleId}/progress`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedSections(new Set(data.completedSections || []));
        setCompletedQuestions(new Set(data.completedQuestions || []));
        setRevealedHints(new Set(data.revealedHints || []));
      }
    } catch (err) {
      console.error('Error loading module progress:', err);
    }
  }, [moduleId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/modules/${moduleId}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        if (r.ok) {
          const found = await r.json();
          setMod(found);
        }
      } catch (err) {
        console.error('Error fetching module:', err);
      }
      await loadModuleProgress();
      setLoading(false);
    };
    load();
  }, [moduleId, loadModuleProgress]);

  const saveSection = useCallback(async (sectionId) => {
    setCompletedSections(prev => new Set([...prev, sectionId]));
    setSaving(true);
    try {
      await fetch(`${API}/api/modules/${moduleId}/progress/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ sectionId })
      });
    } catch (_) {}
    setSaving(false);
  }, [moduleId]);

  const handleRevealHint = async (hintId) => {
    if (revealedHints.has(hintId)) return;
    try {
      const res = await fetch(`${API}/api/modules/${moduleId}/hints/${hintId}/reveal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedHints(new Set(data.revealedHints || []));
        if (data.hintText) {
          setMod(prevMod => {
            if (!prevMod) return prevMod;
            const newMod = { ...prevMod };
            if (newMod.pages) {
              newMod.pages = newMod.pages.map(p => {
                if (p.hints) {
                  p.hints = p.hints.map(h => h.id === hintId ? { ...h, text: data.hintText } : h);
                }
                return p;
              });
            }
            if (newMod.challenge && newMod.challenge.hints) {
              newMod.challenge.hints = newMod.challenge.hints.map(h => h.id === hintId ? { ...h, text: data.hintText } : h);
            }
            return newMod;
          });
        }
      }
    } catch (err) {
      console.error('Error revealing hint:', err);
    }
  };

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    if (!submittedFlag.trim() || !activePage) return;

    setSaving(true);
    setFlagError('');
    setFlagSuccess('');
    try {
      const res = await fetch(`${API}/api/modules/${moduleId}/challenge/${activePage.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ flag: submittedFlag.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setFlagSuccess(data.message || 'Correct flag! Lab solved.');
        if (data.progress?.completedSections) {
          setCompletedSections(new Set(data.progress.completedSections));
        }
        if (data.progress?.completedQuestions) {
          setCompletedQuestions(new Set(data.progress.completedQuestions));
        }
        setSubmittedFlag('');
      } else {
        const err = await res.json();
        setFlagError(err.message || 'Incorrect flag submission. Try again.');
      }
    } catch (err) {
      setFlagError('Server error validating flag.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionSubmit = async (e, qId) => {
    e.preventDefault();
    const ans = questionAnswers[qId];
    if (!ans || !ans.trim() || !activePage) return;

    setQuestionStatus(prev => ({ ...prev, [qId]: { loading: true, error: '', success: '' } }));

    try {
      const res = await fetch(`${API}/api/modules/${moduleId}/challenge/${activePage.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ questionId: qId, answer: ans.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setQuestionStatus(prev => ({ ...prev, [qId]: { loading: false, error: '', success: 'Correct answer!' } }));
        if (data.progress?.completedSections) {
          setCompletedSections(new Set(data.progress.completedSections));
        }
        if (data.progress?.completedQuestions) {
          setCompletedQuestions(new Set(data.progress.completedQuestions));
        }
      } else {
        const err = await res.json();
        setQuestionStatus(prev => ({ ...prev, [qId]: { loading: false, error: err.message || 'Incorrect answer.', success: '' } }));
      }
    } catch (err) {
      setQuestionStatus(prev => ({ ...prev, [qId]: { loading: false, error: 'Server error.', success: '' } }));
    }
  };

  const handleFinishWithoutChallenge = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/modules/${moduleId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      navigate(mod?.eventId ? `/events/${mod.eventId}/arena/modules` : `/modules?moduleId=${moduleId}`);
    } catch (_) {
      navigate(mod?.eventId ? `/events/${mod.eventId}/arena/modules` : `/modules?moduleId=${moduleId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mr-loading"><Loader2 size={32} className="animate-spin" /> Loading Course Platform...</div>;
  if (!mod) return <div className="mr-error">Module not found. <button onClick={() => navigate('/modules')}>Go back</button></div>;

  const totalPages = mod.pages ? mod.pages.length : 0;
  const hasChallenge = false;
  const totalNavItems = totalPages;

  const activePage = !isChallengePage && mod.pages ? mod.pages[pageIdx] : null;

  const isModuleCompleted = mod.pages && mod.pages.length > 0 && mod.pages.every(p => completedSections.has(p.id));

  // Sidebar navigation indices
  const isPageRead = (pid) => completedSections.has(pid);

  const firstUnreadIdx = mod.pages ? mod.pages.findIndex(p => !isPageRead(p.id)) : 0;
  const maxAllowedIdx = firstUnreadIdx === -1 ? totalPages : firstUnreadIdx;

  return (
    <div className="mr-layout">
      {/* Top Navbar */}
      <header className="mr-topnav">
        <button className="mr-back" onClick={() => navigate(mod?.eventId ? `/events/${mod.eventId}/arena/modules` : `/modules?moduleId=${moduleId}`)}>
          <div className="logo-img-wrapper">
            <img src="/Illustration.png" alt="Spectre Logo" className="logo-img" />
          </div>
          <img 
            src="https://see.fontimg.com/api/rf5/0Mxv/ZDNmMDAxY2QxNjZjNGFjMzk1MWQ3Njg2MDZhZmIzZDAudHRm/U1BFQ1RSRQ/pixeldraw.png?r=fs&h=65&w=1000&fg=00F0FF&tb=1&s=65" 
            alt="Spectre" 
            style={{ height: '18px', objectFit: 'contain' }}
          />
          <ChevronLeft size={16} className="sep" />
          <span className="title">{mod.title}</span>
        </button>

        <div className="mr-progress-stats">
          <div className="progress-text">
            {isModuleCompleted ? totalNavItems : (completedSections.size + (isModuleCompleted ? 1 : 0))} / {totalNavItems} Completed
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${( (isModuleCompleted ? totalNavItems : completedSections.size) / totalNavItems ) * 100}%`, 
                background: mod.color 
              }} 
            />
          </div>
        </div>
      </header>

      {/* Workspace: Sidebar + Main Content */}
      <div className="mr-body">
        
        {/* Left Navigation Sidebar */}
        <aside className="mr-sidebar">
          <div className="sidebar-header">
            <span className="mod-icon">{mod.icon || '📘'}</span>
            <span className="mod-name" style={{ color: mod.color }}>{mod.title}</span>
          </div>

          <div className="section-list">
            {/* Pages Navigation List */}
            {mod.pages?.map((p, idx) => {
              const isChall = p.type === 'challenge';
              const isActive = !isChallengePage && idx === pageIdx;
              const isDone = isPageRead(p.id);
              const isTimeLocked = p.scheduledFor && new Date(p.scheduledFor) > new Date();
              const isLocked = idx > maxAllowedIdx || isTimeLocked;

              return (
                <button
                  key={p.id}
                  className={`section-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isChall ? 'challenge-item' : ''}`}
                  onClick={() => {
                    if (isLocked) return;
                    navigate(`/modules/${moduleId}/section/${idx}`);
                  }}
                  disabled={isLocked}
                  style={{ 
                    '--mc': isChall ? '#a855f7' : mod.color,
                    borderLeft: isChall ? '2px solid rgba(168,85,247,0.4)' : undefined,
                    opacity: isLocked ? 0.5 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div className="indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isLocked ? (
                      <img src="/images/ModuleStatus/Locked.jpeg" alt="Locked" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', opacity: 0.7 }} />
                    ) : isDone ? (
                      <img src="/images/ModuleStatus/completed.jpeg" alt="Completed" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: isChall ? '1px solid #a855f7' : '1px solid #22c55e' }} />
                    ) : (
                      <img src="/images/ModuleStatus/NotCompleted.jpeg" alt="Not Completed" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: isChall ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                  <span className="label" style={{ fontWeight: isChall ? 'bold' : 'normal' }}>
                    {isChall ? `🏁 Lab: ${p.title}` : `${idx + 1}. ${p.title}`}
                  </span>
                </button>
              );
            })}

            {/* Final Challenge Navigation (if active) */}
            {hasChallenge && (
              <button
                className={`section-item challenge-item ${isChallengePage ? 'active' : ''} ${isModuleCompleted ? 'done' : ''}`}
                onClick={() => {
                  if (totalPages > maxAllowedIdx) return;
                  navigate(`/modules/${moduleId}/section/challenge`);
                }}
                disabled={totalPages > maxAllowedIdx}
                style={{ 
                  '--mc': '#a855f7', 
                  marginTop: '16px',
                  opacity: (totalPages > maxAllowedIdx) ? 0.5 : 1,
                  cursor: (totalPages > maxAllowedIdx) ? 'not-allowed' : 'pointer'
                }}
              >
                <div className="indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {totalPages > maxAllowedIdx ? (
                    <img src="/images/ModuleStatus/Locked.jpeg" alt="Locked" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', opacity: 0.7 }} />
                  ) : isModuleCompleted ? (
                    <img src="/images/ModuleStatus/completed.jpeg" alt="Completed" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #a855f7' }} />
                  ) : (
                    <img src="/images/ModuleStatus/NotCompleted.jpeg" alt="Not Completed" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #a855f7' }} />
                  )}
                </div>
                <span className="label" style={{ fontWeight: 'bold' }}>🏁 Final Lab: {mod.challenge.title}</span>
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <main className="mr-main">
          <div className="content-container">
            
            {/* Page Header Metadata */}
            {/* Page Header Metadata */}
            <div className="content-meta">
              {!isChallengePage ? (
                <>
                  <span className="step">Topic {pageIdx + 1} / {totalPages}</span>
                  {isPageRead(activePage?.id) && (
                    <span className="completed-tag" style={activePage?.type === 'challenge' ? { background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' } : {}}>
                      <CheckCircle size={12} /> {activePage?.type === 'challenge' ? 'Solved' : 'Read Complete'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="step" style={{ color: '#a855f7' }}>Practical Verification</span>
                  {isModuleCompleted && (
                    <span className="completed-tag completed-badge-lab" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
                      <CheckCircle size={12} /> Solved
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Standard Topic Page / Inline Challenge Page */}
            {!isChallengePage && activePage && (
              <>
                {activePage.type === 'challenge' ? (
                  // Inline Challenge rendering
                  <>
                    <h1 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      🏁 Lab: {activePage.title}
                    </h1>

                    <div className="mr-article" onClick={handlePaneClick}>
                      {activePage.content ? (
                        <div className="markdown-preview">
                          {(() => {
                            const html = parseMarkdownToHTML(activePage.content);
                            const parts = html.split(/({{HINT:\s*[a-zA-Z0-9_-]+}})/g);
                            
                            return parts.map((part, i) => {
                              const match = part.match(/{{HINT:\s*([a-zA-Z0-9_-]+)}}/);
                              if (match) {
                                const hintId = match[1];
                                const hintData = activePage.hints?.find(h => h.id === hintId);
                                if (!hintData) return null;
                                return (
                                  <InlineHint 
                                    key={i} 
                                    hint={hintData} 
                                    isRevealed={revealedHints.has(hintId)} 
                                    onReveal={() => handleRevealHint(hintId)} 
                                  />
                                );
                              }
                              return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />;
                            });
                          })()}
                        </div>
                      ) : (
                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>Instructions pending specifications.</p>
                      )}

                      {/* Embedded External UI */}
                      {activePage.embedUrl && (
                        <div style={{ marginTop: '28px', width: '100%', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          {showEmbedFor !== activePage.id ? (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#090a0f' }}>
                              <div style={{ color: '#a855f7', marginBottom: '16px' }}><ExternalLink size={32} style={{ margin: '0 auto' }} /></div>
                              <h3 style={{ color: '#fff', marginBottom: '8px' }}>Embedded Lab Environment</h3>
                              <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 24px auto' }}>This lab includes an external site or virtual environment. Click below to load it.</p>
                              <button 
                                onClick={() => setShowEmbedFor(activePage.id)}
                                style={{
                                  background: 'rgba(168, 85, 247, 0.1)', 
                                  border: '1px solid rgba(168, 85, 247, 0.3)', 
                                  color: '#a855f7', 
                                  padding: '10px 24px', 
                                  borderRadius: '8px', 
                                  fontWeight: 600, 
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Play size={16} /> Load Site Environment
                              </button>
                            </div>
                          ) : (
                            <div style={{ height: '600px', backgroundColor: '#fff', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 16px', background: '#090a0f', borderBottom: '1px solid rgba(168,85,247,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                                <span style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ExternalLink size={14} /> External Lab Target
                                </span>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <a href={formatExternalUrl(activePage.embedUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Open in New Tab
                                  </a>
                                  <button onClick={() => setShowEmbedFor(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Close
                                  </button>
                                </div>
                              </div>
                              <iframe 
                                src={toProxyUrl(activePage.embedUrl)} 
                                title={`Embedded Challenge ${activePage.title}`}
                                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff', paddingTop: '36px' }}
                                allow="fullscreen"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attached Lab Files */}
                      {activePage.files && activePage.files.length > 0 && (
                        <div style={{ marginTop: '28px', padding: '20px', backgroundColor: '#090a0f', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px' }}>
                          <h4 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lab Resources &amp; Verification Links</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activePage.files.map((file, idx) => {
                              const isLink = file.type === 'link';
                              return (
                                <a 
                                  key={idx} 
                                  href={formatExternalUrl(file.url)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    color: '#a855f7', 
                                    textDecoration: 'none', 
                                    fontSize: '0.88rem', 
                                    fontWeight: 600,
                                    width: 'fit-content'
                                  }}
                                >
                                  {isLink ? <ExternalLink size={14} /> : <Download size={14} />} 
                                  {file.name || (isLink ? 'External Link' : 'Download Resource')}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Submit validation form */}
                      <div style={{ marginTop: '36px', padding: '24px', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                          <Shield size={16} color="#a855f7" />
                          <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {activePage.questions && activePage.questions.length > 0 ? 'Questions & Tasks' : 'Flag Verification'}
                          </span>
                        </div>

                        {activePage.questions && activePage.questions.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             {activePage.questions.map((q, idx) => {
                               const isQDone = completedQuestions.has(q.id);
                               const qStatus = questionStatus[q.id] || {};
                               return (
                                 <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                                       <span style={{ color: '#a855f7', fontWeight: 700 }}>Task {idx + 1}:</span>
                                       <span style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.4' }}>{q.text}</span>
                                    </div>
                                    
                                     {isQDone ? (
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                         <div style={{ display: 'flex', gap: '10px' }}>
                                           <input 
                                             type="text" 
                                             value={questionAnswers[q.id] || '••••••••'}
                                             disabled={true}
                                             style={{ 
                                               flex: 1, 
                                               backgroundColor: 'rgba(34,197,94,0.02)', 
                                               border: '1px solid rgba(34,197,94,0.5)', 
                                               color: '#22c55e', 
                                               padding: '10px 14px', 
                                               borderRadius: '8px', 
                                               outline: 'none', 
                                               fontFamily: q.type === 'blank' ? 'inherit' : 'monospace',
                                               fontSize: '0.85rem'
                                             }}
                                           />
                                           <button 
                                             type="button" 
                                             disabled={true}
                                             style={{ 
                                               background: 'rgba(34, 197, 94, 0.1)', 
                                               border: '1px solid rgba(34, 197, 94, 0.3)', 
                                               color: '#22c55e', 
                                               padding: '0 20px', 
                                               borderRadius: '8px', 
                                               fontWeight: 700, 
                                               display: 'flex',
                                               alignItems: 'center',
                                               gap: '6px',
                                               fontSize: '0.85rem',
                                               opacity: 0.9
                                             }}
                                           >
                                             <CheckCircle size={14} /> Solved
                                           </button>
                                         </div>
                                         <div style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                           <Check size={12} /> Correct Answer
                                         </div>
                                       </div>
                                     ) : (
                                      <form onSubmit={(e) => handleQuestionSubmit(e, q.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                          <input 
                                            type="text" 
                                            placeholder={q.type === 'blank' ? "Enter missing word/phrase" : "SPECTRE{...}"}
                                            value={questionAnswers[q.id] || ''}
                                            onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            disabled={qStatus.loading || saving}
                                            style={{ 
                                              flex: 1, 
                                              backgroundColor: '#090a0f', 
                                              border: '1px solid rgba(255,255,255,0.06)', 
                                              color: '#fff', 
                                              padding: '10px 14px', 
                                              borderRadius: '8px', 
                                              outline: 'none', 
                                              fontFamily: q.type === 'blank' ? 'inherit' : 'monospace',
                                              fontSize: '0.85rem',
                                              transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                                          />
                                          <button 
                                            type="submit" 
                                            disabled={qStatus.loading || saving}
                                            style={{ 
                                              background: 'rgba(168, 85, 247, 0.1)', 
                                              border: '1px solid rgba(168, 85, 247, 0.3)', 
                                              color: '#a855f7', 
                                              padding: '0 20px', 
                                              borderRadius: '8px', 
                                              fontWeight: 700, 
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              transition: 'all 0.2s',
                                              fontSize: '0.85rem'
                                            }}
                                          >
                                            {qStatus.loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
                                            Submit
                                          </button>
                                        </div>
                                        {qStatus.error && (
                                          <div style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <AlertTriangle size={12} /> {qStatus.error}
                                          </div>
                                        )}
                                        {qStatus.success && (
                                          <div style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={12} /> {qStatus.success}
                                          </div>
                                        )}
                                      </form>
                                    )}
                                 </div>
                               );
                             })}
                             
                             {isPageRead(activePage.id) && (
                                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                                  <CheckCircle size={20} />
                                  You have successfully solved all tasks in this lab.
                                </div>
                             )}
                          </div>
                        ) : isPageRead(activePage.id) ? (
                          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                            <CheckCircle size={20} />
                            You have successfully solved this lab challenge.
                          </div>
                        ) : (
                          <form onSubmit={handleFlagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <input 
                                type="text" 
                                placeholder="SPECTRE{...}"
                                value={submittedFlag}
                                onChange={(e) => setSubmittedFlag(e.target.value)}
                                disabled={saving}
                                style={{ 
                                  flex: 1, 
                                  backgroundColor: '#090a0f', 
                                  border: '1px solid rgba(255,255,255,0.06)', 
                                  color: '#fff', 
                                  padding: '12px 16px', 
                                  borderRadius: '8px', 
                                  outline: 'none', 
                                  fontFamily: 'monospace',
                                  fontSize: '0.9rem',
                                  transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                              />
                              <button 
                                type="submit" 
                                disabled={saving}
                                style={{ 
                                  background: 'rgba(168, 85, 247, 0.1)', 
                                  border: '1px solid rgba(168, 85, 247, 0.3)', 
                                  color: '#a855f7', 
                                  padding: '0 24px', 
                                  borderRadius: '8px', 
                                  fontWeight: 700, 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Send size={14} /> Submit
                              </button>
                            </div>

                            {flagError && (
                              <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} /> {flagError}
                              </div>
                            )}
                          </form>
                        )}

                        {flagSuccess && (
                          <div style={{ marginTop: '12px', color: '#22c55e', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={14} /> {flagSuccess}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  // Theory Page rendering
                  <>
                    <h1 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 800 }}>
                      {activePage.title}
                    </h1>

                    <div className="mr-article" onClick={handlePaneClick}>
                      {activePage.content ? (
                        <div className="markdown-preview">
                          {(() => {
                            const html = parseMarkdownToHTML(activePage.content);
                            const parts = html.split(/({{HINT:\s*[a-zA-Z0-9_-]+}})/g);
                            
                            return parts.map((part, i) => {
                              const match = part.match(/{{HINT:\s*([a-zA-Z0-9_-]+)}}/);
                              if (match) {
                                const hintId = match[1];
                                const hintData = activePage.hints?.find(h => h.id === hintId);
                                if (!hintData) return null;
                                return (
                                  <InlineHint 
                                    key={i} 
                                    hint={hintData} 
                                    isRevealed={revealedHints.has(hintId)} 
                                    onReveal={() => handleRevealHint(hintId)} 
                                  />
                                );
                              }
                              return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />;
                            });
                          })()}
                        </div>
                      ) : (
                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>This page does not contain any content specifications.</p>
                      )}
                    </div>
                  </>
                )}



                {/* Footer Controls */}
                <footer className="mr-footer-nav" style={{ marginTop: '40px' }}>
                  <button 
                    className="mr-btn mr-btn-outline" 
                    disabled={pageIdx === 0} 
                    onClick={() => navigate(`/modules/${moduleId}/section/${pageIdx - 1}`)}
                  >
                    <ChevronLeft size={18} /> Previous Topic
                  </button>
                  
                  <div className="mr-nav-center">
                    {activePage.type !== 'challenge' && (
                      !isPageRead(activePage.id) ? (
                        <button 
                          className="mr-btn mr-btn-mark" 
                          onClick={() => saveSection(activePage.id)}
                          disabled={saving}
                          style={{ '--mc': mod.color }}
                        >
                          {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                          Mark as Read
                        </button>
                      ) : (
                        <div className="status-read">
                          <CheckCircle size={16} color="#22c55e" /> Completed
                        </div>
                      )
                    )}
                  </div>

                  <div className="mr-nav-right">
                    {pageIdx < totalPages - 1 ? (
                      <button 
                        className="mr-btn mr-btn-primary" 
                        onClick={() => {
                          if (activePage.type === 'challenge' && !isPageRead(activePage.id)) return;
                          if (activePage.type !== 'challenge') {
                            saveSection(activePage.id);
                          }
                          navigate(`/modules/${moduleId}/section/${pageIdx + 1}`);
                        }}
                        style={{ 
                          background: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#334155' : mod.color, 
                          color: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#94a3b8' : '#000',
                          cursor: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={activePage.type === 'challenge' && !isPageRead(activePage.id)}
                      >
                        Next Topic <ChevronRight size={18} />
                      </button>
                    ) : hasChallenge ? (
                      <button 
                        className="mr-btn mr-btn-primary" 
                        onClick={() => {
                          if (activePage.type === 'challenge' && !isPageRead(activePage.id)) return;
                          if (activePage.type !== 'challenge') {
                            saveSection(activePage.id);
                          }
                          navigate(`/modules/${moduleId}/section/challenge`);
                        }}
                        style={{ 
                          background: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#334155' : '#a855f7', 
                          color: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#94a3b8' : '#fff',
                          cursor: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={activePage.type === 'challenge' && !isPageRead(activePage.id)}
                      >
                        Unlock Final Lab <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button 
                        className="mr-btn mr-btn-complete" 
                        onClick={async () => {
                          if (activePage.type === 'challenge' && !isPageRead(activePage.id)) return;
                          if (activePage.type !== 'challenge') {
                            await saveSection(activePage.id);
                          }
                          handleFinishWithoutChallenge();
                        }}
                        disabled={saving || (activePage.type === 'challenge' && !isPageRead(activePage.id))}
                        style={{
                          background: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#334155' : undefined,
                          color: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? '#94a3b8' : undefined,
                          cursor: (activePage.type === 'challenge' && !isPageRead(activePage.id)) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {saving ? 'Finishing...' : 'Finish Course'} <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}

            {/* Integrated Verification Challenge Page */}
            {isChallengePage && mod.challenge && (
              <>
                <h1 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏁 Final Lab: {mod.challenge.title}
                </h1>

                <div className="mr-article" onClick={handlePaneClick}>
                  <div className="markdown-preview">
                    {(() => {
                      const html = parseMarkdownToHTML(mod.challenge.description || 'Instructions pending specifications.');
                      const parts = html.split(/({{HINT:\s*[a-zA-Z0-9_-]+}})/g);
                      
                      return parts.map((part, i) => {
                        const match = part.match(/{{HINT:\s*([a-zA-Z0-9_-]+)}}/);
                        if (match) {
                          const hintId = match[1];
                          const hintData = mod.challenge.hints?.find(h => h.id === hintId);
                          if (!hintData) return null;
                          return (
                            <InlineHint 
                              key={i} 
                              hint={hintData} 
                              isRevealed={revealedHints.has(hintId)} 
                              onReveal={() => handleRevealHint(hintId)} 
                            />
                          );
                        }
                        return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />;
                      });
                    })()}
                  </div>

                  {/* Attached Lab Files */}
                  {mod.challenge.files && mod.challenge.files.length > 0 && (
                    <div style={{ marginTop: '28px', padding: '20px', backgroundColor: '#090a0f', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px' }}>
                      <h4 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Download Lab Resources</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {mod.challenge.files.map((file, idx) => (
                          <a 
                            key={idx} 
                            href={formatExternalUrl(file.url)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                color: '#a855f7', 
                                textDecoration: 'none', 
                                fontSize: '0.88rem', 
                                fontWeight: 600,
                                width: 'fit-content'
                            }}
                          >
                            <Download size={14} /> {file.name || 'resource_download'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit validation form */}
                  <div style={{ marginTop: '36px', padding: '24px', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Shield size={16} color="#a855f7" />
                      <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Flag Verification
                      </span>
                    </div>

                    {isModuleCompleted ? (
                      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                        <CheckCircle size={20} />
                        You have successfully solved this lab challenge and completed the syllabus path.
                      </div>
                    ) : (
                      <form onSubmit={handleFlagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input 
                            type="text" 
                            placeholder="SPECTRE{...}"
                            value={submittedFlag}
                            onChange={(e) => setSubmittedFlag(e.target.value)}
                            disabled={saving}
                            style={{ 
                              flex: 1, 
                              backgroundColor: '#090a0f', 
                              border: '1px solid rgba(255,255,255,0.06)', 
                              color: '#fff', 
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              outline: 'none', 
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                          />
                          <button 
                            type="submit" 
                            disabled={saving}
                            style={{ 
                              background: 'rgba(168, 85, 247, 0.1)', 
                              border: '1px solid rgba(168, 85, 247, 0.3)', 
                              color: '#a855f7', 
                              padding: '0 24px', 
                              borderRadius: '8px', 
                              fontWeight: 700, 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Send size={14} /> Submit
                          </button>
                        </div>

                        {flagError && (
                          <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={14} /> {flagError}
                          </div>
                        )}
                      </form>
                    )}

                    {flagSuccess && (
                      <div style={{ marginTop: '12px', color: '#22c55e', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} /> {flagSuccess}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <footer className="mr-footer-nav" style={{ marginTop: '40px' }}>
                  <button 
                    className="mr-btn mr-btn-outline" 
                    onClick={() => navigate(`/modules/${moduleId}/section/${totalPages - 1}`)}
                  >
                    <ChevronLeft size={18} /> Previous Topic
                  </button>
                  
                  <div className="mr-nav-center" />

                  <div className="mr-nav-right">
                    {isModuleCompleted ? (
                      <button 
                        className="mr-btn mr-btn-primary" 
                        onClick={() => navigate(mod?.eventId ? `/events/${mod.eventId}/arena/modules` : '/modules')}
                        style={{ background: '#a855f7', color: '#fff' }}
                      >
                        Return to Syllabus <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button 
                        className="mr-btn mr-btn-outline" 
                        onClick={() => navigate(mod?.eventId ? `/events/${mod.eventId}/arena/modules` : '/modules')}
                      >
                        Back to Courses
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
