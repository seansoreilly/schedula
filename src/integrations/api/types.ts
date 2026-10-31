export interface Meeting {
  id: string;
  title: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingInsert {
  title: string;
  creator_name: string;
}

export interface MeetingUpdate {
  title?: string;
  creator_name?: string;
}

export interface Availability {
  id: string;
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityInsert {
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

export function parseMeeting(value: unknown): Meeting {
  if (
    !isRecord(value) ||
    !hasString(value, "id") ||
    !hasString(value, "title") ||
    !hasString(value, "creator_name") ||
    !hasString(value, "created_at") ||
    !hasString(value, "updated_at")
  ) {
    throw new Error("The meetings API returned an invalid response");
  }

  return {
    id: value.id as string,
    title: value.title as string,
    creator_name: value.creator_name as string,
    created_at: value.created_at as string,
    updated_at: value.updated_at as string,
  };
}

export function parseAvailability(value: unknown): Availability {
  if (
    !isRecord(value) ||
    !hasString(value, "id") ||
    !hasString(value, "meeting_id") ||
    !hasString(value, "participant_name") ||
    !hasString(value, "available_date") ||
    !hasString(value, "start_time") ||
    !hasString(value, "end_time") ||
    !hasString(value, "created_at")
  ) {
    throw new Error("The availability API returned an invalid response");
  }

  return {
    id: value.id as string,
    meeting_id: value.meeting_id as string,
    participant_name: value.participant_name as string,
    available_date: value.available_date as string,
    start_time: value.start_time as string,
    end_time: value.end_time as string,
    created_at: value.created_at as string,
  };
}

export function parseAvailabilityList(value: unknown): Availability[] {
  if (!Array.isArray(value)) {
    throw new Error("The availability API returned an invalid response");
  }

  return value.map(parseAvailability);
}
