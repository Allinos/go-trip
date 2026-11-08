import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Pull the URL from your .env (EXPO_PUBLIC_API_URL)
// Remember: Use http://10.0.2.2:3000 for Android Emulator in .env
// const baseURL = process.env.EXPO_PUBLIC_API_URL;
const baseURL = 'http://10.0.2.2:3000/api/v1';

const API = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * REQUEST INTERCEPTOR
 * Automatically attaches the 'accessToken' to every outgoing request
 */
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken') 
    // || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwicGhvbmVOdW1iZXIiOiIrOTE5NDAxMDY5MzM3IiwidXNlclR5cGUiOiJwYXNzZW5nZXIiLCJpYXQiOjE3ODE3MDAzOTAsImV4cCI6MTc4Mjk5NjM5MH0.rvJ2zOjfTvq2d6E51sX8LTMy8pW8X3y9m9PG9NFPwZ8';
    // console.log('Axios Config: Retrieved token:', token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Axios Config: Error fetching token", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles global errors like 401 (Unauthorized)
 */
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If the server returns 401, the token might be expired
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or unauthorized. Logging out...");
      
      // Optional: Clear storage and trigger a logout
      await AsyncStorage.multiRemove(['accessToken', 'user']);
      
      // Note: To navigate to Login here, you'd typically use a 
      // NavigationRef or let your AuthContext state change handle it.
    }
    return Promise.reject(error);
  }
);

export default API;