import React from 'react';
import { useEvent } from '../../context/EventContext';
import ReviewPanel from '../../components/writeups/ReviewPanel';
import { useLocation } from 'react-router-dom';

export default function EventWriteups() {
  const { event } = useEvent();
  const location = useLocation();
  const isAdminOrSupervisorView = location.pathname.includes('/admin/events') || location.pathname.includes('/supervisor/events');
  
  if (!isAdminOrSupervisorView) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Access Denied</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <ReviewPanel eventId={event._id} />
    </div>
  );
}
