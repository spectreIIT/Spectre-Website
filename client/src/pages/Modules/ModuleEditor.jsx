import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldAlert, Plus, Trash, FileText, HelpCircle, Eye, Edit3, AlertTriangle, Sparkles, Check, ChevronDown, ChevronUp, BookOpen, X, GripVertical, Settings, Award } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import Editor from '../../components/editor/Editor';
import '../../styles/pages/Dashboard.css';
export default function ModuleEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isEdit = !!id;
  const eventId = searchParams.get('eventId');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [modulesList, setModulesList] = useState([]); // For prerequisite options
  
  // Modals state
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autosaveMessage, setAutosaveMessage] = useState('');

  // Active navigation tracking
  const [activePageIndex, setActivePageIndex] = useState(0); // number, or 'challenge'
  const [showSettingsModal, setShowSettingsModal] = useState(false); // Can open settings in overlay or sidebar. Let's make a beautiful side-tab for settings, or toggle it!

  // Editor forms state
  const [formData, setFormData] = useState({
    title: '',
    icon: '📘',
    color: '#00f0ff',
    description: '',
    banner: '',
    difficulty: 'Beginner',
    status: 'draft',
    unlocked: true,
    pointsMode: 'module',
    points: 100,
    prerequisites: [],
    pages: [],
    eventId: eventId || '',
    challenge: {
      title: '',
      description: '',
      files: [],
      flag: ''
    }
  });

  const [createdBy, setCreatedBy] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);

  useEffect(() => {
    const currentEventId = formData.eventId || eventId;
    if (!currentEventId) return;
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/events/${currentEventId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEventDetails(data);
        }
      } catch (err) {}
    };
    fetchEvent();
  }, [formData.eventId, eventId]);

  // Check read-only/ownership status
  const isOwner = !createdBy || createdBy === user?._id;
  const isReadOnly = isEdit && user?.role === 'Supervisor' && !isOwner;

  // Load prerequisite module options
  useEffect(() => {
    const fetchPrereqs = async () => {
      try {
        const currentEventId = eventId || formData.eventId;
        const queryParams = currentEventId ? `?eventId=${currentEventId}` : '';
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/modules${queryParams}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setModulesList(data.filter(m => m._id !== id));
        }
      } catch (err) {
        console.error('Error fetching modules for prerequisites:', err);
      }
    };
    
    // Only fetch if not loading an existing module's data, to ensure formData.eventId is available
    if (isEdit && loading) return;
    fetchPrereqs();
  }, [id, eventId, formData.eventId, isEdit, loading]);

  // Load existing module details if editing
  useEffect(() => {
    if (!isEdit) return;
    const fetchModuleDetails = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/modules/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            title: data.title || '',
            icon: data.icon || '📘',
            color: data.color || '#00f0ff',
            description: data.description || '',
            banner: data.banner || '',
            difficulty: data.difficulty || 'Beginner',
            status: data.status || 'draft',
            unlocked: data.unlocked !== false,
            pointsMode: data.pointsMode || 'module',
            points: data.points !== undefined ? data.points : 100,
            prerequisites: (data.prerequisites || []).map(p => p._id || p),
            eventId: data.eventId || '',
            scheduledFor: data.scheduledFor || null,
            pages: data.pages || [],
            challenge: data.challenge || { title: '', description: '', files: [], flag: '' }
          });
          if (data.createdBy) {
            setCreatedBy(data.createdBy._id || data.createdBy);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchModuleDetails();
  }, [id, isEdit]);

  // Default first page for new modules
  useEffect(() => {
    if (!isEdit && formData.pages.length === 0) {
      setFormData(prev => ({
        ...prev,
        pages: [{ id: `page_${Date.now()}`, title: 'Introduction', type: 'theory', content: '# Introduction\n\nWrite your topic theory here...', points: 0, questions: [], files: [], flag: '', hints: [] }]
      }));
      setActivePageIndex(0);
    }
  }, [isEdit]);

  // Recover Draft Autosave from localStorage on mount (for new modules)
  useEffect(() => {
    if (isEdit || isReadOnly) return;
    const savedDraft = localStorage.getItem('spectre_module_draft_new');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
        setAutosaveMessage('Loaded unsaved changes from local draft.');
        setTimeout(() => setAutosaveMessage(''), 4000);
      } catch (e) {
        console.error('Failed to parse draft details', e);
      }
    }
  }, [isEdit, isReadOnly]);

  // Autosave system triggered on formData changes (for drafts)
  useEffect(() => {
    if (!hasUnsavedChanges || isReadOnly) return;

    const timer = setTimeout(() => {
      const draftKey = isEdit ? `spectre_module_draft_${id}` : 'spectre_module_draft_new';
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setAutosaveMessage('Draft saved locally');
      
      const msgTimer = setTimeout(() => {
        setAutosaveMessage('');
      }, 2000);
      
      return () => clearTimeout(msgTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, hasUnsavedChanges, isReadOnly, isEdit, id]);

  const updateForm = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    updateForm({ [name]: val });
  };

  const handlePointsChange = (e) => {
    let val = e.target.value;
    if (val === '') {
      updateForm({ points: '' });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      updateForm({ points: num });
    }
  };

  // Add Page Item (theory or challenge)
  const addPageItem = (type) => {
    if (isReadOnly) return;
    const newItem = {
      id: `page_${Date.now()}`,
      title: type === 'challenge' ? `Practice Challenge ${formData.pages.length + 1}` : `Topic Page ${formData.pages.length + 1}`,
      type: type, // 'theory' or 'challenge'
      content: '',
      points: 0,
      questions: [],
      flag: '',
      files: [],
      hints: []
    };
    updateForm({ pages: [...formData.pages, newItem] });
    setActivePageIndex(formData.pages.length);
  };

  // Update Active Page title or content
  const updateActivePage = (patch) => {
    if (isReadOnly || typeof activePageIndex !== 'number') return;
    setFormData(prev => {
      const list = prev.pages.map((p, idx) => idx === activePageIndex ? { ...p, ...patch } : p);
      return { ...prev, pages: list };
    });
    setHasUnsavedChanges(true);
  };

  // Move page index (Arrows)
  const movePage = (index, dir) => {
    if (isReadOnly) return;
    const swap = index + dir;
    if (swap < 0 || swap >= formData.pages.length) return;
    const list = [...formData.pages];
    [list[index], list[swap]] = [list[swap], list[index]];
    updateForm({ pages: list });
    if (activePageIndex === index) {
      setActivePageIndex(swap);
    } else if (activePageIndex === swap) {
      setActivePageIndex(index);
    }
  };

  // Drag and Drop reordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const handleDragStart = (e, index) => {
    if (isReadOnly) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
  };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (isReadOnly || draggedIndex === null || draggedIndex === index) return;
    const list = [...formData.pages];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    updateForm({ pages: list });
    setDraggedIndex(null);

    if (activePageIndex === draggedIndex) {
      setActivePageIndex(index);
    } else if (activePageIndex > draggedIndex && activePageIndex <= index) {
      setActivePageIndex(activePageIndex - 1);
    } else if (activePageIndex < draggedIndex && activePageIndex >= index) {
      setActivePageIndex(activePageIndex + 1);
    }
  };

  // Delete Page
  const removePage = (index) => {
    if (isReadOnly) return;
    const list = formData.pages.filter((_, idx) => idx !== index);
    updateForm({ pages: list });
    if (activePageIndex === index) {
      setActivePageIndex(Math.max(0, index - 1));
    } else if (activePageIndex > index) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  // Challenge helpers
  const updateChallenge = (patch) => {
    if (isReadOnly) return;
    updateForm({ challenge: { ...formData.challenge, ...patch } });
  };

  const addChallengeFile = () => {
    if (isReadOnly) return;
    const files = [...(formData.challenge.files || []), { name: '', url: '' }];
    updateChallenge({ files });
  };

  const updateChallengeFile = (fileIdx, patch) => {
    if (isReadOnly) return;
    const files = (formData.challenge.files || []).map((f, idx) => idx === fileIdx ? { ...f, ...patch } : f);
    updateChallenge({ files });
  };

  const removeChallengeFile = (fileIdx) => {
    if (isReadOnly) return;
    const files = (formData.challenge.files || []).filter((_, idx) => idx !== fileIdx);
    updateChallenge({ files });
  };

  // Submit & Validation
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Full validation for active/hidden
    if (formData.status !== 'draft') {
      const missing = [];
      if (!formData.title?.trim()) missing.push('Module Title');
      if (!formData.description?.trim()) missing.push('Module Description');
      
      const pts = Number(formData.points);
      if (isNaN(pts) || pts < 0) {
        missing.push('Valid Point Value (greater than or equal to 0)');
      }

      if (!formData.pages || formData.pages.length === 0) {
        missing.push('At least one Page');
      } else {
        formData.pages.forEach((page, pIdx) => {
          const prefix = `Page #${pIdx + 1} (${page.title || 'Untitled'})`;
          if (!page.title?.trim()) missing.push(`${prefix}: Title is required`);
          if (!page.content?.trim()) missing.push(`${prefix}: Content is required`);
          
          if (page.type === 'challenge') {
             const hasFlag = !!page.flag?.trim();
             const hasQs = page.questions && page.questions.length > 0;
             if (!hasFlag && !hasQs) {
                missing.push(`${prefix}: At least one Question or Legacy Flag is required`);
             }
             if (hasQs) {
                page.questions.forEach((q, qIdx) => {
                   if (!q.text?.trim()) missing.push(`${prefix} Question ${qIdx + 1}: Text required`);
                   if (!q.answer?.trim()) missing.push(`${prefix} Question ${qIdx + 1}: Answer required`);
                });
             }
          }
        });
      }

      if (missing.length > 0) {
        setValidationErrorMessage(missing.join(', '));
        setShowValidationErrorModal(true);
        return;
      }
    }

    if (formData.eventId && formData.scheduledFor && eventDetails) {
      const scheduledTime = new Date(formData.scheduledFor).getTime();
      const eventStart = new Date(eventDetails.startDate).getTime();
      const eventEnd = new Date(eventDetails.endDate).getTime();
      
      if (scheduledTime < eventStart || scheduledTime > eventEnd) {
        setValidationErrorMessage(`Module Unlock Time must be between the Event Start (${new Date(eventDetails.startDate).toLocaleString()}) and Event End (${new Date(eventDetails.endDate).toLocaleString()}).`);
        setShowValidationErrorModal(true);
        return;
      }
    }

    setShowSettingsModal(false);

    if (formData.status === 'active' && (!isEdit || formData.status !== 'active')) {
      setShowConfirmPublish(true);
      return;
    }

    setShowConfirmSave(true);
  };

  const executeSave = async () => {
    setShowConfirmSave(false);
    setShowConfirmPublish(false);
    setSaving(true);
    try {
      const url = isEdit
        ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/modules/${id}`
        : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/modules`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const draftKey = isEdit ? `spectre_module_draft_${id}` : 'spectre_module_draft_new';
        localStorage.removeItem(draftKey);
        setHasUnsavedChanges(false);
        if (window.opener) {
          window.close();
        } else {
          navigate(user?.role === 'Admin' ? '/admin?tab=modules' : '/supervisor?tab=modules');
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to save module');
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving module');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmCancel(true);
    } else {
      executeCancel();
    }
  };

  const executeCancel = () => {
    const draftKey = isEdit ? `spectre_module_draft_${id}` : 'spectre_module_draft_new';
    localStorage.removeItem(draftKey);
    setHasUnsavedChanges(false);
    setShowConfirmCancel(false);
    if (window.opener) {
      window.close();
    } else {
      navigate(user?.role === 'Admin' ? '/admin?tab=modules' : '/supervisor?tab=modules');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/modules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const draftKey = `spectre_module_draft_${id}`;
        localStorage.removeItem(draftKey);
        setHasUnsavedChanges(false);
        setShowConfirmDelete(false);
        if (window.opener) {
          window.close();
        } else {
          navigate(user?.role === 'Admin' ? '/admin?tab=modules' : '/supervisor?tab=modules');
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to delete module');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting module');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', color: '#00f0ff', textAlign: 'center', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <div style={{ border: '4px solid #16181f', borderTop: '4px solid #00f0ff', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span>Loading syllabus specifications...</span>
      </div>
    );
  }

  // Styles
  const labelStyle = {
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#090a0f',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    boxSizing: 'border-box',
    marginTop: '6px',
    outline: 'none',
    fontSize: '0.88rem',
    transition: 'border-color 0.2s'
  };

  const activePage = typeof activePageIndex === 'number' ? formData.pages[activePageIndex] : null;

  return (
    <div style={{ width: '100%', height: '100vh', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', background: '#090a0f' }}>
      
      {/* Top Header Row */}
      <div style={{ backgroundColor: '#12141a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button"
            onClick={handleCancelClick} 
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>{formData.icon}</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#fff' }}>
                {isEdit ? (isReadOnly ? `View: ${formData.title}` : `Edit: ${formData.title}`) : 'Create New Learning Syllabus'}
              </h2>
            </div>
            <div style={{ height: '14px', marginTop: '2px' }}>
              {autosaveMessage && (
                <span style={{ fontSize: '0.72rem', color: '#00f0ff', fontWeight: '600', display: 'block', lineHeight: '14px' }}>
                  {autosaveMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isReadOnly ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold' }}>
              <ShieldAlert size={14} /> READ-ONLY
            </div>
          ) : (
            <>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    color: '#ef4444', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash size={14} /> Delete
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: '#16181f', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  color: '#fff', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                <Settings size={14} /> Settings
              </button>
              
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                disabled={saving}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(0, 240, 255, 0.1)', 
                  border: '1px solid rgba(0, 240, 255, 0.3)', 
                  color: '#00f0ff', 
                  padding: '8px 14px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  boxShadow: '0 0 10px rgba(0, 240, 255, 0.05)',
                  transition: 'all 0.2s'
                }}
              >
                <Save size={14} /> Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Layout: left sidebar + right editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Left Sidebar: Pages & Challenge navigation list */}
        <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', flexShrink: 0 }}>
            <h3 style={{ color: '#fff', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Syllabus Pages</h3>
            {!isReadOnly && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => addPageItem('theory')}
                  style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', color: '#00f0ff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={10} /> Page
                </button>
                <button 
                  onClick={() => addPageItem('challenge')}
                  style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={10} /> Lab
                </button>
              </div>
            )}
          </div>

          {/* Draggable page list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {formData.pages.map((p, idx) => {
              const isChall = p.type === 'challenge';
              const isActive = activePageIndex === idx;
              
              let bg = 'rgba(255,255,255,0.02)';
              let border = '1px solid rgba(255,255,255,0.04)';
              if (isActive) {
                bg = isChall ? 'rgba(168, 85, 247, 0.08)' : 'rgba(0, 240, 255, 0.06)';
                border = isChall ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(0, 240, 255, 0.3)';
              } else if (isChall) {
                bg = 'rgba(168, 85, 247, 0.02)';
                border = '1px dashed rgba(168, 85, 247, 0.2)';
              }

              return (
                <div 
                  key={p.id}
                  draggable={!isReadOnly}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => setActivePageIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: bg,
                    border: border,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  {!isReadOnly && (
                    <div style={{ color: '#475569', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                      <GripVertical size={14} />
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isChall ? <Award size={13} color="#a855f7" /> : <FileText size={13} color="#94a3b8" />}
                    <div style={{ color: isActive ? '#fff' : '#94a3b8', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {idx + 1}. {p.title || 'Untitled'}
                    </div>
                  </div>
                  
                  {formData.pointsMode === 'page' && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {(Number(p.points) || 0) + (p.questions ? p.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) : 0)} XP
                    </div>
                  )}

                  {/* Actions */}
                  {!isReadOnly && (
                    <div style={{ display: 'flex', gap: '2px', opacity: 0.7 }} onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => movePage(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px' }}><ChevronUp size={12} /></button>
                      <button type="button" onClick={() => movePage(idx, 1)} disabled={idx === formData.pages.length - 1} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px' }}><ChevronDown size={12} /></button>
                      {formData.pages.length > 1 && (
                        <button type="button" onClick={() => removePage(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', marginLeft: '2px' }}><Trash size={12} /></button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right main panel: The Editor */}
        <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
          
          {/* Centered placeholder if no page/challenge is active */}
          {!activePage && activePageIndex !== 'challenge' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: '#475569', minHeight: '300px', height: '100%' }}>
              <BookOpen size={48} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>No Syllabus Page Selected</span>
              <span style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '300px', color: '#64748b' }}>
                Select a topic page from the left sidebar or configure the final lab challenge to begin customizing the learning path.
              </span>
            </div>
          )}

          {/* Active Page Editor Pane */}
          {activePage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: formData.pointsMode === 'page' ? '2fr 1fr 1fr' : '2fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Syllabus Item Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Understanding CSRF Protections"
                    value={activePage.title}
                    onChange={(e) => updateActivePage({ title: e.target.value })}
                    disabled={isReadOnly}
                    style={inputStyle}
                  />
                </div>
                {formData.pointsMode === 'page' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Page Points</label>
                    <input 
                      type="number"
                      value={activePage.points ?? 0}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage({ points: val === '' ? '' : Number(val) });
                      }}
                      disabled={isReadOnly}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Item Type</label>
                  <select
                    value={activePage.type || 'theory'}
                    onChange={(e) => updateActivePage({ type: e.target.value })}
                    disabled={isReadOnly}
                    style={inputStyle}
                  >
                    <option value="theory">📖 Reading Page</option>
                    <option value="challenge">🏁 Practice Lab</option>
                  </select>
                </div>
              </div>

              {/* Page scheduling removed as per requirements */}

              {activePage.type === 'challenge' ? (
                // Challenge editor fields
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  {/* Task / Questions Builder */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={labelStyle}>Questions & Tasks</label>
                      {!isReadOnly && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const qs = [...(activePage.questions || []), { id: `q_${Date.now()}`, text: '', answer: '', type: 'flag', points: 0 }];
                            updateActivePage({ questions: qs });
                          }}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          + Add Question
                        </button>
                      )}
                    </div>
                    {(!activePage.questions || activePage.questions.length === 0) ? (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 10px 0' }}>No questions added. You can use a legacy flag below or add structured questions.</p>
                        <div style={{ textAlign: 'left' }}>
                          <label style={labelStyle}>Legacy Verification Flag (Fallback)</label>
                          <input 
                            type="text"
                            placeholder="e.g. SPECTRE{csrf_t0k3n_bypass_success}"
                            value={activePage.flag || ''}
                            onChange={(e) => updateActivePage({ flag: e.target.value })}
                            disabled={isReadOnly}
                            style={{ ...inputStyle, fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activePage.questions.map((q, qIdx) => (
                           <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 2 }}>
                                  <label style={{ ...labelStyle, marginBottom: '4px' }}>Question Text</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. What is the hidden directory name?" 
                                    value={q.text || ''} 
                                    onChange={(e) => {
                                      const qs = [...activePage.questions];
                                      qs[qIdx].text = e.target.value;
                                      updateActivePage({ questions: qs });
                                    }}
                                    disabled={isReadOnly}
                                    style={{ ...inputStyle, marginTop: 0 }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...labelStyle, marginBottom: '4px' }}>Type</label>
                                  <select
                                    value={q.type || 'flag'}
                                    onChange={(e) => {
                                      const qs = [...activePage.questions];
                                      qs[qIdx].type = e.target.value;
                                      updateActivePage({ questions: qs });
                                    }}
                                    disabled={isReadOnly}
                                    style={{ ...inputStyle, marginTop: 0, padding: '12px 8px' }}
                                  >
                                    <option value="flag">Standard Flag</option>
                                    <option value="blank">Fill-in-the-blank</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                  <label style={{ ...labelStyle, marginBottom: '4px' }}>Correct Answer</label>
                                  <input 
                                    type="text" 
                                    placeholder={q.type === 'blank' ? "Expected blank text" : "e.g. SPECTRE{...}"} 
                                    value={q.answer || ''} 
                                    onChange={(e) => {
                                      const qs = [...activePage.questions];
                                      qs[qIdx].answer = e.target.value;
                                      updateActivePage({ questions: qs });
                                    }}
                                    disabled={isReadOnly}
                                    style={{ ...inputStyle, marginTop: 0, fontFamily: q.type === 'flag' ? 'monospace' : 'inherit' }}
                                  />
                                </div>
                                {formData.pointsMode === 'page' && (
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...labelStyle, marginBottom: '4px' }}>Points</label>
                                  <input 
                                    type="number" 
                                    value={q.points ?? 0} 
                                    onChange={(e) => {
                                      const qs = [...activePage.questions];
                                      const val = e.target.value;
                                      qs[qIdx].points = val === '' ? '' : Number(val);
                                      updateActivePage({ questions: qs });
                                    }}
                                    disabled={isReadOnly}
                                    style={{ ...inputStyle, marginTop: 0 }}
                                  />
                                </div>
                                )}
                                {!isReadOnly && (
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const qs = activePage.questions.filter((_, idx) => idx !== qIdx);
                                      updateActivePage({ questions: qs });
                                    }}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', padding: '11px', borderRadius: '8px', height: '42px', display: 'flex', alignItems: 'center' }}
                                  >
                                    <Trash size={16} />
                                  </button>
                                )}
                              </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Challenge Files/Links Section (Immediately visible above description) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={labelStyle}>Lab Files / Verification Links</label>
                      {!isReadOnly && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const files = [...(activePage.files || []), { name: '', url: '', type: 'file' }];
                            updateActivePage({ files });
                          }}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          + Add File/Link
                        </button>
                      )}
                    </div>

                    {(!activePage.files || activePage.files.length === 0) ? (
                      <p style={{ color: '#475569', fontSize: '0.8rem', margin: 0 }}>No attached lab downloads or external verification URLs configured.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activePage.files.map((file, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select
                              value={file.type || 'file'}
                              onChange={(e) => {
                                const files = activePage.files.map((f, idx) => idx === fIdx ? { ...f, type: e.target.value } : f);
                                updateActivePage({ files });
                              }}
                              disabled={isReadOnly}
                              style={{ 
                                ...inputStyle, 
                                marginTop: 0, 
                                width: '100px', 
                                padding: '8px 6px',
                                fontSize: '0.8rem'
                              }}
                            >
                              <option value="file">📁 File</option>
                              <option value="link">🔗 Link</option>
                            </select>

                            <input 
                              type="text" 
                              placeholder={file.type === 'link' ? "Link Label (e.g. Deploy Instance)" : "File Name (e.g. source_code.c)"} 
                              value={file.name || ''} 
                              onChange={(e) => {
                                const files = activePage.files.map((f, idx) => idx === fIdx ? { ...f, name: e.target.value } : f);
                                updateActivePage({ files });
                              }}
                              disabled={isReadOnly}
                              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
                            />
                            <input 
                              type="text" 
                              placeholder={file.type === 'link' ? "External URL Link" : "Download URL Link"} 
                              value={file.url || ''} 
                              onChange={(e) => {
                                const files = activePage.files.map((f, idx) => idx === fIdx ? { ...f, url: e.target.value } : f);
                                updateActivePage({ files });
                              }}
                              disabled={isReadOnly}
                              style={{ ...inputStyle, marginTop: 0, flex: 2 }}
                            />
                            {!isReadOnly && (
                              <button 
                                type="button" 
                                onClick={() => {
                                  const files = activePage.files.filter((_, idx) => idx !== fIdx);
                                  updateActivePage({ files });
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Embedded External UI (IFrame URL)</label>
                    <input 
                      type="url"
                      placeholder="e.g. https://my-external-challenge-site.com"
                      value={activePage.embedUrl || ''}
                      onChange={(e) => updateActivePage({ embedUrl: e.target.value })}
                      disabled={isReadOnly}
                      style={inputStyle}
                    />
                    <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b' }}>If provided, this URL will be embedded directly into the module viewer so users don't have to leave the platform.</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={labelStyle}>Challenge Description</label>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                      <Editor 
                        value={activePage.content}
                        onChange={(val) => updateActivePage({ content: val })}
                        draftKey={null}
                        placeholder="Instruct the student on how to deploy local resources or perform analysis to extract the flag."
                        activePage={activePage}
                        updateActivePage={updateActivePage}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Theory editor fields
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={labelStyle}>Topic Content (Markdown supported)</label>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                      <Editor 
                        value={activePage.content}
                        onChange={(val) => updateActivePage({ content: val })}
                        draftKey={null}
                        placeholder="Structure the concepts, provide code snippets, and build informative theory segments."
                        activePage={activePage}
                        updateActivePage={updateActivePage}
                      />
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      </div>

      {/* SYLLABUS SETTINGS MODAL / SLIDE-IN OVERLAY */}
      {showSettingsModal && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)' }}>
          <div 
            className="spectre-template-modal-content" 
            style={{ 
              width: '600px', 
              background: '#12141a', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '16px', 
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              height: 'auto',
              maxHeight: '90vh'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#00f0ff" />
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Syllabus Configuration</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Module Title</label>
                  <input 
                    type="text" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="e.g. Advanced RSA Cryptography"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Award Points Mode</label>
                  <select
                    name="pointsMode"
                    value={formData.pointsMode}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    style={inputStyle}
                  >
                    <option value="module">Total Module Completion</option>
                    <option value="page">Granular (Per Page/Task)</option>
                  </select>
                </div>
                {formData.pointsMode === 'module' ? (
                  <div>
                    <label style={labelStyle}>Total Module Points / XP</label>
                    <input 
                      type="number" 
                      name="points" 
                      value={formData.points ?? 0} 
                      onChange={handlePointsChange} 
                      required 
                      placeholder="e.g. 150"
                      style={inputStyle}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Calculated Total Points</label>
                    <div style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                      {formData.pages.reduce((sum, p) => {
                        let pSum = Number(p.points) || 0;
                        if (p.questions) {
                          pSum += p.questions.reduce((qs, q) => qs + (Number(q.points) || 0), 0);
                        }
                        return sum + pSum;
                      }, 0)} XP
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Syllabus Overview Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  required 
                  rows={3}
                  placeholder="Provide an overview summarizing what concept learning paths this module addresses."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Visibility Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} style={inputStyle}>
                    <option value="draft">Draft</option>
                    <option value="active">Active (Live)</option>
                    <option value="hidden">Hidden (Admins only)</option>
                  </select>
                </div>

                {formData.eventId && (
                  <div>
                    <label style={labelStyle}>Scheduled Unlock Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledFor"
                      value={formData.scheduledFor ? new Date(new Date(formData.scheduledFor).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e) => updateForm({ scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      disabled={isReadOnly}
                      style={inputStyle}
                      min={eventDetails ? new Date(new Date(eventDetails.startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                      max={eventDetails ? new Date(new Date(eventDetails.endDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Icon Symbol (Emoji or Character)</label>
                  <input 
                    type="text" 
                    name="icon" 
                    value={formData.icon} 
                    onChange={handleInputChange} 
                    maxLength={10}
                    placeholder="e.g. 🌐"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Theme Color</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                    <input 
                      type="color" 
                      name="color" 
                      value={formData.color || '#00f0ff'} 
                      onChange={handleInputChange} 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        padding: '0', 
                        border: 'none', 
                        borderRadius: '8px', 
                        background: 'none', 
                        cursor: 'pointer' 
                      }} 
                    />
                    <input 
                      type="text" 
                      name="color" 
                      value={formData.color || '#00f0ff'} 
                      onChange={handleInputChange} 
                      placeholder="#00f0ff"
                      style={{ ...inputStyle, flex: 1, marginTop: 0, fontFamily: 'monospace' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Prerequisites Selector */}
              <div>
                <label style={labelStyle}>Unlock Prerequisites</label>
                {modulesList.length === 0 ? (
                  <span style={{ color: '#475569', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>No other syllabus learning paths configured.</span>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {modulesList.map(m => {
                      const selected = formData.prerequisites.includes(m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => {
                            updateForm({
                              prerequisites: selected 
                                ? formData.prerequisites.filter(pid => pid !== m._id) 
                                : [...formData.prerequisites, m._id]
                            });
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                            background: selected ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                            border: selected ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: selected ? '#f59e0b' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span>{m.icon}</span> {m.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '8px', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{ background: '#00f0ff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Finalize & Save Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION WARNING DIALOG */}
      {showValidationErrorModal && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
          <div className="spectre-template-modal-content" style={{ width: '480px', height: 'auto', background: '#12141a', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertTriangle size={36} color="#ef4444" />
              </div>
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Validation Failed</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Before publishing or hiding this module, please resolve the following missing criteria:
              <span style={{ display: 'block', color: '#ef4444', marginTop: '8px', fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'left', background: 'rgba(239,68,68,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                {validationErrorMessage}
              </span>
            </p>
            <button
              onClick={() => setShowValidationErrorModal(false)}
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Acknowledge &amp; Edit
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM SAVE MODAL */}
      {showConfirmSave && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
          <div className="spectre-template-modal-content" style={{ width: '400px', height: 'auto', background: '#12141a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 10px 0' }}>Save Changes?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Are you sure you want to write these learning module specifications to the database?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmSave(false)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeSave} style={{ background: '#00f0ff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Confirm Save</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PUBLISH ACTIVE WARNING MODAL */}
      {showConfirmPublish && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
          <div className="spectre-template-modal-content" style={{ width: '450px', height: 'auto', background: '#12141a', border: '1px solid rgba(0, 240, 255, 0.4)', borderRadius: '16px', padding: '28px', textAlign: 'center', boxShadow: '0 0 30px rgba(0,240,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                <Sparkles size={36} color="#00f0ff" />
              </div>
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 10px 0' }}>Go Active (Live)?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              You are about to publish <strong>{formData.title}</strong> as an ACTIVE learning syllabus. Members will be able to unlock, study, and complete this course immediately.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmPublish(false)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeSave} style={{ background: '#00f0ff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Publish Live</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showConfirmDelete && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
          <div className="spectre-template-modal-content" style={{ width: '420px', height: 'auto', background: '#12141a', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '28px', textAlign: 'center', boxShadow: '0 0 30px rgba(239,68,68,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <Trash size={36} color="#ef4444" />
              </div>
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 10px 0' }}>Delete Entire Syllabus?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Are you sure you want to permanently delete <strong>{formData.title}</strong>? All topic pages, challenge specifications, and student completion progress maps will be destroyed. This action is irreversible.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteConfirm} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL MODAL */}
      {showConfirmCancel && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
          <div className="spectre-template-modal-content" style={{ width: '400px', height: 'auto', background: '#12141a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 10px 0' }}>Discard Changes?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              You have unsaved changes. Are you sure you want to discard them and exit the editor?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmCancel(false)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeCancel} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer padding */}
      <div style={{ height: '8px' }} />

    </div>
  );
}
