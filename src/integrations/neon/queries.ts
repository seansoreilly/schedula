import { db } from './client';
import { Meeting, Availability, MeetingInsert, AvailabilityInsert, MeetingUpdate, AvailabilityUpdate } from './types';

export const meetingQueries = {
  async create(data: MeetingInsert): Promise<Meeting> {
    const query = `
      INSERT INTO meetings (title, creator_name, created_at, updated_at)
      VALUES ($1, $2, COALESCE($3, NOW()), COALESCE($4, NOW()))
      RETURNING *
    `;
    const result = await db.query(query, [
      data.title,
      data.creator_name,
      data.created_at,
      data.updated_at,
    ]);
    return result.rows[0];
  },

  async findById(id: string): Promise<Meeting | null> {
    const query = 'SELECT * FROM meetings WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  async update(id: string, data: MeetingUpdate): Promise<Meeting | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.title) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.creator_name) {
      fields.push(`creator_name = $${paramIndex++}`);
      values.push(data.creator_name);
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE meetings 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM meetings WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },
};

export const availabilityQueries = {
  async create(data: AvailabilityInsert): Promise<Availability> {
    const query = `
      INSERT INTO availability (meeting_id, participant_name, available_date, start_time, end_time, created_at)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
      RETURNING *
    `;
    const result = await db.query(query, [
      data.meeting_id,
      data.participant_name,
      data.available_date,
      data.start_time,
      data.end_time,
      data.created_at,
    ]);
    return result.rows[0];
  },

  async findByMeetingId(meetingId: string): Promise<Availability[]> {
    const query = 'SELECT * FROM availability WHERE meeting_id = $1 ORDER BY available_date, start_time';
    const result = await db.query(query, [meetingId]);
    return result.rows;
  },

  async findById(id: string): Promise<Availability | null> {
    const query = 'SELECT * FROM availability WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  async update(id: string, data: AvailabilityUpdate): Promise<Availability | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.meeting_id) {
      fields.push(`meeting_id = $${paramIndex++}`);
      values.push(data.meeting_id);
    }
    if (data.participant_name) {
      fields.push(`participant_name = $${paramIndex++}`);
      values.push(data.participant_name);
    }
    if (data.available_date) {
      fields.push(`available_date = $${paramIndex++}`);
      values.push(data.available_date);
    }
    if (data.start_time) {
      fields.push(`start_time = $${paramIndex++}`);
      values.push(data.start_time);
    }
    if (data.end_time) {
      fields.push(`end_time = $${paramIndex++}`);
      values.push(data.end_time);
    }
    
    values.push(id);

    const query = `
      UPDATE availability 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM availability WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },

  async deleteByMeetingId(meetingId: string): Promise<boolean> {
    const query = 'DELETE FROM availability WHERE meeting_id = $1';
    const result = await db.query(query, [meetingId]);
    return result.rowCount > 0;
  },
};