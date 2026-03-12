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

const app = express();

// =============================================
// Global Middleware
// =============================================
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Request logging
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*', // Set to your Netlify/Vercel URL in prod
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================
// Routes
// =============================================
app.use('/api/registration', registrationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/auth', authRoutes);

// =============================================
// Health check
// =============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AMDON Registration Portal API',
    timestamp: new Date().toISOString(),
  });
});

// =============================================
// 404 handler
// =============================================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// =============================================
// Global error handler
// =============================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// =============================================
// Start server
// =============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ AMDON API running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;