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

export const getListingById = async (id) => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

export const createListing = async (listingData) => {
  const response = await api.post('/listings', listingData);
  return response.data;
};

export const placeBid = async (listingId, { bidderId, bidderName, amount }) => {
  const response = await api.post(`/listings/${listingId}/bids`, {
    bidderId,
    bidderName,
    amount,
  });
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

export default api;
