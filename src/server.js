const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to database
connectDB();

// Middleware
app.use(helmet());
// Configure CORS: support a comma-separated list in CORS_ORIGIN (e.g. "http://localhost:3000,http://localhost:8082").
// If a specific origin(s) is provided we enable credentials; otherwise use wildcard without credentials.
const rawCors = process.env.CORS_ORIGIN || '*';
let originOption;
let credentialsOption = false;
if (rawCors === '*') {
  originOption = '*';
  credentialsOption = false;
} else {
  const allowed = rawCors.split(',').map(s => s.trim()).filter(Boolean);
  // origin function used by cors middleware to reflect back allowed origin when matched
  originOption = function (origin, callback) {
    // allow non-browser requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact matches from the allowed list
    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // In development, allow any localhost origin (different ports) to simplify testing
    if (process.env.NODE_ENV === 'development') {
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return callback(null, true);
        }
      } catch (e) {
        // ignore malformed origin
      }
    }
    return callback(new Error('Not allowed by CORS'));
  };
  credentialsOption = true;
  console.log('CORS allowed origins:', allowed);
}
const corsOptions = { origin: originOption, credentials: credentialsOption };
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API info route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event App API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (Protected)',
        signupInitiate: 'POST /api/auth/signup/initiate',
        signupVerify: 'POST /api/auth/signup/verify',
        signupComplete: 'POST /api/auth/signup/complete'
      },
      events: {
        list: 'GET /api/events',
        get: 'GET /api/events/:id',
        create: 'POST /api/events (Protected)',
        update: 'PUT /api/events/:id (Protected)',
        delete: 'DELETE /api/events/:id (Protected)',
        register: 'POST /api/events/:id/register (Protected)'
      },
      users: {
        profile: 'GET /api/users/profile (Protected)',
        updateProfile: 'PUT /api/users/profile (Protected)'
      }
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

