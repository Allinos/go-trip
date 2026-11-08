import { get, post, put, patch, del, upload } from './client';

const APP = 'partner';

export const authApi = {
  sendOtp: (phone) => post('/auth/otp/send', { phone, app: APP }),
  verifyOtp: (phone, otp, deviceInfo) => post('/auth/otp/verify', { phone, otp, app: APP, deviceInfo }),
  me: () => get('/auth/me'),
  logout: (refreshToken, pushToken) => post('/auth/logout', { refreshToken, pushToken }),
};

export const catalogApi = {
  config: () => get('/config'),
  districts: () => get('/locations/districts'),
  searchPlaces: (q) => get('/locations/search', { q }),
  faqs: () => get('/faqs', { audience: 'partner' }),
};

export const meApi = {
  update: (body) => patch('/me', body),
  photo: (uri) => upload('/me/photo', [{ field: 'photo', uri }]),
  remove: () => del('/me'),
  registerPush: (token, platform) => post('/me/push-tokens', { token, platform, app: APP }),
  notifications: (page = 1) => get('/me/notifications', { app: APP, page }),
  unread: () => get('/me/notifications/unread-count', { app: APP }),
  markRead: (ids) => post('/me/notifications/read', { app: APP, ids }),
  tickets: () => get('/me/tickets'),
  createTicket: (body) => post('/me/tickets', { ...body, app: APP }),
};

export const partnerApi = {
  onboarding: () => get('/partner/onboarding'),
  register: (body) => post('/partner/register', body),
  profile: () => get('/partner/me'),
  updateProfile: (body) => patch('/partner/me', body),
  documents: () => get('/partner/documents'),
  uploadDocument: (docType, front, back, fields) => upload(`/partner/documents/${docType}`, [front && { field: 'front', ...front }, back && { field: 'back', ...back }].filter(Boolean), fields),
  driverProfile: () => get('/partner/driver-profile'),
  saveDriverProfile: (body) => put('/partner/driver-profile', body),
  dashboard: () => get('/partner/dashboard'),
  earnings: (period, page = 1) => get('/partner/earnings', { period, page }),
  location: () => get('/partner/location'),
  startSharing: (body) => post('/partner/location/start', body),
  sendLocation: (body) => post('/partner/location', body),
  stopSharing: () => post('/partner/location/stop'),
};

export const paymentApi = {
  list: () => get('/partner/payments'),
  createOrder: () => post('/partner/payments/registration-order'),
  verify: (body) => post('/partner/payments/verify', body),
  status: (id) => get(`/partner/payments/${id}/status`),
  failed: (id, reason) => post(`/partner/payments/${id}/failed`, { reason }),
};

export const vehicleApi = {
  list: (params) => get('/partner/vehicles', params),
  requirements: () => get('/partner/vehicles/requirements'),
  get: (id) => get(`/partner/vehicles/${id}`),
  create: (body) => post('/partner/vehicles', body),
  update: (id, body) => patch(`/partner/vehicles/${id}`, body),
  availability: (id, body) => patch(`/partner/vehicles/${id}/availability`, body),
  remove: (id) => del(`/partner/vehicles/${id}`),
  addPhotos: (id, uris) => upload(`/partner/vehicles/${id}/photos`, uris.map((uri) => ({ field: 'photos', uri }))),
  removePhoto: (id, index) => del(`/partner/vehicles/${id}/photos/${index}`),
  uploadDocument: (id, docType, front, back, fields) => upload(`/partner/vehicles/${id}/documents/${docType}`, [front && { field: 'front', ...front }, back && { field: 'back', ...back }].filter(Boolean), fields),
};

export const tripApi = {
  list: (params) => get('/partner/trips', params),
  get: (id) => get(`/partner/trips/${id}`),
  create: (body) => post('/partner/trips', body),
  update: (id, body) => patch(`/partner/trips/${id}`, body),
  returnTrip: (id, body) => post(`/partner/trips/${id}/return-trip`, body),
  bookingOpen: (id, bookingOpen) => patch(`/partner/trips/${id}/booking-open`, { bookingOpen }),
  start: (id) => post(`/partner/trips/${id}/start`),
  complete: (id) => post(`/partner/trips/${id}/complete`),
  cancel: (id, reason) => post(`/partner/trips/${id}/cancel`, { reason }),
};

export const bookingApi = {
  list: (params) => get('/partner/bookings', params),
  get: (id) => get(`/partner/bookings/${id}`),
  accept: (id) => post(`/partner/bookings/${id}/accept`),
  reject: (id, reason) => post(`/partner/bookings/${id}/reject`, { reason }),
  cancel: (id, reason) => post(`/partner/bookings/${id}/cancel`, { reason }),
};

export const goodsApi = {
  list: (params) => get('/partner/goods-orders', params),
  get: (id) => get(`/partner/goods-orders/${id}`),
};
