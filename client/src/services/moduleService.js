import API_URL from '../constants/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const moduleService = {
  async getModules() {
    const res = await fetch(`${API_URL}/api/modules`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch modules');
    return res.json();
  },

  async getModule(id) {
    const res = await fetch(`${API_URL}/api/modules/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch module');
    return res.json();
  },

  async getMyProgress() {
    const res = await fetch(`${API_URL}/api/modules/my-progress`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getAllProgress() {
    const res = await fetch(`${API_URL}/api/modules/progress/all`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async completeSection(moduleId, sectionIndex) {
    const res = await fetch(`${API_URL}/api/modules/${moduleId}/progress/section`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sectionIndex })
    });
    if (!res.ok) throw new Error('Failed to mark section complete');
    return res.json();
  },

  async completeQuiz(moduleId, quizIndex, score) {
    const res = await fetch(`${API_URL}/api/modules/${moduleId}/progress/quiz`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ quizIndex, score })
    });
    if (!res.ok) throw new Error('Failed to submit quiz score');
    return res.json();
  }
};
