import React, { createContext, useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../constants/api';
import AuthContext from './AuthContext';

const EventContext = createContext();

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Event not found');
        if (res.status === 403) throw new Error('You do not have access to this event');
        throw new Error('Failed to fetch event');
      }
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const isAdminOrSupervisor = user?.role === 'Admin' || user?.role === 'Supervisor';
  const isRegistered = event?.isRegistered || false;

  return (
    <EventContext.Provider value={{ event, loading, error, fetchEvent, isAdminOrSupervisor, isRegistered }}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext;
