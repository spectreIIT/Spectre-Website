import API_URL from '../constants/api';

export const activityService = {
  async getHeatmap(userId) {
    const res = await fetch(`${API_URL}/api/activity/heatmap/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch heatmap');
    return res.json();
  }
};
