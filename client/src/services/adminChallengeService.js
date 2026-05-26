import API_URL from '../constants/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const fetchAdminChallenges = async () => {
  const res = await fetch(`${API_URL}/api/admin/challenges`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch challenges');
  return res.json();
};

export const createAdminChallenge = async (data) => {
  const res = await fetch(`${API_URL}/api/admin/challenges`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create challenge');
  }
  return res.json();
};

export const updateAdminChallenge = async (id, data) => {
  const res = await fetch(`${API_URL}/api/admin/challenges/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to update challenge');
  }
  return res.json();
};

export const deleteAdminChallenge = async (id) => {
  const res = await fetch(`${API_URL}/api/admin/challenges/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete challenge');
  }
  return res.json();
};

export const fetchChallengeSolves = async (id) => {
  const res = await fetch(`${API_URL}/api/admin/challenges/${id}/solves`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch solves');
  return res.json();
};

export const fetchChallengeAnalytics = async (id) => {
  const res = await fetch(`${API_URL}/api/admin/challenges/${id}/analytics`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch challenge analytics');
  return res.json();
};
