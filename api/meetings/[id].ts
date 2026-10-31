import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http.js';
import { supabase } from '../_lib/supabase.js';
import { isUuid, validateMeetingUpdate } from '../_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (prepareEndpoint(req, res, ['GET', 'PUT'])) {
    return;
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    methodNotAllowed(res);
    return;
  }

  const meetingId = req.query.id;
  if (!isUuid(meetingId)) {
    if (req.method === 'GET') {
      res.status(404).json({ error: 'Meeting not found' });
    } else {
      res.status(400).json({ error: 'Meeting ID is required' });
    }
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Meeting not found' });
          return;
        }

        databaseError(res, error);
        return;
      }

      res.status(200).json(meeting);
      return;
    }

    if (req.method === 'PUT') {
      const meetingUpdate = validateMeetingUpdate(req.body);
      if (!meetingUpdate.ok) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const { data: meeting, error } = await supabase
        .from('meetings')
        .update({ ...meetingUpdate.value, updated_at: new Date().toISOString() })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Meeting not found' });
          return;
        }

        databaseError(res, error);
        return;
      }

      res.status(200).json(meeting);
      return;
    }

  } catch (error) {
    internalServerError(res, error);
  }
}
