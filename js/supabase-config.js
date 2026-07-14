/**
 * Supabase Frontend Configuration (safe for browser)
 * 
 * Get these values from:
 * Supabase Dashboard > Project Settings > API
 * - Project URL: https://xxx.supabase.co  
 * - anon key: eyJxxx... (safe to expose, protected by RLS policies)
 * 
 * NOTE: The service_role key is NOT here — it's only in .env for backend scripts.
 * Never put the service_role key in a frontend-accessible file!
 */

const SUPABASE_URL = 'YOUR_PROJECT_URL';        // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';       // public anon key

// Export for browser
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
}

// Export for Node.js (sync script reads service key from env separately)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY'
  };
}
