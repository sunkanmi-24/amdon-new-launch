const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../services/supabase');
require('dotenv').config();

/**
 * Middleware: Verify that the request has a valid Supabase JWT.
 * The frontend should send the Supabase access token in the Authorization header.
 * Authorization: Bearer <supabase_access_token>
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
}

module.exports = { requireAuth };