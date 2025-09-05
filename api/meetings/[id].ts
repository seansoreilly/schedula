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

interface MeetingUpdate {
  title?: string;
  creator_name?: string;
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Meeting not found' });
        }
        console.error('Supabase error:', error);
        return res.status(500).json({ 
          error: 'Database error',
          details: error.message
        });
      }
      
      res.status(200).json(meeting);
    } else if (req.method === 'PUT') {
      const { title, creator_name } = req.body as MeetingUpdate;
      
      if (!title && !creator_name) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
      if (title) updateData.title = title;
      if (creator_name) updateData.creator_name = creator_name;

      const { data: meeting, error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Meeting not found' });
        }
        console.error('Supabase error:', error);
        return res.status(500).json({ 
          error: 'Database error',
          details: error.message
        });
      }
      
      res.status(200).json(meeting);
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