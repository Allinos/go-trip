import API from './axiosConfig';

export const getFAQs = (category = '') => 
  API.get(`/support/faqs${category ? `?category=${category}` : ''}`);

export const getMyTickets = (page = 1, status = '') => 
  API.get(`/support/my-tickets?page=${page}&limit=10${status ? `&status=${status}` : ''}`);

export const createTicketApi = (data) => 
  API.post('/support', data);

export const getTicketById = (id) => 
  API.get(`/support/${id}`);

export const submitFeedbackApi = (data) => 
  API.post('/support/feedback', data);