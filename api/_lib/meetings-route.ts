import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseMeetingDraft } from '../../shared/contract.js';
import { internalServerError, invalidDraft, methodNotAllowed, prepareEndpoint } from './http.js';
import { generateOwnerToken, hashOwnerToken } from './ownerToken.js';
import { rejectIfRateLimited } from './rateLimit.js';
import type { MeetingStore } from './store.js';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function createMeetingsHandler(store: MeetingStore): Handler {
  return async (req, res) => {
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

    const draft = parseMeetingDraft(req.body);
    if (!draft.ok) {
      invalidDraft(res, draft);
      return;
    }

    try {
      // The plaintext token is returned exactly once and only its hash is stored.
      const ownerToken = generateOwnerToken();
      const meeting = await store.createMeeting(draft.value, hashOwnerToken(ownerToken));
      res.status(201).json({ ...meeting, owner_token: ownerToken });
    } catch (error) {
      internalServerError(res, error);
    }
  };
}
