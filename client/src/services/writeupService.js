import API_URL from '../constants/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const writeupService = {
  async getWriteups() {
    const res = await fetch(`${API_URL}/api/writeups`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch writeups');
    return res.json();
  },

  async getWriteup(id) {
    const res = await fetch(`${API_URL}/api/writeups/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch writeup details');
    return res.json();
  },

  async createWriteup(payload) {
    const res = await fetch(`${API_URL}/api/writeups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { res, data };
  },

  async deleteWriteup(id) {
    const res = await fetch(`${API_URL}/api/writeups/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    return { res, data };
  }
};
