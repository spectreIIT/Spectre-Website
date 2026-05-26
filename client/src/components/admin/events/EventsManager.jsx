import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../../../services/eventService';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Plus, Trash2, Edit, AlertCircle, ArrowRight } from 'lucide-react';
import API_URL from '../../../constants/api';
import './EventsManager.css';

export default function EventsManager({ readOnly = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [eventToDelete, setEventToDelete] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const rolePath = user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
    navigate(`/${rolePath}/events/new`);
  };

  const handleEditClick = (event) => {
    const rolePath = user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
    navigate(`/${rolePath}/events/edit/${event._id}`);
  };

  const handleDeleteClick = (event) => {
    setEventToDelete(event);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events/${eventToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete event');
      
      setEvents(events.filter(e => e._id !== eventToDelete._id));
      setEventToDelete(null);
    } catch (err) {
      setError(err.message);
      setEventToDelete(null);
    }
  };

  return (
    <div className="events-manager">
      <div className="events-manager-header">
        <div>
          <h3>Manage Events</h3>
          <p>Create and configure CTF competitions or Module series.</p>
        </div>
        {!readOnly && (
          <button className="btn-create-event" onClick={handleCreateNew}>
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {error && <div className="events-error"><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <div className="events-loading">Loading events...</div>
      ) : (
        <div className="events-table-container">
          <table className="events-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="6" className="events-empty">No events found.</td></tr>
              ) : (
                events.map(event => (
                  <tr key={event._id}>
                    <td className="event-title-cell">{event.title}</td>
                    <td><span className={`type-badge ${event.eventType}`}>{event.eventType.toUpperCase()}</span></td>
                    <td><span className={`status-badge ${event.status}`}>{event.status.toUpperCase()}</span></td>
                    <td>{new Date(event.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{new Date(event.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="event-actions">
                      <button 
                        className="action-btn edit" 
                        onClick={() => navigate(`/${user?.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin'}/events/${event._id}`)} 
                        title="Manage Event" 
                        style={{ color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', padding: '6px 12px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '6px' }}
                      >
                        Enter <ArrowRight size={14} />
                      </button>
                      {!readOnly && (
                        <>
                          <button className="action-btn edit" onClick={() => handleEditClick(event)} title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="action-btn delete" onClick={() => handleDeleteClick(event)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="event-modal-overlay">
          <div className="event-modal" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '16px' }}>
              <AlertCircle size={24} />
              <h2 style={{ margin: 0, color: '#ef4444', border: 'none', padding: 0 }}>Delete Event?</h2>
            </div>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete the event <strong>{eventToDelete.title}</strong>? This action cannot be undone and will delete all associated event data.
            </p>
            <div className="modal-actions" style={{ marginTop: '0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setEventToDelete(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDelete}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Yes, Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
