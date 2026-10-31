import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http.js';
import { supabase } from '../_lib/supabase.js';
import { isUuid, validateAvailabilityCreate } from '../_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (prepareEndpoint(req, res, ['GET', 'POST'])) {
    return;
  }

  try {
    if (req.method === 'POST') {
      const availabilityInput = validateAvailabilityCreate(req.body);
      if (!availabilityInput.ok) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      const { data: availability, error } = await supabase
        .from('availability')
        .insert(availabilityInput.value)
        .select()
        .single();

      if (error) {
        databaseError(res, error);
        return;
      }

      res.status(201).json(availability);
      return;
    }

    if (req.method === 'GET') {
      const meetingId = req.query.meeting_id;
      if (!isUuid(meetingId)) {
        res.status(400).json({ error: 'Meeting ID is required' });
        return;
      }

      const { data: availability, error } = await supabase
        .from('availability')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('available_date')
        .order('start_time');

      if (error) {
        databaseError(res, error);
        return;
      }

      res.status(200).json(availability ?? []);
      return;
    }

    methodNotAllowed(res);
  } catch (error) {
    internalServerError(res, error);
  }
}
