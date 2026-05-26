import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEvent } from '../../context/EventContext';
import { Calendar, Users, Target, BookOpen, Clock, Trophy, ChevronRight, ShieldAlert, Sparkles, UserCheck, ChevronLeft, AlertCircle, Terminal, Code, Zap, Activity, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_URL from '../../constants/api';
import './EventOverview.css';

const EventOverview = () => {
  const { user } = useAuth();
  const { event, loading, error, fetchEvent, isAdminOrSupervisor } = useEvent();
  
  // Registration states
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');
  
  // Team registration specific states
  const [teamRegMode, setTeamRegMode] = useState(null); // 'create' or 'join'
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <div className="event-spinner"></div>
    </div>
  );
  if (error || !event) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#fff', gap: '16px' }}>
      <ShieldAlert size={48} color="#ef4444" />
      <h2>Access Denied</h2>
      <p>{error || 'Event not found.'}</p>
      <Link to="/events" style={{ color: '#a855f7', textDecoration: 'none' }}>Return to Hub</Link>
    </div>
  );

  const canRegister = event.isRegistrationOpen;
  
  let registrationStatusText = 'Register Now';
  if (event.lifecycleStatus === 'past') registrationStatusText = 'Event Ended';
  else if (!event.registrationEnabled) registrationStatusText = 'Registration Disabled';
  else if (!canRegister) registrationStatusText = 'Registration Closed';

  const handleRegister = async () => {
    try {
      setRegistering(true);
      setRegError('');
      const token = localStorage.getItem('token');
      
      const payload = {
        mode: 'solo' // backend now ignores this and registers the user
      };

      const res = await fetch(`${API_URL}/api/events/${event._id}/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to register');
      }
      // Refresh event context globally
      await fetchEvent();
    } catch (err) {
      setRegError(err.message || 'Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  const handleTeamAction = async () => {
    try {
      if (teamRegMode === 'create' && !teamName.trim()) {
        setRegError('Team name is required');
        return;
      }
      
      if (teamRegMode === 'join' && !inviteCode.trim()) {
        setRegError('Invite code is required');
        return;
      }

      setRegistering(true);
      setRegError('');
      const token = localStorage.getItem('token');
      
      const payload = {
        mode: teamRegMode,
        teamName,
        inviteCode
      };

      const res = await fetch(`${API_URL}/api/events/${event._id}/team`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to process team action');
      }
      await fetchEvent();
    } catch (err) {
      setRegError(err.message || 'Failed to process team action');
    } finally {
      setRegistering(false);
    }
  };

  const startDate = new Date(event.startDate).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const endDate = new Date(event.endDate).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getStatusDisplay = () => {
    const now = new Date();
    const isStarted = new Date(event.startDate) <= now;
    const isEnded = new Date(event.endDate) <= now;

    if (event.status === 'draft') return { label: 'DRAFT', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    if (event.status === 'archived' || isEnded) return { label: 'ENDED', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    if (event.status === 'active' && !isStarted) return { label: 'UPCOMING', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    if (event.status === 'active' && isStarted) return { label: 'LIVE NOW', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    return { label: event.status.toUpperCase(), color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
  };

  const statusDisplay = getStatusDisplay();

  // Everyone must register to enter the arena from this hub
  const canAccessContent = event.isRegistered;
  const isPastEvent = event.lifecycleStatus === 'past';

  return (
    <div className="event-overview-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }}>
          <ChevronLeft size={18} /> Back to Events Hub
        </Link>
      </div>

      {/* Full-width Thumbnail Banner */}
      {event.thumbnail && (
        <div className="event-main-thumbnail">
          <img src={event.thumbnail} alt={event.title} />
        </div>
      )}

      {/* Hero Banner */}
      <div className="event-hero" style={{ borderLeft: `4px solid ${event.color || '#a855f7'}` }}>
        <div className="event-hero-content">
          <div className="event-hero-badges">
            <span style={{ backgroundColor: statusDisplay.bg, color: statusDisplay.color, border: `1px solid ${statusDisplay.color}33`, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDisplay.color, marginRight: '6px', marginBottom: '1px' }}></span>
              {statusDisplay.label}
            </span>
            <span className="event-type-badge">
              {event.eventType === 'ctf' ? <Target size={12} /> : <BookOpen size={12} />}
              {event.eventType === 'ctf' ? 'Capture The Flag' : 'Module Series'}
            </span>
          </div>

          <h1 className="event-hero-title">{event.title}</h1>
          <p className="event-hero-desc">{event.description}</p>

          <div className="event-hero-meta">
            <div className="meta-item">
              <Calendar size={14} /> <span>Starts: {startDate}</span>
            </div>
            <div className="meta-item">
              <Clock size={14} /> <span>Ends: {endDate}</span>
            </div>
            <div className="meta-item">
              <Users size={14} /> <span>{event.participantsCount || 0} Registered</span>
            </div>
          </div>
        </div>

        <div className="event-hero-action">
          {canAccessContent ? (
            <div className="event-registered-box">
              <div className="registered-success">
                <UserCheck size={20} />
                <h3>You are participating!</h3>
              </div>
              
              {event.participationType === 'team' && !event.userTeam ? (
                <div className="team-reg-options" style={{ marginTop: '16px' }}>
                  {regError && <div className="event-reg-error" style={{ marginBottom: '12px' }}><ShieldAlert size={14} /> {regError}</div>}
                  {!teamRegMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '8px' }}>You must join or create a team to compete.</p>
                      <button 
                        className="btn-register-event" 
                        onClick={() => setTeamRegMode('create')}
                        disabled={registering}
                        style={{ backgroundColor: '#2a2d36', color: '#fff' }}
                      >
                        Create a Team
                      </button>
                      <button 
                        className="btn-register-event" 
                        onClick={() => setTeamRegMode('join')}
                        disabled={registering}
                        style={{ backgroundColor: 'transparent', border: `1px solid ${event.color || '#a855f7'}`, color: event.color || '#a855f7' }}
                      >
                        Join existing Team
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {teamRegMode === 'create' ? (
                        <input 
                          type="text" 
                          placeholder="Enter your team name..." 
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="team-input"
                        />
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Enter 6-digit invite code..." 
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          className="team-input"
                        />
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-register-event" 
                          onClick={() => setTeamRegMode(null)}
                          style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '10px' }}
                        >
                          Back
                        </button>
                        <button 
                          className="btn-register-event" 
                          onClick={handleTeamAction} 
                          disabled={registering}
                          style={{ flex: 2, backgroundColor: '#2a2d36', padding: '10px' }}
                        >
                          {registering ? '...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {event.userTeam && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', marginBottom: '10px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>TEAM: <span style={{ color: '#fff', fontWeight: 'bold' }}>{event.userTeam.name}</span></div>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>INVITE CODE:</span>
                        <span style={{ color: '#00f0ff', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>{event.userTeam.inviteCode}</span>
                      </div>
                    </div>
                  )}

                  <Link 
                    to={`/events/${event._id}/arena`} 
                    className="btn-enter-competition"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    Enter {event.eventType === 'ctf' ? 'Arena' : 'Course'} <ChevronRight size={16} />
                  </Link>
                </>
              )}
            </div>
          ) : isPastEvent ? (
            <div className="event-register-box" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3>Event Concluded</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>This event has ended.</p>
              <Link 
                to={`/events/${event._id}/arena`} 
                className="btn-enter-competition"
                style={{ backgroundColor: '#10b981' }}
              >
                Enter {event.eventType === 'ctf' ? 'Arena' : 'Course'} <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="event-register-box">
              <h3>Join the Competition</h3>
              <p>Register now to secure your spot and compete against other hackers.</p>
              
              {regError && <div className="event-reg-error"><ShieldAlert size={14} /> {regError}</div>}
              
              <button 
                className="btn-register-event" 
                onClick={handleRegister} 
                disabled={!canRegister || registering}
                style={{ backgroundColor: '#2a2d36', color: '#fff', opacity: (!canRegister || registering) ? 0.5 : 1 }}
              >
                {registering ? 'Registering...' : (canRegister ? 'Register Now' : registrationStatusText)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rules Section (Timeline Design) */}
      {event.rules && Array.isArray(event.rules) && event.rules.length > 0 && (
        <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '32px', marginBottom: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
              <ShieldAlert size={20} color="#a855f7" /> Directive & Security Protocol
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
              THREAT LEVEL: CRITICAL
            </span>
          </div>

          <div style={{ position: 'relative', paddingLeft: '48px' }}>
            {/* Timeline Vertical Line */}
            <div style={{ position: 'absolute', left: '16px', top: '20px', bottom: '20px', width: '2px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {event.rules.map((rule, idx) => {
                let levelConfig = { label: 'PROTOCOL INFO', color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.1)' };
                if (rule.level === 'critical') levelConfig = { label: 'CRITICAL RESTRICTION', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
                else if (rule.level === 'warning') levelConfig = { label: 'WARNING LEVEL', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
                else if (rule.level === 'success') levelConfig = { label: 'AWARD ELIGIBLE', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };

                const getIcon = (iconName, color) => {
                  switch (iconName) {
                    case 'ShieldAlert': return <ShieldAlert size={18} color={color} />;
                    case 'Terminal': return <Terminal size={18} color={color} />;
                    case 'Code': return <Code size={18} color={color} />;
                    case 'Zap': return <Zap size={18} color={color} />;
                    case 'Activity': return <Activity size={18} color={color} />;
                    case 'Award': return <Award size={18} color={color} />;
                    case 'AlertCircle':
                    default: return <AlertCircle size={18} color={color} />;
                  }
                };

                const ruleNum = (idx + 1).toString().padStart(2, '0');

                return (
                  <div key={idx} style={{ position: 'relative' }}>
                    {/* Circle on timeline */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '-46px', // Exactly centers the 30px circle over the 2px line at left: 16px inside the 48px padded container
                      top: '12px', 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '50%', 
                      backgroundColor: '#12141a', 
                      border: `1px solid ${levelConfig.color}`,
                      color: levelConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      zIndex: 2,
                      boxShadow: `0 0 10px ${levelConfig.color}33`
                    }}>
                      {ruleNum}
                    </div>

                    {/* Rule Card */}
                    <div style={{ 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      borderRadius: '8px', 
                      padding: '20px',
                      borderLeft: `2px solid ${levelConfig.color}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                          {getIcon(rule.icon, levelConfig.color)}
                          {rule.title}
                        </h4>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: levelConfig.color, backgroundColor: levelConfig.bg, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {levelConfig.label}
                        </span>
                      </div>
                      
                      <div style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.9rem', marginBottom: '20px' }}>
                        {rule.content}
                      </div>

                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                        <span style={{ color: '#a855f7' }}>RULE_SEC_{ruleNum}</span>
                        <span>{rule.level === 'critical' || rule.level === 'warning' ? 'ENFORCED BY CTF SHIELD' : 'AUTOMATIC TELEMETRY MONITORING'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail Grid (Dynamic Features/Cards) */}
      {event.features && event.features.length > 0 && (
        <div className="event-details-grid">
          {event.features.map((feature, idx) => {
            // Optional: rotate through a few icons/colors for variety if no icon is specified
            const icons = [Trophy, Sparkles, Users, Target, BookOpen];
            const colors = ['#f59e0b', '#00f0ff', '#a855f7', '#10b981', '#ec4899'];
            const IconComponent = icons[idx % icons.length];
            const iconColor = colors[idx % colors.length];

            return (
              <div key={idx} className="event-detail-card">
                <div className="card-icon"><IconComponent size={20} color={iconColor} /></div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventOverview;
