import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isUuid, parseMeetingPatch } from '../../shared/contract.js';
import {
  internalServerError,
  invalidDraft,
  meetingNotFound,
  methodNotAllowed,
  prepareEndpoint,
} from './http.js';
import type { MeetingStore } from './store.js';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function createMeetingHandler(store: MeetingStore): Handler {
  return async (req, res) => {
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
        meetingNotFound(res);
      } else {
        res.status(400).json({ error: 'Meeting ID is required' });
      }
      return;
    }

    try {
      if (req.method === 'GET') {
        const found = await store.getMeeting(meetingId);
        if (found.kind === 'not-found') {
          meetingNotFound(res);
          return;
        }
        res.status(200).json(found.value);
        return;
      }

      const patch = parseMeetingPatch(req.body);
      if (!patch.ok) {
        invalidDraft(res, patch);
        return;
      }

      const updated = await store.updateMeeting(meetingId, patch.value);
      if (updated.kind === 'not-found') {
        meetingNotFound(res);
        return;
      }
      res.status(200).json(updated.value);
    } catch (error) {
      internalServerError(res, error);
    }
  };
}
