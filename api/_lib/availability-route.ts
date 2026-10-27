import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isUuid, parseAvailabilityDraft } from '../../shared/contract.js';
import {
  internalServerError,
  invalidDraft,
  meetingNotFound,
  methodNotAllowed,
  prepareEndpoint,
} from './http.js';
import type { MeetingStore } from './store.js';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function createAvailabilityHandler(store: MeetingStore): Handler {
  return async (req, res) => {
    if (prepareEndpoint(req, res, ['GET', 'POST'])) {
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    try {
      if (req.method === 'POST') {
        const draft = parseAvailabilityDraft(req.body);
        if (!draft.ok) {
          invalidDraft(res, draft);
          return;
        }

        const added = await store.addAvailability(draft.value);
        if (added.kind === 'not-found') {
          meetingNotFound(res);
          return;
        }
        res.status(201).json(added.value);
        return;
      }

      const meetingId = req.query.meeting_id;
      if (!isUuid(meetingId)) {
        res.status(400).json({ error: 'Meeting ID is required' });
        return;
      }

      const listed = await store.listAvailability(meetingId);
      if (listed.kind === 'not-found') {
        meetingNotFound(res);
        return;
      }
      res.status(200).json(listed.value);
    } catch (error) {
      internalServerError(res, error);
    }
  };
}
