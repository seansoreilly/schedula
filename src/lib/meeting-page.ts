import type {
  Availability,
  AvailabilityDraft,
  Meeting,
  MeetingPatch,
} from "@/integrations/api/types";
import { compareAvailability } from "@/lib/availability";

export type MeetingPageStatus = "loading" | "ready" | "not-found" | "error";

export interface MeetingPageState {
  status: MeetingPageStatus;
  meeting: Meeting | null;
  availability: Availability[];
}

export type MeetingPageEvent =
  | { type: "loading" }
  | { type: "loaded"; meeting: Meeting; availability: Availability[] }
  | { type: "not-found" }
  | { type: "failed" }
  | { type: "renamed"; meeting: Meeting }
  | { type: "availability-added"; availability: Availability };

export const initialMeetingPageState: MeetingPageState = {
  status: "loading",
  meeting: null,
  availability: [],
};

export function meetingPageReducer(
  state: MeetingPageState,
  event: MeetingPageEvent
): MeetingPageState {
  switch (event.type) {
    case "loading":
      return initialMeetingPageState;
    case "loaded":
      return { status: "ready", meeting: event.meeting, availability: event.availability };
    case "not-found":
      return { status: "not-found", meeting: null, availability: [] };
    case "failed":
      return { status: "error", meeting: null, availability: [] };
    case "renamed":
      return state.status === "ready" ? { ...state, meeting: event.meeting } : state;
    case "availability-added": {
      const isForThisMeeting = state.meeting?.id === event.availability.meeting_id;
      const isKnown = state.availability.some((entry) => entry.id === event.availability.id);
      if (state.status !== "ready" || !isForThisMeeting || isKnown) {
        return state;
      }
      return {
        ...state,
        availability: [...state.availability, event.availability].sort(compareAvailability),
      };
    }
  }
}

/** The slice of the API client the page uses; injected so the flows can be tested without fetch. */
export interface MeetingPageQueries {
  meetings: {
    findById(id: string): Promise<Meeting | null>;
    update(id: string, patch: MeetingPatch): Promise<Meeting | null>;
  };
  availability: {
    findByMeetingId(meetingId: string): Promise<Availability[]>;
    create(draft: AvailabilityDraft): Promise<Availability>;
  };
}

export async function loadMeetingPage(
  queries: MeetingPageQueries,
  meetingId: string | undefined
): Promise<MeetingPageEvent> {
  if (!meetingId) {
    return { type: "not-found" };
  }

  try {
    const meeting = await queries.meetings.findById(meetingId);
    if (!meeting) {
      return { type: "not-found" };
    }

    const availability = await queries.availability.findByMeetingId(meetingId);
    return { type: "loaded", meeting, availability };
  } catch (error) {
    console.error("Error fetching meeting data:", error);
    return { type: "failed" };
  }
}

/** Throws when the update fails; a vanished meeting is reported as not-found. */
export async function renameMeeting(
  queries: MeetingPageQueries,
  meetingId: string,
  title: string
): Promise<MeetingPageEvent> {
  const meeting = await queries.meetings.update(meetingId, { title });
  return meeting ? { type: "renamed", meeting } : { type: "not-found" };
}

/** Throws when the create fails. The new row is appended locally; nothing is re-fetched. */
export async function submitAvailability(
  queries: MeetingPageQueries,
  draft: AvailabilityDraft
): Promise<MeetingPageEvent> {
  const availability = await queries.availability.create(draft);
  return { type: "availability-added", availability };
}
