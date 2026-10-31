import { createClient } from '@supabase/supabase-js';

// Server-only. This module lives under api/ (Vercel functions) and must never
// be imported from src/ (the browser bundle). The service-role key bypasses RLS.
const supabaseUrl = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
// Deliberately no VITE_* fallback: VITE_ variables are inlined into the browser bundle.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error('Supabase service-role key is required. Set SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: 'schedula',
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
