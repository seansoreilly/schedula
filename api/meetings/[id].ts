import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http.js';
import { MEETING_PUBLIC_COLUMNS, ownerTokenMatches, readOwnerToken } from '../_lib/ownerToken.js';
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
        .select(MEETING_PUBLIC_COLUMNS)
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

      const { data: existing, error: lookupError } = await supabase
        .from('meetings')
        .select('owner_token_hash')
        .eq('id', meetingId)
        .single();

      if (lookupError) {
        if (lookupError.code === 'PGRST116') {
          res.status(404).json({ error: 'Meeting not found' });
          return;
        }

        databaseError(res, lookupError);
        return;
      }

      const storedHash: unknown = existing?.owner_token_hash;
      if (typeof storedHash === 'string') {
        const presentedToken = readOwnerToken(req);
        if (presentedToken === null || !ownerTokenMatches(presentedToken, storedHash)) {
          res.status(403).json({ error: 'Invalid or missing owner token' });
          return;
        }
      } else {
        // Legacy meeting created before owner tokens: stays editable by anyone
        // with the link so existing links keep working. Logged for visibility.
        console.warn('Legacy meeting without owner token edited', { meetingId });
      }

      const { data: meeting, error } = await supabase
        .from('meetings')
        .update({ ...meetingUpdate.value, updated_at: new Date().toISOString() })
        .eq('id', meetingId)
        .select(MEETING_PUBLIC_COLUMNS)
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
