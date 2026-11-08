import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setTokens: async (accessToken, refreshToken) => {
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      set({ accessToken, refreshToken });
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  setError: (error) => set({ error }),

  // Initialize auth from storage
  initialize: async () => {
    try {
      set({ isLoading: true });
      
      const [accessToken, refreshToken, userStr] = await AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
      ]);

      const token = accessToken[1];
      const refresh = refreshToken[1];
      const user = userStr[1] ? JSON.parse(userStr[1]) : null;

      if (token && user) {
        set({
          accessToken: token,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  // Send OTP
  sendOTP: async (phoneNumber) => {
    try {
      set({ error: null });
      const response = await authAPI.sendOTP(phoneNumber);
      return response;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send OTP';
      set({ error: message });
      throw error;
    }
  },

  // Verify OTP and login/register
  verifyOTP: async (phoneNumber, otpCode, userData = {}) => {
    try {
      set({ error: null });
      
      const response = await authAPI.verifyOTP(phoneNumber, otpCode, userData);
      
      const { user, tokens } = response.data;
      
      // Save to storage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('accessToken', tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', tokens.refreshToken);

      // Update state
      set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
      });

      return response;
    } catch (error) {
      const message = error.response?.data?.error || 'OTP verification failed';
      set({ error: message });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Call API to logout (optional)
      try {
        await authAPI.logout();
      } catch (err) {
        console.log('Logout API error:', err);
      }

      // Clear storage
      await AsyncStorage.multiRemove(['user', 'accessToken', 'refreshToken']);

      // Reset state
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Update user profile
  updateUser: async (updates) => {
    try {
      const updatedUser = { ...get().user, ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
