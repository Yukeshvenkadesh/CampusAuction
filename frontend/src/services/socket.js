import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

// Initialize a shared Socket.io client instance
export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export const joinListingRoom = (listingId) => {
  if (listingId && socket.connected) {
    socket.emit('joinListing', listingId);
  }
};

export const leaveListingRoom = (listingId) => {
  if (listingId && socket.connected) {
    socket.emit('leaveListing', listingId);
  }
};

export default socket;
