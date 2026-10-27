import type { Availability, Meeting } from '../../shared/contract.js';
import type { MeetingStore } from './store.js';

export function createMemoryStore(): MeetingStore {
  const meetings = new Map<string, Meeting>();
  const availability: Availability[] = [];

  return {
    async createMeeting(draft) {
      const now = new Date().toISOString();
      const meeting: Meeting = { id: crypto.randomUUID(), ...draft, created_at: now, updated_at: now };
      meetings.set(meeting.id, meeting);
      return { ...meeting };
    },

    async getMeeting(id) {
      const meeting = meetings.get(id);
      return meeting ? { kind: 'ok', value: { ...meeting } } : { kind: 'not-found' };
    },

    async updateMeeting(id, patch) {
      const meeting = meetings.get(id);
      if (!meeting) {
        return { kind: 'not-found' };
      }

      const updated: Meeting = { ...meeting, ...patch, updated_at: new Date().toISOString() };
      meetings.set(id, updated);
      return { kind: 'ok', value: { ...updated } };
    },

    async listAvailability(meetingId) {
      if (!meetings.has(meetingId)) {
        return { kind: 'not-found' };
      }

      const slots = availability
        .filter((slot) => slot.meeting_id === meetingId)
        .sort((a, b) => a.available_date.localeCompare(b.available_date)
          || a.start_time.localeCompare(b.start_time));
      return { kind: 'ok', value: slots.map((slot) => ({ ...slot })) };
    },

    async addAvailability(draft) {
      if (!meetings.has(draft.meeting_id)) {
        return { kind: 'not-found' };
      }

      const slot: Availability = { id: crypto.randomUUID(), ...draft, created_at: new Date().toISOString() };
      availability.push(slot);
      return { kind: 'ok', value: { ...slot } };
    },
  };
}
