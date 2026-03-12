const { supabaseAdmin } = require('./supabase');
const { getStateByName } = require('../constants/states');

/**
 * Generate a unique AMDON Member ID.
 * Pattern: AMDON-[STATE_CODE]-[YEAR]-[SEQUENCE]
 * Uses a Postgres stored function for atomic increment (no race conditions).
 *
 * @param {string} stateName - Full name of the state e.g. "Lagos"
 * @returns {Promise<string>} - e.g. "AMDON-LA-2026-0001"
 */
async function generateMemberId(stateName) {
  const state = getStateByName(stateName);

  if (!state) {
    throw new Error(`Invalid state name: "${stateName}"`);
  }

  const year = new Date().getFullYear();

  // Call the Postgres function we created in the migration
  const { data, error } = await supabaseAdmin.rpc('generate_member_id', {
    p_state_code: state.code,
    p_year: year,
  });

  if (error) {
    throw new Error(`ID generation failed: ${error.message}`);
  }

  return data; // e.g. "AMDON-FC-2026-0001"
}

module.exports = { generateMemberId };