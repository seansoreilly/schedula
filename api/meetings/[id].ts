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
      const query = 'SELECT * FROM meetings WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      res.status(200).json(result.rows[0]);
    } else if (req.method === 'PUT') {
      const { title, creator_name } = req.body as MeetingUpdate;
      
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (title) {
        fields.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (creator_name) {
        fields.push(`creator_name = $${paramIndex++}`);
        values.push(creator_name);
      }
      
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE meetings 
        SET ${fields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      res.status(200).json(result.rows[0]);
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