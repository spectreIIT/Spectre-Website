import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, BookOpen, HelpCircle, Eye, Edit3, ArrowLeft, Activity, Search, Filter, Award, Lock, Users, CheckCircle, Calendar, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AuthContext from '../../context/AuthContext';

const SortableModuleItem = ({ mod, renderCard, isDragDisabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod._id, disabled: isDragDisabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.6 : 1,
  };
  return renderCard(mod, { setNodeRef, style, attributes, listeners, isDragDisabled });
};

export default function ModuleBuilder({ eventId = null, onSaved }) {
  const [dbModules, setDbModules] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // URL state routing
  const view = searchParams.get('mView') || 'list';
  const activeModuleId = searchParams.get('mId');
  const activeModule = activeModuleId ? dbModules.find(m => m._id === activeModuleId) : null;

  const fetchModulesAndAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch DB modules
      const url = eventId 
        ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/modules?eventId=${eventId}`
        : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/modules`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        let data = await res.json();
        if (eventId) {
          data = data.filter(m => m.eventId === eventId);
        }
        setDbModules(data);
      }
    } catch (_) {}

    try {
      // 2. Fetch Completion Analytics
      const resAnalytic = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/modules/analytics`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (resAnalytic.ok) {
        setAnalytics(await resAnalytic.json());
      }
    } catch (_) {}
    setLoading(false);
  };

  // Auto-refresh when user focuses back on the tab (after creating/editing in a new tab)
  useEffect(() => {
    fetchModulesAndAnalytics();
    window.addEventListener('focus', fetchModulesAndAnalytics);
    return () => window.removeEventListener('focus', fetchModulesAndAnalytics);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setDbModules((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        const orderedIds = newItems.map(item => item._id);
        fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/modules/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ orderedIds })
        }).catch(err => console.error("Error reordering:", err));
        
        return newItems;
      });
    }
  };

  const setViewParams = (newView, moduleId = null) => {
    const params = new URLSearchParams(searchParams);
    if (newView === 'list') {
      params.delete('mView');
      params.delete('mId');
    } else {
      params.set('mView', newView);
      if (moduleId) params.set('mId', moduleId);
      else params.delete('mId');
    }
    setSearchParams(params);
  };

  const handleCreateNew = () => {
    const rolePath = user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
    if (eventId) {
      window.open(`/${rolePath}/modules/new?eventId=${eventId}`, '_blank');
    } else {
      window.open(`/${rolePath}/modules/new`, '_blank');
    }
  };

  const handleEdit = (id) => {
    const rolePath = user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
    window.open(`/${rolePath}/modules/edit/${id}`, '_blank');
  };

  const handleViewSolves = (mod) => {
    setViewParams('solves', mod._id);
  };

  const getStatusBadge = (status) => {
    const s = status || 'active';
    switch (s) {
      case 'draft':
        return (
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: 'rgba(245,158,11,0.1)', 
            color: '#f59e0b', 
            border: '1px dashed rgba(245,158,11,0.4)',
            textTransform: 'uppercase'
          }}>
            Draft
          </span>
        );
      case 'hidden':
        return (
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: 'rgba(239,68,68,0.1)', 
            color: '#ef4444', 
            border: '1px solid rgba(239,68,68,0.2)',
            textTransform: 'uppercase'
          }}>
            Hidden
          </span>
        );
      case 'active':
      default:
        return (
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: 'rgba(16,185,129,0.1)', 
            color: '#10b981', 
            border: '1px solid rgba(16,185,129,0.2)',
            textTransform: 'uppercase'
          }}>
            Active
          </span>
        );
    }
  };

  const formatUpdatedTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter modules based on search criteria
  const filteredModules = dbModules.filter(mod => {
    const matchesSearch = 
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      mod.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'draft') {
        matchesStatus = mod.status === 'draft';
      } else if (statusFilter === 'active') {
        matchesStatus = mod.status === 'active' || !mod.status;
      } else if (statusFilter === 'hidden') {
        matchesStatus = mod.status === 'hidden';
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  // Sort modules: Backend already sorts by order
  const sortedModules = filteredModules;

  const renderModuleCard = (mod, sortableProps = {}) => {
    const { setNodeRef, style, attributes, listeners, isDragDisabled } = sortableProps;
    const createdById = mod.createdBy?._id || mod.createdBy;
    const isOwner = createdById && createdById === user?._id;
    const creatorName = mod.createdBy?.username || 'Admin';
    
    // Check permission flags returned from our secure backend checks
    const canOpen = mod.canOpen !== false;
    const canEdit = mod.canEdit !== false;

    // Analytics brief count
    const progressList = analytics.filter(p => p.moduleId === String(mod._id));
    const completedCount = progressList.filter(p => p.isCompleted).length;

    return (
      <div 
        key={mod._id} 
        ref={setNodeRef}
        style={{ 
          ...style,
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: '#12141a', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderLeft: `4px solid ${mod.color || '#00f0ff'}`, 
          borderRadius: '10px', 
          padding: '16px 20px',
          opacity: canOpen ? (style?.opacity || 1) : 0.6,
          transition: style?.transition ? `${style.transition}, transform 0.15s, border-color 0.15s` : 'transform 0.15s, border-color 0.15s',
          position: 'relative'
        }}
      >
        {!isDragDisabled && (
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#64748b', outline: 'none' }}>
            <GripVertical size={18} />
          </div>
        )}
        {!canOpen && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <Lock size={10} /> Restricted
          </div>
        )}

        <span style={{ fontSize: '1.6rem' }}>{mod.icon || '📘'}</span>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{mod.title}</span>
            {getStatusBadge(mod.status)}
            {mod.eventId && !eventId && (
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(168, 85, 247, 0.08)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)', fontWeight: 600, textTransform: 'uppercase' }}>
                Event Module
              </span>
            )}
            {canOpen && (
              canEdit ? (
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(0, 240, 255, 0.08)', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.15)', fontWeight: 600 }}>
                  Edit Access
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 600 }}>
                  Read Only
                </span>
              )
            )}
          </div>
          
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
            {mod.pages?.length || 0} Pages • {mod.points || 0} PTS
            {mod.scheduledFor && <span style={{ color: '#475569', marginLeft: '6px' }}>• Scheduled: {formatUpdatedTime(mod.scheduledFor)}</span>}
            <span style={{ color: '#475569', marginLeft: '6px' }}>• Created by {isOwner ? 'You' : creatorName}</span>
            <span style={{ color: '#334155', marginLeft: '6px' }}>• Updated: {formatUpdatedTime(mod.updatedAt)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canOpen && (
            <button
              onClick={() => handleViewSolves(mod)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '700',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
              }}
            >
              <Activity size={13} /> {completedCount} Solves
            </button>
          )}

          <button 
            onClick={() => handleEdit(mod._id)}
            disabled={!canOpen}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: !canOpen ? 'rgba(255,255,255,0.02)' : canEdit ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.02)', 
              border: !canOpen ? '1px solid rgba(255,255,255,0.05)' : canEdit ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255,255,255,0.05)', 
              color: !canOpen ? '#475569' : canEdit ? '#00f0ff' : '#64748b', 
              padding: '8px 16px', 
              borderRadius: '6px', 
              cursor: canOpen ? 'pointer' : 'not-allowed', 
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            {!canOpen ? (
              <>
                <Lock size={13} /> Restricted
              </>
            ) : canEdit ? (
              <>
                <Edit3 size={13} /> Edit Specs
              </>
            ) : (
              <>
                <Eye size={13} /> View Specs
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render solves tracker / analytics dashboard view
  if (view === 'solves' && activeModule) {
    const modId = activeModule._id || activeModule.id;
    const completedUsers = analytics
      .filter(p => p.moduleId === String(modId) && p.isCompleted)
      .map(p => ({
        user: p.user,
        completedAt: p.lastActivityAt || p.startedAt,
        startedAt: p.startedAt
      }))
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    // Full Analytics computations for activeModule
    const progressList = analytics.filter(p => p.moduleId === String(modId));
    const enrolledCount = progressList.length;
    const completedCount = completedUsers.length;
    const challengeSolvesCount = activeModule.challenge?.solves?.length || 0;
    const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

    let lastActiveDate = 'No activity';
    if (progressList.length > 0) {
      const dates = progressList
        .map(p => new Date(p.lastActivityAt || p.startedAt || 0))
        .filter(d => d.getTime() > 0);
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates));
        lastActiveDate = maxDate.toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', marginBottom: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setViewParams('list')} 
              style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>Analytics & Completions: {activeModule.title}</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Real-time student progress tracking metrics</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
              {activeModule.status || 'Active'} Module
            </span>
          </div>
        </div>

        {/* 5-Column Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '10px', borderRadius: '8px' }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enrolled</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{enrolledCount}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px', borderRadius: '8px' }}>
              <CheckCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{completedCount}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '10px', borderRadius: '8px' }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lab Solved</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{challengeSolvesCount}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '10px', borderRadius: '8px' }}>
              <Activity size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completion Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>{completionRate}%</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Activity</div>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastActiveDate}</div>
            </div>
          </div>
        </div>

        {/* Completions Log Table */}
        <div style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Rank</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>User</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {completedUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No users have completed this learning path yet.
                  </td>
                </tr>
              ) : (
                completedUsers.map((u, idx) => {
                  const formattedDate = new Date(u.completedAt).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#fff' }}>
                      <td style={{ padding: '16px 24px', fontWeight: '700', color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: '700' }}>
                        {u.user?.username || 'Unknown'}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#94a3b8' }}>
                        {u.user?.email || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: '#cbd5e1' }}>
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginBottom: '60px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ color: '#fff', margin: 0 }}>Module Manager</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>Configure global learning paths and track student completions</p>
        </div>
        <button
          onClick={handleCreateNew}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#00f0ff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)' }}
        >
          <Plus size={16} /> New Module
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search modules..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px 10px 36px', borderRadius: '8px', outline: 'none' }}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: showFilters ? 'rgba(0, 240, 255, 0.15)' : 'transparent', 
              border: showFilters ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)', 
              color: showFilters ? '#00f0ff' : '#94a3b8', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: '#16181f', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
            >
              <option value="All">All Modules</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', minWidth: '80px' }}>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%', height: '36px', transition: 'all 0.2s', fontSize: '0.8rem' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Module List (Single list, no headings, sorted with active modules first) */}
      <div>
        <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Configured Learning Modules ({sortedModules.length})
        </h4>
        {loading && sortedModules.length === 0 ? (
          <p style={{ color: '#64748b' }}>Loading modules list...</p>
        ) : sortedModules.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '60px', background: '#12141a', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            No modules match your search filter parameters.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedModules.map(m => m._id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedModules.map(mod => (
                  <SortableModuleItem 
                    key={mod._id} 
                    mod={mod} 
                    renderCard={renderModuleCard} 
                    isDragDisabled={searchQuery !== '' || statusFilter !== 'All'}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
