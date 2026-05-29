import axios from 'axios';
import API_URL from '../constants/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent retry loop for /auth/refresh and /auth/login
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const res = await api.post('/api/auth/refresh');
        const { token, expiresIn } = res.data;
        
        localStorage.setItem('token', token);
        if (expiresIn) {
          localStorage.setItem('tokenExpiry', (Date.now() + expiresIn * 1000).toString());
        }
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiry');
        window.dispatchEvent(new Event('storage'));
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
