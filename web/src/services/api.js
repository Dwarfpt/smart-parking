// HTTP-клиент (Axios) — все API-вызовы, перехват 401, refresh токен
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Перехватчик — добавляем JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Перехватчик — автоматический refresh при 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Если это уже refresh-запрос или логин/регистрация — не пытаемся
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// — Авторизация —
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  googleAuth: (data) => api.post('/auth/google', data),
};

// — Пользователи —
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
  topUp: (amount) => api.post('/users/topup', { amount }),
  getBalance: () => api.get('/users/balance'),
  getTransactions: (page = 1) => api.get(`/users/transactions?page=${page}`),
};

// — Парковки —
export const parkingAPI = {
  getAll: (params) => api.get('/parking', { params }),
  getOne: (id) => api.get(`/parking/${id}`),
  getSpots: (id) => api.get(`/parking/${id}/spots`),
};

// — Бронирования —
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  createSubscription: (data) => api.post('/bookings/subscription', data),
  getMy: (params) => api.get('/bookings/my', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  validateQR: (qrToken) => api.get(`/bookings/validate/${qrToken}`),
};

// — Тарифы —
export const tariffAPI = {
  getAll: (parkingLotId) => api.get('/tariffs', { params: { parkingLotId } }),
  getOne: (id) => api.get(`/tariffs/${id}`),
  create: (data) => api.post('/tariffs', data),
  update: (id, data) => api.put(`/tariffs/${id}`, data),
  delete: (id) => api.delete(`/tariffs/${id}`),
};

// — Поддержка —
export const supportAPI = {
  createTicket: (data) => api.post('/support', data),
  getMyTickets: (status) => api.get('/support/my', { params: { status } }),
  getTicket: (id) => api.get(`/support/${id}`),
  addMessage: (id, text) => api.post(`/support/${id}/message`, { text }),
  closeTicket: (id) => api.put(`/support/${id}/close`),
  // Админ
  getAllTickets: (params) => api.get('/support/all', { params }),
};

// — Администрирование —
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  creditUser: (id, amount, description) =>
    api.post(`/admin/users/${id}/credit`, { amount, description }),
  createParking: (data) => api.post('/admin/parking', data),
  updateParking: (id, data) => api.put(`/admin/parking/${id}`, data),
  deleteParking: (id) => api.delete(`/admin/parking/${id}`),
  getDevices: () => api.get('/admin/devices'),
  getBookings: (params) => api.get('/admin/bookings', { params }),
};

export default api;
