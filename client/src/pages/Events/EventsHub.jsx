import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Lock, Unlock } from 'lucide-react';
import API_URL from '../../constants/api';
import { useSearch } from '../../context/SearchContext';
import './EventsHub.css';

const EventsHub = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const { searchQuery } = useSearch();

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (e.title && e.title.toLowerCase().includes(lowerQuery)) ||
      (e.description && e.description.toLowerCase().includes(lowerQuery)) ||
      (e.eventType && e.eventType.toLowerCase().includes(lowerQuery))
    );
  });

  const activeEvents = filteredEvents.filter(e => e.lifecycleStatus === 'active');
  const upcomingEvents = filteredEvents.filter(e => e.lifecycleStatus === 'upcoming');
  const pastEvents = filteredEvents.filter(e => e.lifecycleStatus === 'past');

  const getEventTypeLabel = (event) => {
    if (event.eventType === 'ctf') return 'GLOBAL CYBER OPERATIONS';
    return event.title.toLowerCase().includes('hardware') ? 'HARDWARE LAB' : 'CORE TRAINING';
  };

  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'TBD';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffHours = Math.round(diffTime / (1000 * 60 * 60));
    if (diffHours >= 24 && diffHours % 24 === 0) {
      return `${diffHours / 24} Days`;
    }
    return `${diffHours} Hours`;
  };

  const getStartsIn = (startDate) => {
    if (!startDate) return 'TBA';
    const now = new Date();
    const start = new Date(startDate);
    if (start <= now) return 'Started';
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const diffTime = targetDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Starts Tomorrow';
    if (diffDays > 1) return `Starts in ${diffDays} days`;
    
    const diffHours = Math.round((start - now) / (1000 * 60 * 60));
    return `Starts in ${diffHours} hours`;
  };

  const isRegistrationStarted = (event) => {
    if (!event.registrationEnabled) return false;
    if (event.registrationStart) {
      return new Date() >= new Date(event.registrationStart);
    }
    return true; 
  };

  const LiveTimer = ({ targetDate, prefix }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!targetDate) {
        setTimeLeft('TBA');
        return;
      }
      const updateTimer = () => {
        const now = new Date();
        const target = new Date(targetDate);
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft('Ended');
          return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        setTimeLeft(`${h}h ${m}m ${s}s`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [targetDate]);

    if (timeLeft === 'Ended') return <span>Ended</span>;
    if (timeLeft === 'TBA') return <span>{prefix} TBA</span>;
    return <span>{prefix} {timeLeft}</span>;
  };

  const ActiveEventCard = ({ event }) => {
    return (
      <div className="active-event-card" onClick={() => navigate(`/events/${event._id}`)}>
        <div className="active-event-image-container">
          {event.thumbnail ? (
            <img src={event.thumbnail} alt={event.title} />
          ) : (
            <div className={`event-placeholder-bg ${event.eventType}`}>
              {event.eventType === 'ctf' ? <Trophy size={48} /> : <Calendar size={48} />}
            </div>
          )}
          <div className="live-now-badge">
            <span className="live-dot"></span> LIVE NOW
          </div>
        </div>
        <div className="active-event-content">
          <div className="event-type-label">
            {getEventTypeLabel(event)}
          </div>
          <h2 className="active-event-title">{event.title}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.95rem', marginBottom: '16px', fontWeight: 500 }}>
            <span>📅 {new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span style={{ marginLeft: '12px' }}>⏱️ {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <p className="active-event-desc" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{event.description || 'No description provided.'}</p>
          
          <div className="active-event-grid">
            <div className="grid-item">
              <span className="grid-label">DURATION</span>
              <span className="grid-value">{getDuration(event.startDate, event.endDate)}</span>
            </div>
            <div className="grid-item">
              <span className="grid-label">{event.participationType === 'team' ? 'TEAM SIZE' : 'TYPE'}</span>
              <span className="grid-value highlight-green">
                {event.participationType === 'team' ? `Max ${event.maxTeamSize} per team` : 'Solo Event'}
              </span>
            </div>
            <div className="grid-item">
              <span className="grid-label">PARTICIPANTS</span>
              <span className="grid-value">
                {event.participantsCount || 0} Registered
              </span>
            </div>
            <div className="grid-item">
              <span className="grid-label">STATUS</span>
              <span className={`grid-value ${event.isRegistered ? 'highlight-purple' : 'highlight-green'}`}>
                {event.isRegistered ? 'Enrolled' : 'Registration Open'}
              </span>
            </div>
          </div>

          <div className="active-event-footer">
            <div className="ends-in-timer">
              <span style={{ fontSize: '1rem' }}>⏱️</span>
              <LiveTimer targetDate={event.endDate} prefix="Ends in:" />
            </div>
            <button className="enter-arena-btn">
              Enter Arena <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UpcomingEventCard = ({ event }) => {
    const isRegistered = event.isRegistered;

    return (
      <div className="upcoming-event-card" onClick={() => navigate(`/events/${event._id}`)}>
        <div className="upcoming-event-banner">
          {event.thumbnail ? (
            <img src={event.thumbnail} alt={event.title} />
          ) : (
            <div className={`event-placeholder-bg ${event.eventType}`}>
              {event.eventType === 'ctf' ? <Trophy size={48} /> : <div style={{ fontSize: '48px' }}>📅</div>}
            </div>
          )}
          <div className="starts-in-badge">
            <span>⏱️ {getStartsIn(event.startDate)}</span>
          </div>
        </div>
        
        <div className="upcoming-event-content">
          <div className="upcoming-event-meta-top">
            <span className="event-type-label">
              {getEventTypeLabel(event)}
            </span>
            {event.isPublic ? <Unlock size={16} className="event-access public" /> : <Lock size={16} className="event-access private" />}
          </div>
          
          <h3 className="upcoming-event-title">{event.title}</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 500 }}>
            <span>📅 {new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span style={{ marginLeft: '8px' }}>⏱️ {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <p className="upcoming-event-desc" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{event.description || 'No description provided.'}</p>
          
          <div className="upcoming-event-footer">
            <div className="registered-count">
              <span style={{ fontSize: '1.1rem' }}>👥</span>
              <span>{event.participantsCount || 0} Registered</span>
            </div>
            {isRegistered ? (
              <button className="register-btn registered" onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}>
                Registered
              </button>
            ) : isRegistrationStarted(event) ? (
              <button className="register-btn" onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}>
                Register
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };
  const PastEventCard = ({ event }) => {
    return (
      <div className="upcoming-event-card past-event" onClick={() => navigate(`/events/${event._id}`)} style={{ opacity: 0.7 }}>
        <div className="upcoming-event-banner" style={{ filter: 'grayscale(0.6)' }}>
          {event.thumbnail ? (
            <img src={event.thumbnail} alt={event.title} />
          ) : (
            <div className={`event-placeholder-bg ${event.eventType}`}>
              {event.eventType === 'ctf' ? <Trophy size={48} /> : <div style={{ fontSize: '48px' }}>📅</div>}
            </div>
          )}
          <div className="starts-in-badge" style={{ backgroundColor: '#475569', color: '#fff' }}>
            <span>⏱️ Ended</span>
          </div>
        </div>
        
        <div className="upcoming-event-content">
          <div className="upcoming-event-meta-top">
            <span className="event-type-label" style={{ color: '#94a3b8' }}>
              {getEventTypeLabel(event)}
            </span>
          </div>
          
          <h3 className="upcoming-event-title">{event.title}</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 500 }}>
            <span>📅 {new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span style={{ marginLeft: '8px' }}>⏱️ {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <p className="upcoming-event-desc" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{event.description || 'No description provided.'}</p>
          
          <div className="upcoming-event-footer">
            <div className="registered-count">
              <span style={{ fontSize: '1.1rem' }}>👥</span>
              <span>{event.participantsCount || 0} Participated</span>
            </div>
            <button className="register-btn" style={{ backgroundColor: '#334155', color: '#cbd5e1' }} onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}>
              View Results
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="events-hub-loading">Loading events...</div>;
  }

  return (
    <div className="events-hub-container">
      <div className="events-hub-header">
        <div className="header-content">
          <h1>Events</h1>
          <p>Participate in live cyber warfare simulations, timed target trials, and global offensive CTF matches.</p>
        </div>
      </div>

      <div className="events-section active-events-section">
        <h2 className="section-title">
          Active Events <span className="count-badge">{activeEvents.length} Live</span>
        </h2>
        {activeEvents.length === 0 ? (
          <div className="empty-state">No live events at the moment.</div>
        ) : (
          <div className="active-events-list">
            {activeEvents.map(event => <ActiveEventCard key={event._id} event={event} />)}
          </div>
        )}
      </div>

      {upcomingEvents.length > 0 && (
        <div className="events-section">
          <h2 className="section-title">
            Upcoming Events <span className="count-badge upcoming">{upcomingEvents.length} Scheduled</span>
          </h2>
          <div className="upcoming-events-grid">
            {upcomingEvents.map(event => <UpcomingEventCard key={event._id} event={event} />)}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="events-section">
          <h2 className="section-title">
            Past Events <span className="count-badge" style={{ backgroundColor: '#475569', color: '#e2e8f0' }}>{pastEvents.length} Archived</span>
          </h2>
          <div className="upcoming-events-grid">
            {pastEvents.map(event => <PastEventCard key={event._id} event={event} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsHub;
