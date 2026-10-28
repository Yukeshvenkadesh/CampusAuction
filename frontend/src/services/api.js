import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const registerUser = async ({ name, email, password }) => {
  const response = await api.post('/users/register', { name, email, password });
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post('/users/login', { email, password });
  return response.data;
};

export const getListings = async (params = {}) => {
  const response = await api.get('/listings', { params });
  return response.data;
};

export const getListingById = async (id, userId) => {
  const params = userId ? { userId } : {};
  const response = await api.get(`/listings/${id}`, { params });
  return response.data;
};

export const createListing = async (listingData) => {
  const response = await api.post('/listings', listingData);
  return response.data;
};

export const updateListing = async (listingId, listingData) => {
  const response = await api.put(`/listings/${listingId}`, listingData);
  return response.data;
};

export const deleteListing = async (listingId, userId, hardDelete = false) => {
  const response = await api.delete(`/listings/${listingId}`, {
    data: { userId },
    params: { userId, hardDelete },
  });
  return response.data;
};

export const placeBid = async (listingId, { bidderId, bidderName, amount, maxAmount }) => {
  const response = await api.post(`/listings/${listingId}/bids`, {
    bidderId,
    bidderName,
    amount,
    maxAmount,
  });
  return response.data;
};

export const setProxyBid = async (listingId, { userId, maxAmount }) => {
  const response = await api.post(`/listings/${listingId}/proxy-bid`, {
    userId,
    maxAmount,
  });
  return response.data;
};

export const getProxyBid = async (listingId, userId) => {
  const response = await api.get(`/listings/${listingId}/proxy-bid/${userId}`);
  return response.data;
};

export const getBids = async (listingId) => {
  const response = await api.get(`/listings/${listingId}/bids`);
  return response.data;
};

export const askQuestion = async (listingId, { userId, question }) => {
  const response = await api.post(`/listings/${listingId}/questions`, { userId, question });
  return response.data;
};

export const answerQuestion = async (listingId, questionId, { userId, answer }) => {
  const response = await api.post(`/listings/${listingId}/questions/${questionId}/answer`, {
    userId,
    answer,
  });
  return response.data;
};

export const getQuestions = async (listingId) => {
  const response = await api.get(`/listings/${listingId}/questions`);
  return response.data;
};

export const getUserListings = async (userId) => {
  const response = await api.get(`/users/${userId}/listings`);
  return response.data;
};

export const getUserBids = async (userId) => {
  const response = await api.get(`/users/${userId}/bids`);
  return response.data;
};

export const createAlert = async ({ userId, keyword, maxPrice, category }) => {
  const response = await api.post('/alerts', { userId, keyword, maxPrice, category });
  return response.data;
};

export const getUserAlerts = async (userId) => {
  const response = await api.get(`/alerts/${userId}`);
  return response.data;
};

export const deleteAlert = async (alertId) => {
  const response = await api.delete(`/alerts/${alertId}`);
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (userId) => {
  const response = await api.put(`/notifications/read-all/${userId}`);
  return response.data;
};

export const aiFindListings = async ({ prompt, budgetLimit, userId }) => {
  const response = await api.post('/ai/find', { prompt, budgetLimit, userId });
  return response.data;
};

export const aiAutoBid = async ({ listingId, userId, maxBudget, authorized = true }) => {
  const response = await api.post('/ai/auto-bid', {
    listingId,
    userId,
    maxBudget,
    authorized,
  });
  return response.data;
};

export default api;
