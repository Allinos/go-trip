import API from "./axiosConfig"; // Your base axios instance

export const notificationAPI = {
  // Register device for push notifications
  registerDevice: (deviceToken, deviceType) =>
    API.post("/notifications/register-device", { deviceToken, deviceType }),

  // Get all notifications
  getNotifications: (params) => API.get("/notifications", { params }),

  // Get unread count
  getUnreadCount: () => API.get("/notifications/unread-count"),

  // Mark notification as read
  markAsRead: (id) => API.put(`/notifications/${id}/read`),

  // Mark all as read
  markAllAsRead: () => API.put("/notifications/read-all"),

  // Delete notification
  deleteNotification: (id) => API.delete(`/notifications/${id}`),

  // Get notification settings
  getSettings: () => API.get("/notifications/settings"),

  // Update notification settings
  updateSettings: (settings) =>
    API.put("/notifications/settings", settings),
};
