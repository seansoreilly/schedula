import type {
  Availability,
  AvailabilityDraft,
  Meeting,
  MeetingDraft,
  MeetingPatch,
} from '../../shared/contract.js';

/** Per-meeting cap so anyone with a meeting id cannot fill the table. A domain rule every adapter enforces. */
export const MAX_AVAILABILITY_ROWS_PER_MEETING = 200;

export type StoreResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'not-found' };

export type AddAvailabilityResult =
  | StoreResult<Availability>
  | { kind: 'limit-reached' };

/**
 * The persistence seam for the API. Expected outcomes (unknown meeting, full meeting) are returned as
 * results; anything unexpected (a database outage, say) is thrown and surfaces as a 500 in the routes.
 */
export interface MeetingStore {
  /** `ownerTokenHash` is the SHA-256 hex of the owner token; the hash is never part of a returned Meeting. */
  createMeeting(draft: MeetingDraft, ownerTokenHash?: string): Promise<Meeting>;
  /** The stored owner-token hash; `null` for legacy meetings created before owner tokens. */
  getOwnerTokenHash(id: string): Promise<StoreResult<string | null>>;
  getMeeting(id: string): Promise<StoreResult<Meeting>>;
  updateMeeting(id: string, patch: MeetingPatch): Promise<StoreResult<Meeting>>;
  /** Ordered by date, then start time. `not-found` when the meeting does not exist. */
  listAvailability(meetingId: string): Promise<StoreResult<Availability[]>>;
  /**
   * `not-found` when the draft's meeting does not exist; `limit-reached` once the meeting holds
   * MAX_AVAILABILITY_ROWS_PER_MEETING rows.
   */
  addAvailability(draft: AvailabilityDraft): Promise<AddAvailabilityResult>;
}
