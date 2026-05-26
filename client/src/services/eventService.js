import API_URL from '../constants/api';

export const eventService = {
  // Upcoming events (date >= now), sorted by date ASC
  async getUpcoming() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return res.json();
  },

  // Currently live/active event for the sidebar promo card
  async getActive() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  },

  // Create event (requires Supervisor+ token)
  async createEvent({ title, description, date, isActive }) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, date, isActive }),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  // Update event (requires Supervisor+ token)
  async updateEvent(id, updates) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
  },

  // Delete event (requires Supervisor+ token)
  async deleteEvent(id) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete event');
    return res.json();
  },
};
