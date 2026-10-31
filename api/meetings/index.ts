import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http';
import { supabase } from '../_lib/supabase';
import { validateMeetingCreate } from '../_lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (prepareEndpoint(req, res, ['POST'])) {
    return;
  }

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const meetingInput = validateMeetingCreate(req.body);
  if (!meetingInput.ok) {
    res.status(400).json({ error: 'Title and creator_name are required' });
    return;
  }

  try {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert(meetingInput.value)
      .select()
      .single();

    if (error) {
      databaseError(res, error);
      return;
    }

    res.status(201).json(meeting);
  } catch (error) {
    internalServerError(res, error);
  }
}
