import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Supabase anonymous key is required. Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'schedula',
  },
});

export default supabase;