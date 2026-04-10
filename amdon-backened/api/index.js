const express = require('express');
const app = express();

require('dotenv').config();

app.use(express.json());

// ✅ Correct path
const adminRoutes = require('../routes/admin');

app.use('/api/admin', adminRoutes);

// ✅ Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK ✅' });
});

// ❌ NO app.listen()

module.exports = app;