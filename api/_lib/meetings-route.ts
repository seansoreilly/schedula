import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseMeetingDraft } from '../../shared/contract.js';
import { internalServerError, invalidDraft, methodNotAllowed, prepareEndpoint } from './http.js';
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

    const draft = parseMeetingDraft(req.body);
    if (!draft.ok) {
      invalidDraft(res, draft);
      return;
    }

    try {
      res.status(201).json(await store.createMeeting(draft.value));
    } catch (error) {
      internalServerError(res, error);
    }
  };
}
