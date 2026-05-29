import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Save } from 'lucide-react';
import API_URL from '../../constants/api';
import '../../components/admin/events/EventsManager.css';

export default function EventSettings() {
  const { event, isAdminOrSupervisor, fetchEvent } = useEvent();
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentDate = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    const toLocalISOString = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        eventType: event.eventType || 'ctf',
        status: event.status || 'draft',
        startDate: toLocalISOString(event.startDate),
        endDate: toLocalISOString(event.endDate),
        registrationEnabled: event.registrationEnabled !== undefined ? event.registrationEnabled : true,
        registrationStart: toLocalISOString(event.registrationStart),
        registrationEndType: event.registrationEndType || 'event_end',
        registrationEndDate: toLocalISOString(event.registrationEndDate),
        participationType: event.participationType || 'solo',
        maxTeamSize: event.maxTeamSize || 4,
        maxParticipants: event.maxParticipants || 0,
        showLeaderboard: event.showLeaderboard !== false,
        thumbnail: event.thumbnail || '',
        color: event.color || '#a855f7'
      });
    }
  }, [event]);

  if (!isAdminOrSupervisor) {
    return <Navigate to={`/events/${event?._id}`} replace />;
  }

  if (!formData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    
    // Validations
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Event end date must be strictly after the start date.');
      setSaving(false);
      return;
    }

    if (formData.registrationEnabled) {
      if (new Date(formData.registrationStart) <= new Date(formData.startDate)) {
        setError('Registration start date must be strictly after the event start date.');
        setSaving(false);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events/${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update event settings');
      }

      await fetchEvent();
      setMessage('Event settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: '2rem', fontWeight: 800 }}>Event Settings</h1>
        <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>Configure global settings, visibility, and timing for {event.title}.</p>
      </div>

      <div className="event-modal" style={{ position: 'relative', width: '100%', maxWidth: '100%', maxHeight: 'none', background: '#12141a', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'none' }}>
        {error && <div className="events-error" style={{ marginBottom: '16px' }}><AlertCircle size={16} /> {error}</div>}
        {message && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ background: '#090a0f' }} />
            </div>
            
            <div className="form-group">
              <label>Event Type *</label>
              <select value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})} required style={{ background: '#090a0f' }}>
                <option value="ctf">CTF Competition</option>
                <option value="module">Module Series</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} required style={{ background: '#090a0f' }}>
                <option value="draft">Draft (Hidden)</option>
                <option value="active">Active (Live/Upcoming)</option>
                <option value="archived">Archived (Ended)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Brand Color</label>
              <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ background: '#090a0f', height: '42px', padding: '4px' }} />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} style={{ background: '#090a0f' }}></textarea>
            </div>

            <div className="form-group">
              <label>Start Date *</label>
              <input type="datetime-local" min={currentDate} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required style={{ background: '#090a0f' }} />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input type="datetime-local" min={formData.startDate || currentDate} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required style={{ background: '#090a0f' }} />
            </div>

            <div className="form-group checkbox-group" style={{ background: '#090a0f', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ margin: 0 }}>
                <input type="checkbox" checked={formData.registrationEnabled} onChange={e => setFormData({...formData, registrationEnabled: e.target.checked})} />
                Require Registration
              </label>
            </div>
            
            <div className="form-group checkbox-group" style={{ background: '#090a0f', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ margin: 0 }}>
                <input type="checkbox" checked={formData.showLeaderboard} onChange={e => setFormData({...formData, showLeaderboard: e.target.checked})} />
                Show Public Leaderboard
              </label>
            </div>

            {formData.registrationEnabled && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ padding: '0 12px' }}>
                  <label>Registration End Type *</label>
                  <select value={formData.registrationEndType} onChange={e => setFormData({...formData, registrationEndType: e.target.value})} required style={{ background: '#090a0f' }}>
                    <option value="event_end">Till the end of the event</option>
                    <option value="specific">Specific Date & Time</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '0 12px' }}>
                  <div className="form-group">
                    <label>Registration Start Date *</label>
                    <input type="datetime-local" min={formData.startDate || currentDate} value={formData.registrationStart} onChange={e => setFormData({...formData, registrationStart: e.target.value})} required style={{ background: '#090a0f' }} />
                  </div>
                  {formData.registrationEndType === 'specific' && (
                    <div className="form-group">
                      <label>Registration End Date *</label>
                      <input type="datetime-local" min={formData.registrationStart || currentDate} value={formData.registrationEndDate} onChange={e => setFormData({...formData, registrationEndDate: e.target.value})} required style={{ background: '#090a0f' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group" style={{ padding: '0 12px' }}>
              <label>Participation Type *</label>
              <select value={formData.participationType} onChange={e => setFormData({...formData, participationType: e.target.value})} required style={{ background: '#090a0f' }}>
                <option value="solo">Single User (Solo)</option>
                <option value="team">Team Based</option>
              </select>
            </div>

            {formData.participationType === 'team' && (
              <div className="form-group" style={{ padding: '0 12px' }}>
                <label>Maximum Team Size *</label>
                <input type="number" min="1" value={formData.maxTeamSize} onChange={e => setFormData({...formData, maxTeamSize: Number(e.target.value)})} required style={{ background: '#090a0f' }} />
              </div>
            )}

            <div className="form-group" style={{ padding: '0 12px' }}>
              <label>Max Participants (0 = Unlimited)</label>
              <input type="number" min="0" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: Number(e.target.value)})} style={{ background: '#090a0f' }} />
            </div>
            
            <div className="form-group full-width">
              <label>Thumbnail / Banner URL</label>
              <input type="text" value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} placeholder="https://..." style={{ background: '#090a0f' }} />
            </div>

            <div className="form-group full-width" style={{ marginTop: '16px' }}>
              <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: formData.color, color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'filter 0.2s' }}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
