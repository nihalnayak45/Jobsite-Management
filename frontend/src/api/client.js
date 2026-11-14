import axios from 'axios';

// Base URL precedence: REACT_APP_API_URL or VITE_API_URL or relative '/api'
const baseURL =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  '/api';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach token from localStorage/sessionStorage
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jms_token') || sessionStorage.getItem('jms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized gracefully
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on login or auth/me check failure if already logging in
      const isAuthCheck = error.config && error.config.url && error.config.url.includes('/auth/me');
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
      
      localStorage.removeItem('jms_token');
      localStorage.removeItem('jms_user');
      sessionStorage.removeItem('jms_token');
      sessionStorage.removeItem('jms_user');

      if (!isAuthCheck && !isLoginRequest && window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
