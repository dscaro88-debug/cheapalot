/**
 * Supabase Configuration
 * 
 * Get these values from:
 * Supabase Dashboard > Project Settings > API
 * - Project URL: https://xxx.supabase.co
 * - anon key: eyJxxx... (safe to expose in frontend, protected by RLS)
 * - service_role key: eyJxxx... (ONLY for server-side scripts, NEVER in frontend)
 */

// ---- Frontend (safe to expose) ----
const SUPABASE_URL = 'YOUR_PROJECT_URL';        // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';       // public anon key

// ---- Backend only (for sync script, DO NOT expose in frontend) ----
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_KEY'; // service_role key

// ---- Export for browser ----
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
}

// ---- Export for Node.js (sync script) ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY
  };
}
