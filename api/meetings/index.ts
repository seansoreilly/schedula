import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Supabase anonymous key is required. Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'schedula',
  },
});

interface MeetingInsert {
  title: string;
  creator_name: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      const { title, creator_name } = req.body as MeetingInsert;

      if (!title || !creator_name) {
        return res.status(400).json({ error: 'Title and creator_name are required' });
      }

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title,
          creator_name,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ 
          error: 'Database error',
          details: error.message
        });
      }
      
      res.status(201).json(meeting);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}