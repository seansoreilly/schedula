import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Supabase anonymous key is required. Set SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'schedula',
  },
});
