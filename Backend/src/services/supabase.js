/**
 * YouCollab — Supabase Client Re-export Service
 * ============================================
 * Re-exports the client and admin connections from the centralized
 * database module at Backend/supabase/client.js.
 */

const { supabase, supabaseAdmin, healthCheck } = require('../../supabase/client');

module.exports = supabase;
module.exports.supabase = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
module.exports.healthCheck = healthCheck;
