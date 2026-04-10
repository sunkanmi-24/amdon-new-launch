const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Service role client — full DB access, bypasses RLS
// ONLY used server-side, NEVER expose to frontend
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabaseAdmin };