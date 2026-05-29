import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, CheckCircle, Brain, ArrowRight, Loader2, Eye, AlertTriangle, Award, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ModuleCard from '../../components/cards/ModuleCard';
import { useSearch } from '../../context/SearchContext';
import '../../styles/pages/Modules.css';

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000");


export default function Modules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPrivileged = user?.role === 'Admin' || user?.role === 'Supervisor';

  const [searchParams, setSearchParams] = useSearchParams();
  const [dbModules, setDbModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch DB modules + all progress
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/modules`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setDbModules(await res.json());
      } catch (_) {}

      try {
        const res2 = await fetch(`${API}/api/modules/progress/all`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res2.ok) {
          const all = await res2.json();
          const map = {};
          all.forEach(p => { map[p.moduleId] = p; });
          setProgressMap(map);
        }
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  // Unified helper to enrich any module with completion details and access checks
  const enrichModuleProgress = (mod) => {
    const prog = progressMap[String(mod._id || mod.id)];
    const isModuleDone = !!prog?.isCompleted;
    const done = new Set(prog?.completedSections || []);
    
    const totalItems = mod.pages?.length || 0;
    let completedCount = (mod.pages || []).filter(p => done.has(p.id)).length;
    
    let pct = 0;
    if (totalItems > 0) {
      pct = Math.round((completedCount / totalItems) * 100);
    } else if (isModuleDone) {
      pct = 100;
    }

    // RBAC and prerequisites check
    let accessGranted = true;
    let prerequisitesMet = true;

    if (!isPrivileged) {
      if (mod.unlocked === false) {
        accessGranted = false;
        prerequisitesMet = false;
      } else if (mod.prerequisites?.length > 0) {
        prerequisitesMet = mod.prerequisites.every(pre => {
          const preId = typeof pre === 'string' ? pre : (pre._id || pre.id);
          const pProg = progressMap[String(preId)];
          if (pProg?.isCompleted) return true;
          if (!pProg) return false;
          
          // Fallback if not fully completed in progress doc: check if all pages in the pre module are finished
          const pDone = new Set(pProg.completedSections || []);
          const targetPages = dbModules.find(m => String(m._id || m.id) === String(preId))?.pages || [];
          return targetPages.length > 0 && targetPages.every(p => pDone.has(p.id));
        });
        accessGranted = prerequisitesMet;
      }
    }

    return {
      ...mod,
      accessGranted,
      prerequisitesMet,
      completedCount,
      isCompleted: isModuleDone,
      totalSections: totalItems,
      completionPct: pct,
    };
  };

  const { searchQuery, setSearchQuery } = useSearch();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const allModulesRaw = [...dbModules.map(mod => enrichModuleProgress(mod))];
  // Deduplicate by title to prevent static/DB overlaps
  const seenTitles = new Set();
  const allModules = [];
  for (const mod of allModulesRaw) {
    if (!seenTitles.has(mod.title)) {
      allModules.push(mod);
      seenTitles.add(mod.title);
    }
  }

  const activeModuleId = searchParams.get('moduleId');
  const activeModule = activeModuleId ? allModules.find(m => String(m._id || m.id) === activeModuleId) : null;

  // Filter by Search and Role Visibility
  const filteredModules = allModules.filter(mod => {
    // Hide non-active modules from standard members
    if (!isPrivileged) {
      const isStatusActive = mod.status === 'active' || !mod.status || mod.status === undefined;
      if (!isStatusActive) return false;
    }

    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      mod.title.toLowerCase().includes(search) ||
      (mod.description && mod.description.toLowerCase().includes(search))
    );
  });

  // Sort modules: Active modules first, then Draft and Hidden modules
  const sortedModules = [...filteredModules].sort((a, b) => {
    const statusA = a.status || 'active';
    const statusB = b.status || 'active';
    
    if (statusA === 'active' && statusB !== 'active') return -1;
    if (statusA !== 'active' && statusB === 'active') return 1;
    
    if (statusA === 'draft' && statusB === 'hidden') return -1;
    if (statusA === 'hidden' && statusB === 'draft') return 1;
    
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedModules.length / ITEMS_PER_PAGE);
  const currentModules = sortedModules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Prerequisite label helper
  const getPrereqLabel = (mod) => {
    if (!mod.prerequisites?.length) return null;
    const names = mod.prerequisites.map(pre => {
      if (typeof pre === 'string') {
        return dbModules.find(m => String(m._id || m.id) === pre)?.title || 'Unknown';
      }
      return pre.title || 'Unknown';
    });
    return names.join(', ');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: '#00f0ff' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading syllabus modules...</span>
      </div>
    );
  }

  const activeModuleProg = activeModule ? progressMap[activeModule._id || activeModule.id] : null;
  const activeModuleCompletedPages = activeModuleProg ? new Set(activeModuleProg.completedSections || []) : new Set();
  const isActiveModuleFinished = !!activeModuleProg?.isCompleted;

  const activePages = activeModule?.pages || [];
  const activeTotalItems = activePages.length;

  return (
    <div className="modules-page">
      <div className="modules-header">
        <h1 className="modules-title">
          <BookOpen size={28} /> Learning Path Syllabus
        </h1>
        <p className="modules-subtitle">
          Infiltration training courses. Master defensive mechanics and solve practical validation challenges sequentially.
        </p>
        {isPrivileged && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: '#a855f7', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', padding: '5px 12px', borderRadius: '20px' }}>
            <Eye size={13} /> Logged in as {user?.role} — all draft/hidden modules fully visible
          </div>
        )}
      </div>

      {/* Module Grid */}
      {!activeModule ? (
        <>
          <div className="modules-grid">
            {currentModules.length > 0 ? (
              currentModules.map(mod => {
                const locked = !mod.accessGranted;
                const prereqLabel = getPrereqLabel(mod);
                const pct = mod.completionPct || 0;

                return (
                  <ModuleCard 
                    key={mod._id || mod.id} 
                    mod={mod} 
                    isPrivileged={isPrivileged} 
                    prereqLabel={prereqLabel} 
                    pct={pct} 
                    onClick={(mod) => setSearchParams({ moduleId: mod._id || mod.id })} 
                  />
                );
              })
            ) : (
              <div className="no-results">
                <p>No modules match your search filter parameters.</p>
                <button className="reset-search-btn" onClick={() => setSearchQuery('')}>Reset Search</button>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`pagination-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        /* Module Detail View */
        <div className="module-detail">
          <button className="back-btn" onClick={() => setSearchParams({})}>
            <ChevronLeft size={16} /> Back to Learning Paths
          </button>

          <div className="module-detail-header" style={{ '--module-color': activeModule.color }}>
            <span className="module-emoji-lg">{activeModule.icon}</span>
            <div style={{ flex: 1 }}>
              <h2 className="module-detail-title">{activeModule.title}</h2>
              <p className="module-detail-desc">{activeModule.description}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#00f0ff', background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.25)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {activeModule.pointsMode === 'page' ? `${activeModule.earnedPoints || 0}/${activeModule.points || 0}` : (activeModule.points || 100)} PTS
                </span>
              </div>
              
              {/* Module-level progress */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <div style={{ flex: 1, maxWidth: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: activeModule.color, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {completedCount} / {activeTotalItems} completed
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Prerequisite notice for privileged users viewing locked modules */}
          {!activeModule.accessGranted && isPrivileged && (
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#c4b5fd', fontSize: '0.85rem' }}>
              <Eye size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>This module is <strong>locked for standard members</strong>. You are previewing it as {user?.role}. Members must complete: <strong>{getPrereqLabel(activeModule)}</strong> first.</span>
            </div>
          )}

          {/* Visibility warning banner */}
          {activeModule.status && activeModule.status !== 'active' && (
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              background: activeModule.status === 'draft' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', 
              border: activeModule.status === 'draft' ? '1px solid rgba(234,179,8,0.25)' : '1px solid rgba(239,68,68,0.25)', 
              borderRadius: '10px', 
              padding: '12px 16px', 
              marginBottom: '20px', 
              color: activeModule.status === 'draft' ? '#f59e0b' : '#ef4444', 
              fontSize: '0.85rem' 
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                This module is currently in <strong style={{ textTransform: 'uppercase' }}>{activeModule.status}</strong> mode. 
                {activeModule.status === 'draft' 
                  ? ' It is only visible to you (creator) and admins. Standard members cannot view or solve this module.'
                  : ' It is only visible to admins and supervisors. Standard members cannot view or access this module.'}
              </span>
            </div>
          )}

          {/* Syllabus Topic Pages list */}
          <section className="module-section">
            <h3 className="section-heading">
              <Brain size={18} /> Syllabus Topics & Verification Labs
            </h3>
            
            <div className="topics-list">
              {/* Pages & Labs */}
              {(() => {
                const firstUnreadIdx = activePages.findIndex(p => !activeModuleCompletedPages.has(p.id));
                const maxAllowedIdx = firstUnreadIdx === -1 ? activePages.length : firstUnreadIdx;

                return activePages.map((page, i) => {
                  const isPageDone = activeModuleCompletedPages.has(page.id);
                  const isLocked = i > maxAllowedIdx;
                  const modId = activeModule._id || activeModule.id;
                  const isChallenge = page.type === 'challenge';

                  return (
                    <div 
                      key={page.id} 
                      className={`topic-row ${isChallenge ? 'challenge-row' : ''}`}
                      style={{
                        ...(isChallenge ? { borderLeft: '3px solid #a855f7', background: 'rgba(168,85,247,0.01)' } : {}),
                        opacity: isLocked ? 0.5 : 1
                      }}
                    >
                      <div className="topic-meta">
                        {isPageDone
                          ? <CheckCircle size={18} color={isChallenge ? '#a855f7' : '#22c55e'} />
                          : (isChallenge ? <Award size={18} color="#a855f7" /> : <BookOpen size={18} color="#64748b" />)}
                        <span className="topic-num" style={isChallenge ? { color: '#a855f7' } : {}}>{isChallenge ? '🏁' : String(i + 1).padStart(2, '0')}</span>
                        <span className="topic-name" style={isChallenge ? { fontWeight: 'bold' } : {}}>
                          {isChallenge ? `Lab: ${page.title}` : page.title}
                        </span>
                        {isChallenge && (
                          <span style={{ fontSize: '0.65rem', color: '#a855f7', background: 'rgba(168,38,255,0.1)', border: '1px solid rgba(168,38,255,0.25)', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px', fontWeight: 'bold' }}>
                            VERIFICATION
                          </span>
                        )}
                      </div>
                      <button
                        className="topic-btn"
                        style={{
                          ...(isChallenge ? { borderColor: '#a855f7', color: '#a855f7' } : {}),
                          ...(isLocked ? { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'not-allowed', background: 'transparent' } : {})
                        }}
                        onClick={() => {
                          if (!isLocked) navigate(`/modules/${modId}/section/${i}`);
                        }}
                        disabled={isLocked}
                      >
                        {isLocked ? <>Locked <Lock size={14} /></> : (isPageDone ? (isChallenge ? 'Solved' : 'Review') : (isChallenge ? 'Deploy' : 'Open'))} 
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
