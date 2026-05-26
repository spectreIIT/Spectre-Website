import API_URL from '../constants/api';

// Currently placeholder, wait for backend routes for challenges
export const getChallenges = async () => {
  const res = await fetch(`${API_URL}/api/challenges`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error('Failed to fetch challenges');
  return res.json();
};

export const submitFlag = async (id, flag, hintsUsed = []) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/challenges/${id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ flag, hintsUsed })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Submission failed');
  return data;
};

export const likeChallenge = async (id) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/challenges/${id}/like`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to like challenge');
  return data;
};

export const fetchChallengeLeaderboard = async (id) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/challenges/${id}/leaderboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch challenge leaderboard');
  return res.json();
};
