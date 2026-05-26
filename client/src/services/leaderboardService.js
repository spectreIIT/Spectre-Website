import API_URL from '../constants/api';

export const getLeaderboard = async () => {
  const res = await fetch(`${API_URL}/api/users/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
};
