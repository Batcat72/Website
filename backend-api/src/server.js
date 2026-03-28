const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./modules/auth/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const leaveRoutes = require('./modules/leave/routes');
const workReportRoutes = require('./modules/work-report/routes');
const excelRoutes = require('./modules/excel-processing/routes');
const notificationRoutes = require('./modules/notification/routes');
const geofenceRoutes = require('./modules/geofence/routes');
const securityRoutes = require('./modules/security-monitoring/routes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/authMiddleware');
const { logRequest } = require('./middleware/loggingMiddleware');

// Import database connection
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

// Import WebSocket handlers
const { setupWebSocket } = require('./modules/notification/websocket');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Global rate limiter (5 requests per minute for auth endpoints)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many login attempts, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FACE_AI_SERVICE_URL || 'http://localhost:5000']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(logRequest);

// Public routes (no authentication required)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes (require authentication)
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/leave', authenticateToken, leaveRoutes);
app.use('/api/work-report', authenticateToken, workReportRoutes);
app.use('/api/excel', authenticateToken, excelRoutes);
app.use('/api/geofence', authenticateToken, geofenceRoutes);
app.use('/api/security', authenticateToken, securityRoutes);

// WebSocket setup
setupWebSocket(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      face_ai_service: 'checking'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize connections and start server
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected successfully');

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🔒 Security middleware active`);
      console.log(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };