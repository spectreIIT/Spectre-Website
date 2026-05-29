import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, Plus, Trash2, Edit, AlertCircle, ArrowLeft, Save, ShieldAlert, Sparkles, BookOpen, Target, Users, Zap, Terminal, Code, Award, Activity } from 'lucide-react';
import API_URL from '../../constants/api';
import { formatImageUrl } from '../../utils/formatImageUrl';
import '../../components/admin/events/EventsManager.css';

const ICON_OPTIONS = [
  { value: 'AlertCircle', label: 'Alert/Warning' },
  { value: 'ShieldAlert', label: 'Shield Alert' },
  { value: 'Terminal', label: 'Terminal' },
  { value: 'Code', label: 'Code' },
  { value: 'Zap', label: 'Zap/Power' },
  { value: 'Activity', label: 'Activity' },
  { value: 'Award', label: 'Award' },
];

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(id ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const currentDate = new Date().toISOString().slice(0, 16);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'ctf',
    startDate: '',
    endDate: '',
    registrationEnabled: true,
    registrationStart: '',
    registrationEndType: 'event_end',
    registrationEndDate: '',
    participationType: 'solo',
    maxTeamSize: 4,
    maxParticipants: 0,
    showLeaderboard: true,
    thumbnail: '',
    status: 'draft',
    rules: [],
    features: [],
    allowWriteups: false,
    writeupsStart: '',
    writeupsEnd: ''
  });

  const toLocalISOString = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (id) {
      const fetchEvent = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/api/events/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to fetch event details');
          const data = await res.json();
          setFormData({
            title: data.title || '',
            description: data.description || '',
            eventType: data.eventType || 'ctf',
            startDate: toLocalISOString(data.startDate),
            endDate: toLocalISOString(data.endDate),
            registrationEnabled: data.registrationEnabled !== undefined ? data.registrationEnabled : true,
            registrationStart: toLocalISOString(data.registrationStart),
            registrationEndType: data.registrationEndType || 'event_end',
            registrationEndDate: toLocalISOString(data.registrationEndDate),
            participationType: data.participationType || 'solo',
            maxTeamSize: data.maxTeamSize || 4,
            maxParticipants: data.maxParticipants || 0,
            showLeaderboard: data.showLeaderboard !== undefined ? data.showLeaderboard : true,
            status: data.status || 'draft',
            rules: Array.isArray(data.rules) ? data.rules : [],
            features: data.features || [],
            thumbnail: data.thumbnail || '',
            allowWriteups: data.allowWriteups || false,
            writeupsStart: toLocalISOString(data.writeupsStart),
            writeupsEnd: toLocalISOString(data.writeupsEnd)
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Event end date must be strictly after the start date.');
      return;
    }

    if (formData.allowWriteups) {
      if (new Date(formData.writeupsStart) <= new Date(formData.startDate)) {
        setError('Writeup submission start time must be strictly after the event start time.');
        return;
      }
    }

    if (formData.registrationEnabled) {
      if (new Date(formData.registrationStart) <= new Date(formData.startDate)) {
        setError('Registration start date must be strictly after the event start date.');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, thumbnail: formatImageUrl(formData.thumbnail) };
      
      let res;
      if (id) {
        res = await fetch(`${API_URL}/api/events/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save event');
      }

      const rolePath = user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
      navigate(`/${rolePath}?tab=events`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading event details...</div>;
  }

  return (
    <div style={{ backgroundColor: '#090a0f', minHeight: '100vh', padding: '40px 24px', color: '#fff' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>{id ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#12141a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>General Information</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
              </div>
              
              <div className="form-group">
                <label>Event Type *</label>
                <select value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }}>
                  <option value="ctf">CTF Competition</option>
                  <option value="module">Module Series</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <div className="form-group">
                <label>Thumbnail URL</label>
                <input type="text" value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} placeholder="https://..." style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px', resize: 'vertical' }}></textarea>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#12141a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Timing & Registration</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>Event Start Date *</label>
                <input type="datetime-local" min={currentDate} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
              </div>

              <div className="form-group">
                <label>Event End Date *</label>
                <input type="datetime-local" min={formData.startDate || currentDate} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.registrationEnabled} onChange={e => setFormData({...formData, registrationEnabled: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Enable Registration
                </label>
              </div>

              {formData.registrationEnabled && (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group">
                    <label>Registration End Type *</label>
                    <select value={formData.registrationEndType} onChange={e => setFormData({...formData, registrationEndType: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }}>
                      <option value="event_end">Till the end of the event</option>
                      <option value="specific">Specific Date & Time</option>
                    </select>
                  </div>
                  <div></div>
                  
                  <div className="form-group">
                    <label>Registration Start Date *</label>
                    <input type="datetime-local" min={formData.startDate || currentDate} value={formData.registrationStart} onChange={e => setFormData({...formData, registrationStart: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
                  </div>
                  
                  {formData.registrationEndType === 'specific' && (
                    <div className="form-group">
                      <label>Registration End Date *</label>
                      <input type="datetime-local" min={formData.registrationStart || currentDate} value={formData.registrationEndDate} onChange={e => setFormData({...formData, registrationEndDate: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#12141a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Participation & Config</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.showLeaderboard} onChange={e => setFormData({...formData, showLeaderboard: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Show Leaderboard
                </label>
              </div>

              <div className="form-group">
                <label>Participation Type *</label>
                <select value={formData.participationType} onChange={e => setFormData({...formData, participationType: e.target.value})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }}>
                  <option value="solo">Single User (Solo)</option>
                  <option value="team">Team Based</option>
                </select>
              </div>

              <div className="form-group">
                <label>Max Participants (0 = Unlimited)</label>
                <input type="number" min="0" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: Number(e.target.value)})} style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
              </div>

              {formData.participationType === 'team' && (
                <div className="form-group">
                  <label>Maximum Team Size *</label>
                  <input type="number" min="1" value={formData.maxTeamSize} onChange={e => setFormData({...formData, maxTeamSize: Number(e.target.value)})} required style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.allowWriteups} onChange={e => setFormData({...formData, allowWriteups: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Allow Writeup Submissions
                </label>
              </div>

              {formData.allowWriteups && (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group">
                    <label>Writeup Submissions Start Date *</label>
                    <input type="datetime-local" min={formData.startDate || currentDate} value={formData.writeupsStart} onChange={e => setFormData({...formData, writeupsStart: e.target.value})} required={formData.allowWriteups} style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
                  </div>
                  <div className="form-group">
                    <label>Writeup Submissions End Date *</label>
                    <input type="datetime-local" min={formData.writeupsStart || currentDate} value={formData.writeupsEnd} onChange={e => setFormData({...formData, writeupsEnd: e.target.value})} required={formData.allowWriteups} style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rules & Guidelines */}
          <div style={{ backgroundColor: '#12141a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Rules & Guidelines (Protocol Directives)</h2>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, rules: [...formData.rules, { title: '', content: '', icon: 'AlertCircle', level: 'info' }]})}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
              >
                <Plus size={14} /> Add Protocol Rule
              </button>
            </div>
            
            {formData.rules && formData.rules.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formData.rules.map((rule, idx) => (
                  <div key={idx} style={{ background: '#1a1d24', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', gap: '16px' }}>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 200px', gap: '16px' }}>
                        <input 
                          type="text" 
                          placeholder="Directive Title (e.g., No Collaboration & Flag Sharing)" 
                          value={rule.title} 
                          onChange={e => {
                            const newRules = [...formData.rules];
                            newRules[idx].title = e.target.value;
                            setFormData({...formData, rules: newRules});
                          }}
                          required
                          style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}
                        />
                        <select 
                          value={rule.icon} 
                          onChange={e => {
                            const newRules = [...formData.rules];
                            newRules[idx].icon = e.target.value;
                            setFormData({...formData, rules: newRules});
                          }}
                          style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}
                        >
                          {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <select 
                          value={rule.level} 
                          onChange={e => {
                            const newRules = [...formData.rules];
                            newRules[idx].level = e.target.value;
                            setFormData({...formData, rules: newRules});
                          }}
                          style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}
                        >
                          <option value="critical">Critical Restriction (Red)</option>
                          <option value="warning">Warning Level (Yellow)</option>
                          <option value="info">Protocol Info (Blue)</option>
                          <option value="success">Award Eligible (Green)</option>
                        </select>
                      </div>
                      <textarea 
                        placeholder="Rule content/details..." 
                        value={rule.content} 
                        onChange={e => {
                          const newRules = [...formData.rules];
                          newRules[idx].content = e.target.value;
                          setFormData({...formData, rules: newRules});
                        }}
                        required
                        rows={3}
                        style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newRules = [...formData.rules];
                        newRules.splice(idx, 1);
                        setFormData({...formData, rules: newRules});
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', height: 'fit-content' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                No rules defined. Click "Add Protocol Rule" to create timeline-style guidelines.
              </div>
            )}
          </div>

          {/* Features / Cards section */}
          <div style={{ backgroundColor: '#12141a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Event Highlights / Cards</h2>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, features: [...formData.features, { title: '', description: '' }]})}
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
              >
                <Plus size={14} /> Add Card
              </button>
            </div>
            
            {formData.features && formData.features.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {formData.features.map((feature, idx) => (
                  <div key={idx} style={{ background: '#1a1d24', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newFeatures = [...formData.features];
                        newFeatures.splice(idx, 1);
                        setFormData({...formData, features: newFeatures});
                      }}
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '24px' }}>
                      <input 
                        type="text" 
                        placeholder="Card Title" 
                        value={feature.title} 
                        onChange={e => {
                          const newFeatures = [...formData.features];
                          newFeatures[idx].title = e.target.value;
                          setFormData({...formData, features: newFeatures});
                        }}
                        style={{ width: '100%', background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                      <textarea 
                        placeholder="Card Description" 
                        value={feature.description} 
                        onChange={e => {
                          const newFeatures = [...formData.features];
                          newFeatures[idx].description = e.target.value;
                          setFormData({...formData, features: newFeatures});
                        }}
                        rows={3}
                        style={{ width: '100%', background: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                No highlight cards added.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              style={{ background: '#a855f7', border: 'none', color: '#fff', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} /> {saving ? 'Saving...' : (id ? 'Update Event' : 'Create Event')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
