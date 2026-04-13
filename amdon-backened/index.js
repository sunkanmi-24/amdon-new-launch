const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Route imports
const registrationRoutes = require('./routes/registration');
const memberRoutes = require('./routes/members');
const queryRoutes = require('./routes/query');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// =============================================
// Global Middleware
// =============================================

// 1. Helmet - relax settings to allow cross-site requests
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('dev'));

// 2. Define allowed origins
const allowedOrigins = [
  'https://amdon-fixed.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173', // Common for Vite
  'http://localhost:3000'  // Common for React/Next
];

// 3. DYNAMIC CORS MIDDLEWARE
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps) 
    // or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
  credentials: true
}));

// 4. DYNAMIC PRE-FLIGHT HANDLER
// This replaces your hardcoded res.header('Access-Control-Allow-Origin', '...')
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// =============================================
// Routes
// =============================================
app.use('/api/registration', registrationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Server start logic for local dev
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
}

module.exports = app;
