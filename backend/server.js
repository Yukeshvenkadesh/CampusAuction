const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

// Configure reliable DNS servers to ensure MongoDB Atlas SRV record lookups succeed across all networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fallback to system DNS if custom resolver is unavailable
}

// Load .env from project root and current working directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const auctionRoutes = require('./routes/auctionRoutes');
const aiAgentRoutes = require('./routes/aiAgentRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`⚡ Client connected to socket: ${socket.id}`);

  socket.on('joinListing', (listingId) => {
    if (listingId) {
      const room = listingId.toString();
      socket.join(room);
      console.log(`Client ${socket.id} joined listing room: ${room}`);
    }
  });

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
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    message: 'Campus Auction API is running...',
    database: states[dbState] || 'unknown',
  });
});

// Register auction API routes under /api
app.use('/api', auctionRoutes);
app.use('/api', aiAgentRoutes);

const PORT = process.env.PORT || 5001;

// Normalize and validate MONGO_URI
let rawUri = process.env.MONGO_URI;

if (!rawUri) {
  console.error('\n❌ ERROR: MONGO_URI is missing from your .env file!');
  console.error('Please configure MONGO_URI in your .env file.\n');
} else {
  // If pointing to MongoDB Atlas (*.mongodb.net) and mistakenly using mongodb:// instead of mongodb+srv://
  if (rawUri.includes('.mongodb.net') && rawUri.startsWith('mongodb://')) {
    console.warn('⚠️ Notice: Automatically updating Atlas URI prefix from mongodb:// to mongodb+srv://');
    rawUri = rawUri.replace('mongodb://', 'mongodb+srv://');
  }
}

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected Successfully!');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected.');
});

// Connect to MongoDB with timeout options and diagnostic logging
const connectDB = async () => {
  if (!rawUri) return;

  try {
    await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 5000, // Fail fast after 5s instead of buffering for 10s
    });
  } catch (err) {
    console.error('\n======================================================');
    console.error('❌ CRITICAL: Failed to connect to MongoDB Atlas!');
    console.error('Reason:', err.message);
    console.error('\n🛠️ Checklist to fix this:');
    console.error('1. Atlas Network Access: Ensure IP Whitelist includes 0.0.0.0/0 (allow from anywhere).');
    console.error('2. Database User: Verify username & password in your .env file.');
    console.error('3. Protocol: Ensure connection string begins with mongodb+srv://');
    console.error('======================================================\n');
  }
};

connectDB();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
