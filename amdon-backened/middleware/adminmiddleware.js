const { supabaseAdmin } = require('../services/supabase');
require('dotenv').config();

/**
 * Middleware: Gate admin routes.
 * Accepts either:
 * (a) An admin JWT (for logged-in admins), OR
 * (b) A simple admin secret key in the header: x-admin-secret
 *
 * Confirm final approach with CTO before go-live.
 */
async function requireAdmin(req, res, next) {
  try {
    // Option A: Simple secret gate (quick to set up)
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
      req.isAdmin = true;
      return next();
    }

    // Option B: Admin user in DB (role-based)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Admin access denied' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }

    // Check admin table
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('email', user.email)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({ error: 'You are not an admin' });
    }

    req.isAdmin = true;
    req.adminUser = admin;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    return res.status(500).json({ error: 'Admin check failed' });
  }
}

module.exports = { requireAdmin };