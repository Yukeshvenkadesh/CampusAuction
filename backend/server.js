const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const auctionRoutes = require('./routes/auctionRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to Express route handlers via req.app.get('io')
app.set('io', io);

// Socket.io connection and room handling
io.on('connection', (socket) => {
  console.log(`⚡ Client connected to socket: ${socket.id}`);

  // Client joins a specific listing room
  socket.on('joinListing', (listingId) => {
    if (listingId) {
      const room = listingId.toString();
      socket.join(room);
      console.log(`Client ${socket.id} joined listing room: ${room}`);
    }
  });

  // Client leaves a listing room
  socket.on('leaveListing', (listingId) => {
    if (listingId) {
      const room = listingId.toString();
      socket.leave(room);
      console.log(`Client ${socket.id} left listing room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Campus Auction API is running...');
});

// Register auction API routes under /api
app.use('/api', auctionRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
