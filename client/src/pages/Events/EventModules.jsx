import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvent } from '../../context/EventContext';
import ModuleBuilder from '../../components/modules/ModuleBuilder';
import ModuleCard from '../../components/cards/ModuleCard';
import WriteupCreate from '../Writeups/WriteupCreate';
import { Filter, Search, RotateCcw, XCircle, PenTool, BookOpen, ChevronLeft, CheckCircle, Brain, ArrowRight, Eye, AlertTriangle, Award, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import API_URL from '../../constants/api';
import './EventModules.css';

export default function EventModules() {
  const { event, isAdminOrSupervisor } = useEvent();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isAdminView = location.pathname.includes('/admin/events');
  const isSupervisorView = location.pathname.includes('/supervisor/events');
  const isPrivilegedView = isAdminView || isSupervisorView;
  const isPrivileged = user?.role === 'Admin' || user?.role === 'Supervisor';

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [isCreatingWriteup, setIsCreatingWriteup] = useState(false);
  const [progressMap, setProgressMap] = useState({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchModulesAndProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/api/modules?eventId=${event._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setModules(await res.json());
      }
      
      if (!isPrivilegedView) {
        const progRes = await fetch(`${API_URL}/api/modules/progress/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (progRes.ok) {
          const all = await progRes.json();
          const map = {};
          all.forEach(p => { map[p.moduleId] = p; });
          setProgressMap(map);
        }
      }
    } catch (err) {
      console.error('Error fetching event modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrSupervisor && isPrivilegedView) return; // Privileged users use ModuleBuilder
    fetchModulesAndProgress();
  }, [event._id, isAdminOrSupervisor, isPrivilegedView]);

  // Handle auto-opening module from URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlModuleId = searchParams.get('moduleId');
    
    if (modules.length > 0 && urlModuleId && !activeModule) {
      const targetMod = modules.find(m => m._id === urlModuleId || m.id === urlModuleId);
      if (targetMod) {
        const nowTime = new Date();
        const isTimeLocked = targetMod.scheduledFor && new Date(targetMod.scheduledFor) > nowTime;
        const isLocked = (!isPrivileged && targetMod.accessGranted === false) || isTimeLocked;
        
        if (!isLocked) {
          setActiveModule(targetMod);
        }
      }
    }
  }, [modules, location.search, activeModule, isPrivileged]);

  if (isAdminOrSupervisor && isPrivilegedView) {
    return (
      <div className="event-modules-admin">
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#fff' }}>Module Management</h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Manage training modules scoped exclusively to {event.title}.</p>
        </div>
        <ModuleBuilder eventId={event._id} />
      </div>
    );
  }

  const handleReset = () => {
    setSearchQuery('');
  };

  // Client-side enrichment for the active module details view
  const getPrereqLabel = (mod) => {
    if (!mod.prerequisites?.length) return null;
    return mod.prerequisites.map(pre => pre.title || 'Unknown').join(', ');
  };

  // Filter modules
  const filteredModules = modules.filter(mod => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      mod.title.toLowerCase().includes(search) ||
      (mod.description && mod.description.toLowerCase().includes(search)) ||
      (mod.category && mod.category.toLowerCase().includes(search))
    );
  });

  const isEventStarted = new Date(event.startDate) <= new Date();

  if (loading) {
    return (
      <div className="event-modules-loading">
        <div className="event-spinner"></div>
        <p>Loading Modules...</p>
      </div>
    );
  }

  // Writeups logic
  const now = new Date();
  const writeupsStart = event.writeupsStart ? new Date(event.writeupsStart) : null;
  const writeupsEnd = event.writeupsEnd ? new Date(event.writeupsEnd) : null;
  
  const isParticipant = !isPrivilegedView && event.isRegistered;
  
  const isSubmissionOpen = event.allowWriteups && 
                           (!writeupsStart || now >= writeupsStart) && 
                           (!writeupsEnd || now <= writeupsEnd) &&
                           isParticipant;
                           
  const isSubmissionOver = event.allowWriteups && writeupsEnd && now > writeupsEnd && isParticipant;

  if (isCreatingWriteup) {
    return (
      <div style={{ padding: '24px' }}>
        <WriteupCreate 
          eventId={event._id} 
          onSuccess={() => setIsCreatingWriteup(false)}
          onCancel={() => setIsCreatingWriteup(false)}
        />
      </div>
    );
  }

  const activeModuleProg = activeModule ? progressMap[activeModule._id || activeModule.id] : null;
  const activeModuleCompletedPages = activeModuleProg ? new Set(activeModuleProg.completedSections || []) : new Set();
  const isActiveModuleFinished = !!activeModuleProg?.isCompleted;
  const activePages = activeModule?.pages || [];
  const activeTotalItems = activePages.length;

  return (
    <div className="event-modules-page">
      <div className="em-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1>{event.title} Modules</h1>
            <p>Complete training modules to earn points on the scoreboard.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {isSubmissionOpen && (
              <button 
                onClick={() => setIsCreatingWriteup(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#a855f7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#9333ea'}
                onMouseOut={(e) => e.currentTarget.style.background = '#a855f7'}
              >
                <PenTool size={18} /> Submit Writeup
              </button>
            )}
            {isSubmissionOver && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                Writeup submission time is over.
              </div>
            )}
          </div>
        </div>
      </div>

      {!activeModule ? (
        <>
          <div className="em-filters">
            <div className="em-search-box">
              <Search size={18} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search modules..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery('')}>
                  <XCircle size={16} />
                </button>
              )}
            </div>

            {searchQuery && (
              <button className="em-reset-btn" onClick={handleReset}>
                <RotateCcw size={16} /> Reset
              </button>
            )}
          </div>

          <div className="em-grid-container">
            {!isEventStarted ? (
              <div className="em-empty">
                <Filter size={48} />
                <h3>Event Not Started</h3>
                <p>The modules will be revealed when the event officially begins.</p>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="em-empty">
                <Filter size={48} />
                <h3>No Modules Found</h3>
                <p>Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="em-timeline-container">
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <filter id="remove-white" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 2.95 0" />
                  </filter>
                </svg>
                <div className="em-timeline-line"></div>
                {filteredModules.map((mod, index) => {
                  const nowTime = new Date();
                  const isTimeLocked = mod.scheduledFor && new Date(mod.scheduledFor) > nowTime;
                  // Strictly enforce time-lock even for privileged previewers when traversing timeline
                  const isLocked = (!isPrivileged && mod.accessGranted === false) || isTimeLocked;
                  // Calculate dynamic completion percentage
                  const modProg = progressMap[mod._id || mod.id];
                  const totalItems = mod.pages ? mod.pages.length : 0;
                  const completedItems = modProg?.completedSections ? new Set(modProg.completedSections).size : 0;
                  
                  let pct = 0;
                  if (totalItems > 0) {
                    pct = Math.round((completedItems / totalItems) * 100);
                  } else if (modProg?.isCompleted) {
                    pct = 100;
                  }
                  pct = Math.min(pct, 100);

                  const isCompleted = pct === 100;
                  
                  return (
                    <div 
                      key={mod._id} 
                      className={`em-timeline-node ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => !isLocked && setActiveModule(mod)}
                      style={{ '--mod-color': mod.color || '#a855f7' }}
                    >
                      <div className="em-node-marker">
                        {isLocked ? (
                          <img src="/images/ModuleStatus/Locked.jpeg" alt="Locked" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'url(#remove-white)' }} />
                        ) : isCompleted ? (
                          <img src="/images/ModuleStatus/completed.jpeg" alt="Completed" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'url(#remove-white)' }} />
                        ) : (
                          <img src="/images/ModuleStatus/NotCompleted.jpeg" alt="Not Completed" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'url(#remove-white)' }} />
                        )}
                      </div>
                      <div className="em-node-content">
                        <div className="em-node-header">
                          <h3>{mod.title}</h3>
                          <div className="em-node-badges">
                            <span className="em-node-points">
                              {mod.pointsMode === 'page' ? `${mod.earnedPoints || 0}/${mod.points || 0}` : (mod.points || 100)} PTS
                            </span>
                            {mod.category && <span className="em-node-category">{mod.category}</span>}
                          </div>
                        </div>
                        <p>{mod.description}</p>
                        
                        {!isLocked && (
                          <div className="em-node-footer">
                            <div className="em-progress-container">
                              <div className="em-progress-bar" style={{ width: `${pct}%`, background: mod.color || '#a855f7' }}></div>
                            </div>
                            <span className="em-progress-text">{pct}% Complete</span>
                          </div>
                        )}
                        {isLocked && getPrereqLabel(mod) && (
                          <div className="em-node-prereq">
                            <Lock size={12} /> Requires: {getPrereqLabel(mod)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="module-detail" style={{ marginTop: '20px' }}>
          <button className="back-btn" onClick={() => { setActiveModule(null); fetchModulesAndProgress(); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '0', marginBottom: '20px', fontWeight: 'bold' }}>
            <ChevronLeft size={16} /> Back to Modules
          </button>

          <div className="module-detail-header" style={{ '--module-color': activeModule.color, background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '30px', display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '4rem', background: 'rgba(255,255,255,0.05)', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', border: `1px solid ${activeModule.color}40`, boxShadow: `0 0 30px ${activeModule.color}20` }}>{activeModule.icon}</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', color: '#fff' }}>{activeModule.title}</h2>
              <p style={{ color: '#94a3b8', margin: '0 0 15px 0', lineHeight: 1.6 }}>{activeModule.description}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#00f0ff', background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.25)', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>
                  {activeModule.pointsMode === 'page' ? `${activeModule.earnedPoints || 0}/${activeModule.points || 0}` : (activeModule.points || 100)} PTS
                </span>
                {activeModule.category && (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px' }}>
                    {activeModule.category}
                  </span>
                )}
              </div>
              
              {(() => {
                const completedCount = activeModuleCompletedPages.size;
                let pct = 0;
                if (activeTotalItems > 0) {
                  pct = Math.round((completedCount / activeTotalItems) * 100);
                } else if (isActiveModuleFinished) {
                  pct = 100;
                }
                pct = Math.min(pct, 100);
                
                return (pct > 0 || completedCount > 0) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                    <div style={{ flex: 1, maxWidth: '250px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: activeModule.color, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
                      {completedCount} / {activeTotalItems} completed
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          <section className="module-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px', color: '#fff' }}>
              <Brain size={20} /> Syllabus Topics & Verification Labs
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const firstUnreadIdx = activePages.findIndex(p => !activeModuleCompletedPages.has(p.id));
                const maxAllowedIdx = firstUnreadIdx === -1 ? activePages.length : firstUnreadIdx;
                
                return activePages.map((page, i) => {
                  const isPageDone = activeModuleCompletedPages.has(page.id);
                  const isTimeLocked = page.scheduledFor && new Date(page.scheduledFor) > new Date();
                  const isLocked = i > maxAllowedIdx || isTimeLocked;
                  const modId = activeModule._id || activeModule.id;
                  const isChallenge = page.type === 'challenge';

                  return (
                    <div 
                      key={page.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: isChallenge ? 'rgba(168,85,247,0.03)' : 'rgba(255,255,255,0.02)',
                        border: isChallenge ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(255,255,255,0.05)',
                        borderLeft: isChallenge ? '3px solid #a855f7' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        transition: 'all 0.2s',
                        opacity: isLocked ? 0.5 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {isLocked ? <Lock size={18} color="#94a3b8" /> : isPageDone ? <CheckCircle size={18} color={isChallenge ? "#a855f7" : "#22c55e"} /> : <BookOpen size={18} color="#64748b" />}
                        <span style={{ color: isChallenge ? '#a855f7' : '#64748b', fontWeight: '800', fontSize: '1.1rem', minWidth: '30px' }}>
                          {isChallenge ? '🏁' : String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: isChallenge ? '700' : '500' }}>
                          {isChallenge ? `Lab: ${page.title}` : page.title}
                        </span>
                        {isChallenge && (
                          <span style={{ fontSize: '0.65rem', color: '#a855f7', background: 'rgba(168,38,255,0.1)', border: '1px solid rgba(168,38,255,0.25)', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', fontWeight: 'bold' }}>
                            VERIFICATION
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!isLocked) navigate(`/modules/${modId}/section/${i}`);
                        }}
                        disabled={isLocked}
                        style={{
                          background: isLocked ? 'rgba(255,255,255,0.05)' : (isPageDone ? 'rgba(255,255,255,0.05)' : (isChallenge ? '#a855f7' : '#38bdf8')),
                          color: isLocked ? '#94a3b8' : '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 'bold',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        {isLocked ? <><Lock size={14} /> Locked</> : (isPageDone ? (isChallenge ? 'Solved' : 'Review') : (isChallenge ? 'Deploy' : 'Open'))} 
                        {!isLocked && <ArrowRight size={14} />}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
