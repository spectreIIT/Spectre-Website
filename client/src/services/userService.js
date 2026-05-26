import API_URL from '../constants/api';

export const userService = {
  async getLeaderboard() {
    const res = await fetch(`${API_URL}/api/users/leaderboard`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_URL}/api/users/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getUserProfile() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/users/me/profile`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }
};
