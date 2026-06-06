import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, ShieldAlert, Plus, Trash, FileText, Link2, PlusCircle, HelpCircle, Eye, Edit3, AlertTriangle, Sparkles, Check, Upload } from 'lucide-react';
import API_URL from '../../../constants/api';
import { uploadImageToCloudinary } from '../../../utils/editor/cloudinaryUpload';

export default function ChallengeForm({ challenge, onSave, onCancel, onDelete }) {
  const isReadOnly = challenge?.isReadOnly || false;
  const isEdit = !!challenge;
  const userRole = localStorage.getItem('role') || 'Supervisor';

  // State management
  const [activeTab, setActiveTab] = useState('basic'); // basic, scoring, content, flag, files, hints
  const [formData, setFormData] = useState({
    title: challenge?.title || '',
    author: challenge?.author || 'Admin',
    category: challenge?.category || 'Web',
    difficulty: challenge?.difficulty || 'Easy',
    status: challenge?.status || 'draft',
    scoringType: challenge?.scoringType || 'static',
    initialPoints: challenge?.initialPoints || challenge?.points || 100,
    minimumPoints: challenge?.minimumPoints || 50,
    decayFactor: challenge?.decayFactor || 5,
    decayType: challenge?.decayType || 'linear',
    flagType: challenge?.flagType || 'static',
    caseSensitive: challenge?.caseSensitive ?? true,
    maxAttempts: challenge?.maxAttempts || 0,
    walkthroughUrl: challenge?.walkthroughUrl || '',
    description: challenge?.description || '',
    flag: challenge?.flag || '',
    tags: challenge?.tags || [],
    files: challenge?.files || [],
    hints: challenge?.hints || [],
    eventId: challenge?.eventId || '',
    scheduledFor: challenge?.scheduledFor || null
  });

  const [newTag, setNewTag] = useState('');
  const [previewMarkdown, setPreviewMarkdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autosaveMessage, setAutosaveMessage] = useState('');
  
  // File attachments temp states
  const [tempFile, setTempFile] = useState({ name: '', url: '', size: '', type: 'file' });
  const [isUploadingTempFile, setIsUploadingTempFile] = useState(false);
  // Hint temp states
  const [tempHint, setTempHint] = useState({ text: '', cost: 0 });

  // Simulate dynamic points
  const [simSolves, setSimSolves] = useState(10);
  
  // Events dropdown
  const [eventsList, setEventsList] = useState([]);
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out archived events if creating new, but keep if editing and currently assigned
          const filtered = data.filter(ev => ev.status !== 'archived' || ev._id === challenge?.eventId);
          setEventsList(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Autosave setup
  useEffect(() => {
    const draftKey = `spectre_draft_${challenge?._id || 'new'}`;
    // Load local draft if available
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !isReadOnly) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
        setAutosaveMessage('Loaded unsaved changes from local draft.');
        setTimeout(() => setAutosaveMessage(''), 4000);
      } catch (e) {
        console.error('Failed to parse draft draft', e);
      }
    }
  }, [challenge]);

  // Handle changes with unsaved changes tracking
  const updateForm = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  // Debounced autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges || isReadOnly) return;

    const timer = setTimeout(() => {
      const draftKey = `spectre_draft_${challenge?._id || 'new'}`;
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setAutosaveMessage('Draft saved locally');
      
      const msgTimer = setTimeout(() => {
        setAutosaveMessage('');
      }, 2000);
      
      return () => clearTimeout(msgTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, hasUnsavedChanges, isReadOnly, challenge]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    updateForm({ [name]: val });
  };

  // Tag chip handlers
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    if (!formData.tags.includes(newTag.trim())) {
      updateForm({ tags: [...formData.tags, newTag.trim()] });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    updateForm({ tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  // File items handler
  const handleAddFile = (e) => {
    e.preventDefault();
    if (!tempFile.name.trim() || !tempFile.url.trim()) return;
    updateForm({ files: [...formData.files, { ...tempFile }] });
    setTempFile({ name: '', url: '', size: '', type: 'file' });
  };

  const handleRemoveFile = (index) => {
    updateForm({ files: formData.files.filter((_, idx) => idx !== index) });
  };

  // Hint items handler
  const handleAddHint = (e) => {
    e.preventDefault();
    if (!tempHint.text.trim()) return;
    const costNum = parseInt(tempHint.cost, 10) || 0;
    updateForm({ hints: [...formData.hints, { text: tempHint.text, cost: costNum }] });
    setTempHint({ text: '', cost: 0 });
  };

  const handleRemoveHint = (index) => {
    updateForm({ hints: formData.hints.filter((_, idx) => idx !== index) });
  };

  // Simulate points formula
  const getSimulatedPoints = (solves) => {
    const init = Number(formData.initialPoints) || 100;
    const min = Number(formData.minimumPoints) || 50;
    const factor = Number(formData.decayFactor) || 5;
    
    if (formData.scoringType !== 'dynamic') return init;

    let points = init;
    if (formData.decayType === 'linear') {
      points = init - (solves * factor);
    } else if (formData.decayType === 'logarithmic') {
      points = Math.round(init - (init - min) * (Math.log(1 + solves * factor) / Math.log(100)));
    } else if (formData.decayType === 'exponential') {
      points = Math.round(min + (init - min) * Math.exp(-solves / factor));
    }
    return Math.max(min, points);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Manual validation for live/hidden status
    if (formData.status !== 'draft') {
      const missingFields = [];
      if (!formData.title?.trim()) missingFields.push('Title');
      if (!formData.description?.trim()) missingFields.push('Description');
      if (!formData.category?.trim()) missingFields.push('Category');
      if (!formData.difficulty?.trim()) missingFields.push('Difficulty');
      if (!formData.flag?.trim()) missingFields.push('Flag');
      
      const pts = Number(formData.initialPoints);
      if (isNaN(pts) || pts <= 0) {
        missingFields.push('Valid Point Value (greater than 0)');
      }

      if (missingFields.length > 0) {
        setValidationErrorMessage(missingFields.join(', '));
        setShowValidationErrorModal(true);
        return;
      }
    }

    // Trigger publish confirm if status goes to Active
    if (formData.status === 'active' && challenge?.status !== 'active') {
      setShowConfirmPublish(true);
      return;
    }

    setShowConfirmSave(true);
  };

  const handleSaveConfirm = async () => {
    setShowConfirmSave(false);
    await saveChallenge();
  };

  const saveChallenge = async () => {
    setSaving(true);
    try {
      const finalData = {
        ...formData,
        points: formData.scoringType === 'dynamic' ? formData.initialPoints : formData.initialPoints,
        eventId: formData.eventId || null
      };
      
      await onSave(finalData);
      
      // Clean up autosave draft
      const draftKey = `spectre_draft_${challenge?._id || 'new'}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
      onCancel();
    } catch (err) {
      alert(err.message || 'Failed to save challenge');
    } finally {
      setSaving(false);
      setShowConfirmPublish(false);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmCancel(true);
      return;
    }
    executeCancel();
  };

  const executeCancel = () => {
    const draftKey = `spectre_draft_${challenge?._id || 'new'}`;
    localStorage.removeItem(draftKey);
    setHasUnsavedChanges(false);
    setShowConfirmCancel(false);
    onCancel();
  };

  const handleDeleteConfirm = async () => {
    if (onDelete && challenge?._id) {
      setSaving(true);
      try {
        await onDelete(challenge._id);
        const draftKey = `spectre_draft_${challenge?._id || 'new'}`;
        localStorage.removeItem(draftKey);
        setHasUnsavedChanges(false);
        onCancel();
      } catch (err) {
        alert(err.message || 'Failed to delete challenge');
      } finally {
        setSaving(false);
        setShowConfirmDelete(false);
      }
    }
  };

  // Styles
  const tabItemStyle = (tab) => ({
    padding: '10px 16px',
    backgroundColor: activeTab === tab ? '#1b1e28' : 'transparent',
    borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent',
    color: activeTab === tab ? '#fff' : '#64748b',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    transition: 'all 0.2s',
    outline: 'none'
  });

  const sectionContainerStyle = {
    display: activeTab === activeTab ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.2s ease'
  };

  const labelStyle = {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#12141a',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    boxSizing: 'border-box',
    marginTop: '6px',
    outline: 'none',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s'
  };

  return (
    <div style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', position: 'relative', overflow: 'hidden', marginBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button"
            onClick={handleCancelClick} 
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#fff' }}>
              {isEdit ? (isReadOnly ? 'View Challenge Specifications' : 'Edit Challenge Specifications') : 'Create New CTF Challenge'}
            </h2>
            <div style={{ height: '14px', marginTop: '2px' }}>
              {autosaveMessage ? (
                <span style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: '600', display: 'block', lineHeight: '14px' }}>
                  {autosaveMessage}
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'transparent', display: 'block', lineHeight: '14px' }}>
                  &nbsp;
                </span>
              )}
            </div>
          </div>
        </div>
        
        {isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <ShieldAlert size={16} /> READ-ONLY ACCESS
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setActiveTab('basic')} style={tabItemStyle('basic')}>Basic Info</button>
        <button type="button" onClick={() => setActiveTab('scoring')} style={tabItemStyle('scoring')}>Scoring & Graph</button>
        <button type="button" onClick={() => setActiveTab('content')} style={tabItemStyle('content')}>Add Description</button>
        <button type="button" onClick={() => setActiveTab('flag')} style={tabItemStyle('flag')}>Flag config</button>
        <button type="button" onClick={() => setActiveTab('files')} style={tabItemStyle('files')}>Files & Resources</button>
        <button type="button" onClick={() => setActiveTab('hints')} style={tabItemStyle('hints')}>Hints ({formData.hints.length})</button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} noValidate style={{ paddingBottom: '70px' }}>
        
        {/* TAB 1: BASIC INFO */}
        {activeTab === 'basic' && (
          <div style={sectionContainerStyle}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Challenge Title</label>
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange} 
                  required 
                  disabled={isReadOnly} 
                  style={inputStyle} 
                  placeholder="e.g. Broken Authentication"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="Web">Web</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Pwn">Pwn</option>
                  <option value="Reverse Engineering">Reverse Engineering</option>
                  <option value="Forensics">Forensics</option>
                  <option value="OSINT">OSINT</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Difficulty Level</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Visibility Status</label>
                <select name="status" value={formData.status} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="draft">Draft</option>
                  <option value="active">Active (Live)</option>
                  <option value="hidden">Hidden (Admins only)</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Link to Event (Optional)</label>
                <select name="eventId" value={formData.eventId} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="">-- Global Challenge (No Event) --</option>
                  {eventsList.map(ev => (
                    <option key={ev._id} value={ev._id}>
                      {ev.title} ({ev.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Scheduled Unlock Time</label>
                <input
                  type="datetime-local"
                  name="scheduledFor"
                  value={formData.scheduledFor ? new Date(new Date(formData.scheduledFor).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={e => updateForm({ scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  disabled={isReadOnly}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Tag chip constructor */}
            <div>
              <label style={labelStyle}>Tags / Keywords</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0', minHeight: '30px' }}>
                {formData.tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', padding: '4px 10px', borderRadius: '12px' }}>
                    {tag}
                    {!isReadOnly && (
                      <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <Trash size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {formData.tags.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>No tags assigned</span>}
              </div>
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: '8px', maxWidth: '300px', marginTop: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="New tag..." 
                    value={newTag} 
                    onChange={e => setNewTag(e.target.value)} 
                    style={{ ...inputStyle, marginTop: 0, padding: '8px' }} 
                  />
                  <button type="button" onClick={handleAddTag} style={{ backgroundColor: '#1b1e28', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SCORING CONFIG */}
        {activeTab === 'scoring' && (
          <div style={sectionContainerStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Scoring Model</label>
                <select name="scoringType" value={formData.scoringType} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="static">Static Points</option>
                  <option value="dynamic">Dynamic Decay Points</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  {formData.scoringType === 'dynamic' ? 'Initial Points' : 'Point Value'}
                </label>
                <input 
                  type="number" 
                  name="initialPoints" 
                  value={formData.initialPoints} 
                  onChange={handleChange} 
                  min="1" 
                  required 
                  disabled={isReadOnly} 
                  style={inputStyle} 
                />
              </div>

              {formData.scoringType === 'dynamic' && (
                <>
                  <div>
                    <label style={labelStyle}>Minimum Points</label>
                    <input 
                      type="number" 
                      name="minimumPoints" 
                      value={formData.minimumPoints} 
                      onChange={handleChange} 
                      min="1" 
                      required 
                      disabled={isReadOnly} 
                      style={inputStyle} 
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Decay Type</label>
                    <select name="decayType" value={formData.decayType} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                      <option value="linear">Linear Decay</option>
                      <option value="logarithmic">Logarithmic Decay</option>
                      <option value="exponential">Exponential Decay</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Decay Factor</label>
                    <input 
                      type="number" 
                      name="decayFactor" 
                      value={formData.decayFactor} 
                      onChange={handleChange} 
                      min="1" 
                      required 
                      disabled={isReadOnly} 
                      style={inputStyle} 
                    />
                  </div>
                </>
              )}
            </div>

            {/* Live simulator */}
            {formData.scoringType === 'dynamic' && (
              <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '20px', marginTop: '10px' }}>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '800', margin: '0 0 16px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#c084fc" /> Live Decay Simulator
                </h4>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', minWidth: '100px' }}>Simulate Solves:</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={simSolves} 
                    onChange={e => setSimSolves(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#fff', fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>{simSolves} Solves</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>INITIAL VALUE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{formData.initialPoints} PTS</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>MINIMUM BOUND</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{formData.minimumPoints} PTS</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: '700' }}>SIMULATED VALUE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                      {getSimulatedPoints(simSolves)} PTS
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTENT / DESCRIPTION */}
        {activeTab === 'content' && (
          <div style={sectionContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>Description (Markdown Supported)</label>
              
              <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                <button type="button" onClick={() => setPreviewMarkdown(false)} style={{ border: 'none', backgroundColor: !previewMarkdown ? 'rgba(255,255,255,0.1)' : 'transparent', color: !previewMarkdown ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px', cursor: 'pointer', outline: 'none' }}>
                  Edit
                </button>
                <button type="button" onClick={() => setPreviewMarkdown(true)} style={{ border: 'none', backgroundColor: previewMarkdown ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewMarkdown ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px', cursor: 'pointer', outline: 'none' }}>
                  Preview
                </button>
              </div>
            </div>

            {!previewMarkdown ? (
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                required 
                disabled={isReadOnly}
                rows={12} 
                placeholder="Write the challenge prompt. Markdown is enabled (headers, links, list items, formatting)."
                style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} 
              />
            ) : (
              <div style={{ minHeight: '260px', padding: '16px', backgroundColor: '#12141a', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {formData.description ? formData.description : <span style={{ color: '#475569' }}>Nothing to preview. Write something in the editor!</span>}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FLAG CONFIG */}
        {activeTab === 'flag' && (
          <div style={sectionContainerStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Flag Matching Type</label>
                <select name="flagType" value={formData.flagType} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                  <option value="static">Static Match</option>
                  <option value="regex">Regular Expression (Regex)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Max Submissions Limit</label>
                <input 
                  type="number" 
                  name="maxAttempts" 
                  value={formData.maxAttempts} 
                  onChange={handleChange} 
                  min="0" 
                  required 
                  disabled={isReadOnly} 
                  placeholder="0 = Infinite attempts"
                  style={inputStyle} 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', color: '#fff', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    name="caseSensitive" 
                    checked={formData.caseSensitive} 
                    onChange={handleChange} 
                    disabled={isReadOnly} 
                  />
                  Case Sensitive Match
                </label>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Flag Value {isReadOnly ? '(Redacted for security)' : ''}
              </label>
              <input 
                type="text" 
                name="flag" 
                value={isReadOnly ? 'spectre{••••••••••••••••••••}' : formData.flag} 
                onChange={handleChange} 
                required={!isReadOnly}
                disabled={isReadOnly}
                placeholder="spectre{your_flag_here}"
                style={{ ...inputStyle, fontFamily: 'monospace', color: isReadOnly ? '#ef4444' : '#10b981', fontWeight: 'bold' }} 
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                For Regex flags, make sure the expression is standard PCRE compatible. Example: <code style={{ color: '#c084fc', backgroundColor: 'rgba(255,255,255,0.02)', padding: '2px 4px', borderRadius: '4px' }}>{'spectre\\{[a-f0-9]\\{32\\}\\}'}</code>
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: FILES & RESOURCES */}
        {activeTab === 'files' && (
          <div style={sectionContainerStyle}>
            {/* Walkthrough link (admin only) */}
            {userRole === 'Admin' && (
              <div>
                <label style={labelStyle}>Walkthrough URL (Admin Only)</label>
                <input 
                  type="text" 
                  name="walkthroughUrl" 
                  value={formData.walkthroughUrl} 
                  onChange={handleChange} 
                  disabled={isReadOnly} 
                  placeholder="https://github.com/ctf-platform/writeups/..."
                  style={inputStyle} 
                />
              </div>
            )}

            {/* List current attachments */}
            <div>
              <label style={labelStyle}>Attached Links & Files</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
                {formData.files.map((file, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {file.type === 'link' ? <Link2 size={16} color="#60a5fa" /> : <FileText size={16} color="#10b981" />}
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{file.name}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '8px' }}>
                          {file.type === 'link' ? 'External resource' : `Download (${file.size || 'N/A'})`}
                        </span>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => handleRemoveFile(index)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {formData.files.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>No links or files attached</span>}
              </div>
            </div>

            {/* Add new attachment constructor */}
            {!isReadOnly && (
              <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '800' }}>ATTACH A RESOURCE</span>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <input 
                      type="text" 
                      placeholder="Display Name (e.g. Web App Instance)" 
                      value={tempFile.name} 
                      onChange={e => setTempFile(prev => ({ ...prev, name: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 0, padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: '220px', display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Resource URL (HTTP or relative link)" 
                      value={tempFile.url} 
                      onChange={e => setTempFile(prev => ({ ...prev, url: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 0, padding: '8px', flex: 1 }}
                    />
                    {tempFile.type === 'file' && (
                      <button
                        type="button"
                        disabled={isUploadingTempFile}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.onchange = async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setIsUploadingTempFile(true);
                              try {
                                const url = await uploadImageToCloudinary(file);
                                setTempFile(prev => ({
                                  ...prev,
                                  url,
                                  name: prev.name || file.name,
                                  size: prev.size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                                }));
                              } catch (err) {
                                alert('Upload failed: ' + err.message);
                              } finally {
                                setIsUploadingTempFile(false);
                              }
                            }
                          };
                          input.click();
                        }}
                        style={{
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid rgba(0, 240, 255, 0.2)',
                          color: '#00f0ff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: isUploadingTempFile ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isUploadingTempFile ? '...' : <><Upload size={14} /> Upload</>}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <select 
                      value={tempFile.type} 
                      onChange={e => setTempFile(prev => ({ ...prev, type: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 0, padding: '8px' }}
                    >
                      <option value="file">File download</option>
                      <option value="link">Web instance link</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Size (e.g. 2.4 MB - optional)" 
                      value={tempFile.size} 
                      onChange={e => setTempFile(prev => ({ ...prev, size: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 0, padding: '8px' }}
                    />
                  </div>
                  <button type="button" onClick={handleAddFile} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Resource
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: HINTS */}
        {activeTab === 'hints' && (
          <div style={sectionContainerStyle}>
            {/* List current hints */}
            <div>
              <label style={labelStyle}>Configured Hints</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
                {formData.hints.map((hint, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#fff' }}>{hint.text}</span>
                      <span style={{ fontSize: '0.7rem', color: hint.cost > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                        {hint.cost > 0 ? `Deducts: ${hint.cost} PTS` : 'Free Hint'}
                      </span>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => handleRemoveHint(index)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {formData.hints.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>No hints added yet</span>}
              </div>
            </div>

            {/* Add new hint constructor */}
            {!isReadOnly && (
              <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '800' }}>ADD A CHALLENGE HINT</span>
                <div>
                  <input 
                    type="text" 
                    placeholder="Hint prompt text..." 
                    value={tempHint.text} 
                    onChange={e => setTempHint(prev => ({ ...prev, text: e.target.value }))}
                    style={{ ...inputStyle, marginTop: 0, padding: '8px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Point Deduction:</span>
                    <input 
                      type="number" 
                      min="0"
                      value={tempHint.cost === 0 ? '0' : tempHint.cost} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setTempHint(prev => ({ ...prev, cost: '' }));
                        } else {
                          const parsed = parseInt(val, 10);
                          setTempHint(prev => ({ ...prev, cost: isNaN(parsed) ? '' : parsed }));
                        }
                      }}
                      style={{ ...inputStyle, marginTop: 0, padding: '6px', maxWidth: '80px' }}
                    />
                  </div>
                  <button type="button" onClick={handleAddHint} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PlusCircle size={14} /> Add Hint
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STICKY ACTION/SAVE BAR */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1b1e28', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', boxSizing: 'border-box', zIndex: 10 }}>
          {challenge?._id && onDelete && !isReadOnly && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
            >
              <Trash size={16} style={{ fill: 'none' }} /> Delete Challenge
            </button>
          )}
          <button 
            type="button" 
            onClick={handleCancelClick} 
            style={{ background: 'transparent', color: '#94a3b8', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
          >
            Cancel
          </button>
          {!isReadOnly && (
            <button 
              type="submit" 
              disabled={saving} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#a855f7', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={16} /> {saving ? 'Saving Specs...' : 'Save Specifications'}
            </button>
          )}
        </div>

      </form>

      {/* CONFIRM PUBLISH DIALOG MODAL */}
      {showConfirmPublish && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: '#c084fc', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Confirm Publishing Challenge</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4', margin: '12px 0 24px 0' }}>
              You are about to switch the visibility status of this challenge to <strong>Active</strong>. This will make it immediately visible and solvable by all registered players.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowConfirmPublish(false)} 
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={saveChallenge} 
                style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', fontWeight: '700', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG MODAL */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash size={24} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Confirm Challenge Deletion</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4', margin: '12px 0 24px 0' }}>
              Are you sure you want to permanently delete{' '}
              <span style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', display: 'inline-block', margin: '0 4px' }}>
                {formData.title}
              </span>
              ? This action is irreversible and will delete all user progress and submission analytics for this challenge.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(false)} 
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDeleteConfirm} 
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: '700', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL DIALOG MODAL */}
      {showConfirmCancel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Discard Unsaved Changes?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4', margin: '12px 0 24px 0' }}>
              You have unsaved changes to this challenge. Leaving this page will discard all edits.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowConfirmCancel(false)} 
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Keep Editing
              </button>
              <button 
                type="button" 
                onClick={executeCancel} 
                style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', fontWeight: '700', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SAVE DIALOG MODAL */}
      {showConfirmSave && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Save size={24} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Save Challenge Specifications?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4', margin: '12px 0 24px 0' }}>
              Are you sure you want to save the modifications made to this challenge?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowConfirmSave(false)} 
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveConfirm} 
                style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: '700', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION ERROR DIALOG MODAL */}
      {showValidationErrorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#16181f', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '90%', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Required Fields Missing</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', margin: '12px 0 24px 0' }}>
              Before making this challenge active or hidden, you must complete all specifications. The following fields are required:
              <br />
              <strong style={{ color: '#f8fafc', display: 'block', marginTop: '8px', lineHeight: '1.6' }}>{validationErrorMessage}</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowValidationErrorModal(false)} 
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: '700', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Okay, Let me fix it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
