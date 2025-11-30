// Supabase Database Configuration
const { createClient } = require('@supabase/supabase-js');
// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERROR] Missing Supabase credentials in .env file');
  // Do not exit in serverless environments, but warn
}

// Create Supabase client
const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: false }
});

module.exports = supabase;
