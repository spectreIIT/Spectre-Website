import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useEvent } from '../../context/EventContext';
import { ShieldAlert } from 'lucide-react';

export default function EventAccessGuard({ children }) {
  const { event, loading, error, isAdminOrSupervisor } = useEvent();
  const { eventId } = useParams();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#fff' }}>
        <div className="event-spinner"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#fff', gap: '16px' }}>
        <ShieldAlert size={48} color="#ef4444" />
        <h2>Access Denied</h2>
        <p>{error || 'Event not found.'}</p>
        <a href="/events" style={{ color: '#a855f7', textDecoration: 'none' }}>Return to Hub</a>
      </div>
    );
  }

  if (isAdminOrSupervisor) {
    return children ? children : <Outlet />;
  }

  if (!event.isRegistered) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  if (event.participationType === 'team' && !event.userTeam) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  return children ? children : <Outlet />;
}
