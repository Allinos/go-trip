import API from './axiosConfig'; // Your axios instance

/**
 * AUTHENTICATION APIS
 */

// Check if user exists
export const checkPhone = async (phoneNumber) => {
  return API.post("/auth/check-phone", { phoneNumber });
};

// Send OTP for Login/Signup
export const sendOTPApi = async (phoneNumber) => {
  return API.post("/auth/send-otp", {
    phoneNumber,
    countryCode: "+91",
    otpType: "login",
  });
};

export const sendSignUpOTPApi = async (phoneNumber) => {
  return API.post("/auth/send-otp", {
    phoneNumber,
    countryCode: "+91",
    otpType: "signup",
  });
};

// Verify OTP
export const verifyOTPApi = async (phoneNumber, otp) => {
  return API.post("/auth/verify-otp", {
    phoneNumber,
    countryCode: "+91",
    otp,
    // deviceType: Platform.OS, // Good for tracking logins
    // deviceToken: "fcm_token_here", // If using notifications
  });
};

// Resend OTP
export const resendOTPApi = async (phoneNumber) => {
  return API.post("/auth/resend-otp", {
    phoneNumber,
    countryCode: "+91",
  });
};

// Refresh Access Token
export const refreshTokenApi = async (refreshToken) => {
  return API.post("/auth/refresh-token", { refreshToken });
};

// Logout
export const logoutApi = async (deviceToken) => {
  return API.post("/auth/logout", { deviceToken });
};

/**
 * USER PROFILE APIS
 */

// Get current user profile data
export const getMeApi = async () => {
  return API.get("/auth/me");
};

// Update Profile Details (Name, Email, DOB, Gender)
export const updateProfileApi = async (profileData) => {
  // profileData: { fullName, email, dateOfBirth, gender }
  return API.put("/auth/profile", profileData);
};

// Update Profile Photo
export const updateProfilePhotoApi = async (formData) => {
  // formData must contain the 'profilePhoto' file
  return API.post("/auth/profile-photo", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};