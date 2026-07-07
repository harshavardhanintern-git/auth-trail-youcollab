/**
 * YouCollab — Centralized Supabase Database Client
 * ===============================================
 * Initializes connection to Supabase database.
 * Provides standard client (anon) and admin client (service_role).
 *
 * Note: Supabase JS v2 requires Node.js 22+ for native WebSocket support.
 * We pass realtime: { enabled: false } to avoid the WebSocket requirement
 * entirely on the server side (we don't use Supabase Realtime on the backend).
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const supabaseUrl = config.SUPABASE.URL;
const supabaseKey = config.SUPABASE.KEY;
const supabaseServiceKey = config.SUPABASE.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_KEY is not defined in environment variables.');
}

// Server-side client options — disable Realtime to avoid WebSocket requirement
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    // Disable realtime on the backend — we don't need WebSocket subscriptions here
    // This prevents the "native WebSocket not found" error on Node.js < 22
    params: { eventsPerSecond: -1 },
  },
  global: {
    // Provide a no-op WebSocket constructor to satisfy the Supabase client
    // initialization check without actually connecting to the Realtime service
    fetch: globalThis.fetch,
  },
};

// Centralized standard client connection
const supabase = createClient(supabaseUrl, supabaseKey, {
  ...clientOptions,
  db: { schema: 'public' },
});

// Centralized admin connection (service_role)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      ...clientOptions,
      db: { schema: 'public' },
    })
  : null;

/**
 * Health check function to verify connectivity with Supabase database.
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  try {
    if (!supabaseUrl) return false;

    // Quick test query to verify database response
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error && error.message.includes('relation "users" does not exist')) {
      // Table doesn't exist yet (migrations not run), but connection is alive
      return true;
    }

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('❌ Database connection check failed:', err.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  healthCheck,
};
