import type {
  Availability,
  AvailabilityDraft,
  Meeting,
  MeetingDraft,
  MeetingPatch,
} from '../../shared/contract.js';

export type StoreResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'not-found' };

/**
 * The persistence seam for the API. Unknown meetings are reported as `not-found`; anything unexpected
 * (a database outage, say) is thrown and surfaces as a 500 in the route handlers.
 */
export interface MeetingStore {
  createMeeting(draft: MeetingDraft): Promise<Meeting>;
  getMeeting(id: string): Promise<StoreResult<Meeting>>;
  updateMeeting(id: string, patch: MeetingPatch): Promise<StoreResult<Meeting>>;
  /** Ordered by date, then start time. `not-found` when the meeting does not exist. */
  listAvailability(meetingId: string): Promise<StoreResult<Availability[]>>;
  /** `not-found` when the draft's meeting does not exist. */
  addAvailability(draft: AvailabilityDraft): Promise<StoreResult<Availability>>;
}
