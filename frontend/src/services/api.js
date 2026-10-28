import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getListings = async (params = {}) => {
  try {
    const response = await api.get('/listings', { params });
    return response.data;
  } catch (error) {
    console.warn('API error or server offline, using fallback data if needed:', error.message);
    throw error;
  }
};

export const getListingById = async (id) => {
  try {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  } catch (error) {
    console.warn(`Error fetching listing ${id}:`, error.message);
    throw error;
  }
};

export const createListing = async (listingData) => {
  const response = await api.post('/listings', listingData);
  return response.data;
};

export const placeBid = async (listingId, { bidderId, amount }) => {
  const response = await api.post(`/listings/${listingId}/bids`, { bidderId, amount });
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

export const getQuestions = async (listingId) => {
  const response = await api.get(`/listings/${listingId}/questions`);
  return response.data;
};

export default api;
