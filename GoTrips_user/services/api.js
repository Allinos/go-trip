import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          await AsyncStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // Navigate to login (will be handled by auth store)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Methods
export const authAPI = {
  sendOTP: (phoneNumber) => 
    api.post('/api/auth/send-otp', { phoneNumber }),
  
  verifyOTP: (phoneNumber, otpCode, userData = {}) => 
    api.post('/api/auth/verify-otp', { 
      phoneNumber, 
      otpCode,
      ...userData 
    }),
  
  logout: (deviceToken) => 
    api.post('/api/auth/logout', { deviceToken }),
};

export const rideAPI = {
  search: (params) => 
    api.get('/api/rides/search', { params }),
  
  getById: (id) => 
    api.get(`/api/rides/${id}`),
  
  book: (id, data) => 
    api.post(`/api/rides/${id}/book`, data),
  
  getMyBookings: (params) => 
    api.get('/api/rides/my-bookings', { params }),
  
  cancelBooking: (id, reason) => 
    api.post(`/api/rides/bookings/${id}/cancel`, { cancellationReason: reason }),
};

export const rentalAPI = {
  search: (params) => 
    api.get('/api/rentals/search', { params }),
  
  getVehicle: (id) => 
    api.get(`/api/vehicles/${id}`),
  
  book: (id, data) => 
    api.post(`/api/rentals/${id}/book`, data),
  
  getMyRentals: (params) => 
    api.get('/api/rentals/my-bookings', { params }),
};

export const marketplaceAPI = {
  searchDrivers: (params) => 
    api.get('/api/marketplace/search-drivers', { params }),
  
  getDriverProfile: (id) => 
    api.get(`/api/marketplace/driver/${id}`),
  
  unlockDriver: (id) => 
    api.post(`/api/marketplace/unlock-driver/${id}`),
  
  verifyUnlock: (id, paymentData) => 
    api.post(`/api/marketplace/verify-unlock/${id}`, paymentData),
  
  getMyUnlocks: (params) => 
    api.get('/api/marketplace/my-unlocked-drivers', { params }),
};

export const userAPI = {
  getProfile: () => 
    api.get('/api/users/profile'),
  
  updateProfile: (data) => 
    api.put('/api/users/profile', data),
  
  uploadPhoto: (formData) => 
    api.post('/api/users/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getSavedLocations: () => 
    api.get('/api/users/saved-locations'),
  
  addSavedLocation: (data) => 
    api.post('/api/users/saved-locations', data),
  
  updateSavedLocation: (id, data) => 
    api.put(`/api/users/saved-locations/${id}`, data),
  
  deleteSavedLocation: (id) => 
    api.delete(`/api/users/saved-locations/${id}`),
};

export const locationAPI = {
  getAll: (params) => 
    api.get('/api/locations', { params }),
  
  search: (query) => 
    api.get('/api/locations/search', { params: { query } }),
};

export const notificationAPI = {
  registerDevice: (deviceToken, deviceType) => 
    api.post('/api/notifications/register-device', { deviceToken, deviceType }),
  
  getAll: (params) => 
    api.get('/api/notifications', { params }),
  
  markAsRead: (id) => 
    api.put(`/api/notifications/${id}/read`),
  
  markAllAsRead: () => 
    api.put('/api/notifications/read-all'),
};

export const paymentAPI = {
  createOrder: (data) => 
    api.post('/api/payments/create-order', data),
  
  verifyPayment: (data) => 
    api.post('/api/payments/verify', data),
  
  getHistory: (params) => 
    api.get('/api/payments/my-payments', { params }),
};

export default api;
