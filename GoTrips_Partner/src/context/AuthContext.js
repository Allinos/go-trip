import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  const login = async (userData) => {
    console.log('AuthContext Login:', userData);
    try {
      await AsyncStorage.setItem("accessToken", userData.data.accessToken);
      await AsyncStorage.setItem("user", JSON.stringify(userData.data.user));
      setUser(userData.data.user);
      setIsLoggedIn(true);
      
      if(userData.data.partner) {
        await AsyncStorage.setItem("partner", JSON.stringify(userData.data.partner));
        setPartner(userData.data.partner);
      }

      const hasCompletedProfile = userData.data.user?.profileFilled || false;
      setIsProfileCompleted(hasCompletedProfile);
      await AsyncStorage.setItem("isProfileCompleted", JSON.stringify(hasCompletedProfile));

    } catch (error) {
      console.log('Failed to save auth data: ' + error);
    }
  };

  const completeProfile = async (updatedUser) => {
    try {
      setIsProfileCompleted(true);
      await AsyncStorage.setItem("isProfileCompleted", "true");
      
      if (updatedUser) {
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.log('Failed to update profile completion status: ' + error);
    }
  };

  // NEW METHOD: Call this right after a successful partner registration API call
  const updatePartnerData = async (partnerData) => {
    try {
      if (partnerData) {
        setPartner(partnerData);
        await AsyncStorage.setItem("partner", JSON.stringify(partnerData));
        console.log("Global partner state synchronized successfully.");
      }
    } catch (error) {
      console.log('Failed to update partner data globally: ' + error);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("isProfileCompleted"); 
    setIsLoggedIn(false);
    setUser(null);
    setIsProfileCompleted(false);
    
    await AsyncStorage.removeItem("partner");
    setPartner(null);
  };

  return (
    // Expose updatePartnerData to your context consumers
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      setIsLoggedIn, 
      user, 
      partner,
      isProfileCompleted, 
      setIsProfileCompleted, 
      login, 
      completeProfile, 
      updatePartnerData, // Added here
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};