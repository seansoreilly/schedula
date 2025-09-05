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

interface AvailabilityInsert {
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
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
      const { meeting_id, participant_name, available_date, start_time, end_time } = req.body as AvailabilityInsert;

      if (!meeting_id || !participant_name || !available_date || !start_time || !end_time) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const { data: availability, error } = await supabase
        .from('availability')
        .insert({
          meeting_id,
          participant_name,
          available_date,
          start_time,
          end_time,
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
      
      res.status(201).json(availability);
    } else if (req.method === 'GET') {
      const { meeting_id } = req.query;
      
      if (!meeting_id || typeof meeting_id !== 'string') {
        return res.status(400).json({ error: 'Meeting ID is required' });
      }

      const { data: availability, error } = await supabase
        .from('availability')
        .select('*')
        .eq('meeting_id', meeting_id)
        .order('available_date')
        .order('start_time');

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ 
          error: 'Database error',
          details: error.message
        });
      }
      
      res.status(200).json(availability || []);
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