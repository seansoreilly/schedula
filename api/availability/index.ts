import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
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

      // First ensure the table exists
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS availability (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meeting_id UUID NOT NULL,
          participant_name TEXT NOT NULL,
          available_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );
      `;
      await pool.query(createTableQuery);

      const query = `
        INSERT INTO availability (meeting_id, participant_name, available_date, start_time, end_time, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const result = await pool.query(query, [meeting_id, participant_name, available_date, start_time, end_time]);
      
      res.status(201).json(result.rows[0]);
    } else if (req.method === 'GET') {
      const { meeting_id } = req.query;
      
      if (!meeting_id || typeof meeting_id !== 'string') {
        return res.status(400).json({ error: 'Meeting ID is required' });
      }

      const query = 'SELECT * FROM availability WHERE meeting_id = $1 ORDER BY available_date, start_time';
      const result = await pool.query(query, [meeting_id]);
      
      res.status(200).json(result.rows);
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