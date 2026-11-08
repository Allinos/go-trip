import API from "./axiosConfig";
export const partnerProfileAPI = {
  registerPartner: (data) =>
    API.post("/partners/register", data, {
      headers: { "Content-Type": "application/json" },
    }),
  // Get partner profile
  getProfile: (data) =>
    // API.get('/partners/profile'),
    API.get("/partners/" + data),

  getProfileByUserId: (UserId) => API.get(`/partners/user/${UserId}`),

  // Update partner profile
  updateProfile: (data) => API.put("/partners/profile", data),

  // Upload profile photo
  uploadPhoto: (formData) =>
    API.post("/partners/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Upload documents (license, registration, insurance)
  uploadDocuments: (formData, partnerId) =>
    API.post(`/partners/${partnerId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Get verification status
  getVerificationStatus: () => API.get("/partners/verification-status"),

  // Toggle online/offline status
  toggleOnlineStatus: (isOnline, partnerId) =>
    API.put(`/partners/${partnerId}/status/update`, { isOnline: isOnline }),

  // Update location
  updateLocation: (latitude, longitude) =>
    API.put("/partners/location", {
      lastLatitude: latitude,
      lastLongitude: longitude,
    }),

  getStats: (partnerId) => API.get(`/partners/${partnerId}/stats`),
};
