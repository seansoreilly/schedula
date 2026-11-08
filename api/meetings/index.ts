import type { VercelRequest, VercelResponse } from '@vercel/node';
import { databaseError, internalServerError, methodNotAllowed, prepareEndpoint } from '../_lib/http.js';
import { rejectIfRateLimited } from '../_lib/rateLimit.js';
import { MEETING_PUBLIC_COLUMNS, generateOwnerToken, hashOwnerToken } from '../_lib/ownerToken.js';
import { supabase } from '../_lib/supabase.js';
import { validateMeetingCreate } from '../_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (prepareEndpoint(req, res, ['POST'])) {
    return;
  }

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  if (rejectIfRateLimited(req, res)) {
    return;
  }

  const meetingInput = validateMeetingCreate(req.body);
  if (!meetingInput.ok) {
    res.status(400).json({ error: 'Title and creator_name are required' });
    return;
  }

  try {
    const ownerToken = generateOwnerToken();
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({ ...meetingInput.value, owner_token_hash: hashOwnerToken(ownerToken) })
      .select(MEETING_PUBLIC_COLUMNS)
      .single();

    if (error) {
      databaseError(res, error);
      return;
    }

    // The plaintext token is returned exactly once and never stored.
    res.status(201).json({ ...meeting, owner_token: ownerToken });
  } catch (error) {
    internalServerError(res, error);
  }
}
