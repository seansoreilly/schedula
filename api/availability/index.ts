import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http.js';
import { rejectIfRateLimited } from '../_lib/rateLimit.js';
import { supabase } from '../_lib/supabase.js';
import { isUuid, validateAvailabilityCreate } from '../_lib/validation.js';

const MAX_AVAILABILITY_ROWS_PER_MEETING = 200;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (prepareEndpoint(req, res, ['GET', 'POST'])) {
    return;
  }

  try {
    if (req.method === 'POST') {
      if (rejectIfRateLimited(req, res)) {
        return;
      }

      const availabilityInput = validateAvailabilityCreate(req.body);
      if (!availabilityInput.ok) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      // Per-meeting cap so anyone with a meeting id cannot fill the table.
      // Check-then-insert is not atomic; concurrent requests can overshoot slightly.
      const { count, error: countError } = await supabase
        .from('availability')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', availabilityInput.value.meeting_id);

      if (countError) {
        databaseError(res, countError);
        return;
      }

      if ((count ?? 0) >= MAX_AVAILABILITY_ROWS_PER_MEETING) {
        res.status(409).json({ error: 'This meeting has reached its availability limit' });
        return;
      }

      const { data: availability, error } = await supabase
        .from('availability')
        .insert(availabilityInput.value)
        .select()
        .single();

      if (error) {
        // 23503 = foreign_key_violation: meeting_id does not reference an existing meeting.
        if (error.code === '23503') {
          res.status(404).json({ error: 'Meeting not found' });
          return;
        }

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
