// The Meeting & Availability contract: the single definition of what a valid draft is (validated by the
// API and by the forms) and what a valid response is (parsed by the API client).
// Runtime-agnostic: no DOM, no Node, no `@/` aliases. Relative imports need a .ts extension.
import { normalizeTimeOfDay, parseTimeOfDay } from "./time-of-day.js";

export const TITLE_MAX_LENGTH = 200;
export const NAME_MAX_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface Meeting {
  id: string;
  title: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingDraft {
  title: string;
  creator_name: string;
}

export interface MeetingPatch {
  title?: string;
  creator_name?: string;
}

/** Times are always normalised to HH:MM, whatever the database returns. */
export interface Availability {
  id: string;
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityDraft {
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

/** Field name → human-readable reason. `_body` is used when the input is not an object at all. */
export type FieldErrors = Partial<Record<string, string>>;

export type DraftResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fields: FieldErrors };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function failed<T>(fields: FieldErrors): DraftResult<T> {
  const firstReason = Object.values(fields).find((reason) => reason !== undefined);
  return { ok: false, error: firstReason ?? "Invalid request", fields };
}

function readText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maximumLength: number,
  fields: FieldErrors
): string | undefined {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    fields[key] = `${label} is required`;
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > maximumLength) {
    fields[key] = `${label} must be ${maximumLength} characters or fewer`;
    return undefined;
  }

  return trimmed;
}

function rejectUnknownKeys(
  body: Record<string, unknown>,
  allowedKeys: readonly string[],
  fields: FieldErrors
): void {
  for (const key of Object.keys(body)) {
    if (!allowedKeys.includes(key)) {
      fields[key] = `${key} is not an accepted field`;
    }
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const MEETING_KEYS = ["title", "creator_name"] as const;

export function parseMeetingDraft(body: unknown): DraftResult<MeetingDraft> {
  if (!isPlainObject(body)) {
    return failed({ _body: "Title and creator_name are required" });
  }

  const fields: FieldErrors = {};
  rejectUnknownKeys(body, MEETING_KEYS, fields);
  const title = readText(body, "title", "Title", TITLE_MAX_LENGTH, fields);
  const creatorName = readText(body, "creator_name", "Organizer name", NAME_MAX_LENGTH, fields);

  return title === undefined || creatorName === undefined || Object.keys(fields).length > 0
    ? failed(fields)
    : { ok: true, value: { title, creator_name: creatorName } };
}

export function parseMeetingPatch(body: unknown): DraftResult<MeetingPatch> {
  if (!isPlainObject(body)) {
    return failed({ _body: "No fields to update" });
  }

  const fields: FieldErrors = {};
  rejectUnknownKeys(body, MEETING_KEYS, fields);
  if (!hasOwn(body, "title") && !hasOwn(body, "creator_name")) {
    return failed({ ...fields, _body: "No fields to update" });
  }

  const patch: MeetingPatch = {};
  if (hasOwn(body, "title")) {
    patch.title = readText(body, "title", "Title", TITLE_MAX_LENGTH, fields);
  }
  if (hasOwn(body, "creator_name")) {
    patch.creator_name = readText(body, "creator_name", "Organizer name", NAME_MAX_LENGTH, fields);
  }

  return Object.keys(fields).length > 0 ? failed(fields) : { ok: true, value: patch };
}

const AVAILABILITY_KEYS = [
  "meeting_id",
  "participant_name",
  "available_date",
  "start_time",
  "end_time",
] as const;

export function parseAvailabilityDraft(body: unknown): DraftResult<AvailabilityDraft> {
  if (!isPlainObject(body)) {
    return failed({ _body: "All fields are required" });
  }

  const fields: FieldErrors = {};
  rejectUnknownKeys(body, AVAILABILITY_KEYS, fields);

  if (!isUuid(body.meeting_id)) {
    fields.meeting_id = "Meeting ID is required";
  }
  const participantName = readText(body, "participant_name", "Your name", NAME_MAX_LENGTH, fields);
  if (!isCalendarDate(body.available_date)) {
    fields.available_date = "A valid date is required";
  }

  const startMinutes = parseTimeOfDay(body.start_time);
  const endMinutes = parseTimeOfDay(body.end_time);
  if (startMinutes === null) {
    fields.start_time = "A valid start time is required";
  }
  if (endMinutes === null) {
    fields.end_time = "A valid end time is required";
  }
  if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
    fields.end_time = "End time must be after start time";
  }

  if (Object.keys(fields).length > 0 || participantName === undefined) {
    return failed(fields);
  }

  return {
    ok: true,
    value: {
      meeting_id: body.meeting_id as string,
      participant_name: participantName,
      available_date: body.available_date as string,
      start_time: normalizeTimeOfDay(body.start_time) as string,
      end_time: normalizeTimeOfDay(body.end_time) as string,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string, subject: string): string {
  const field = value[key];
  if (typeof field !== "string") {
    throw new Error(`The ${subject} API returned an invalid response`);
  }
  return field;
}

export function parseMeeting(value: unknown): Meeting {
  if (!isRecord(value)) {
    throw new Error("The meetings API returned an invalid response");
  }

  return {
    id: readString(value, "id", "meetings"),
    title: readString(value, "title", "meetings"),
    creator_name: readString(value, "creator_name", "meetings"),
    created_at: readString(value, "created_at", "meetings"),
    updated_at: readString(value, "updated_at", "meetings"),
  };
}

export function parseAvailability(value: unknown): Availability {
  if (!isRecord(value)) {
    throw new Error("The availability API returned an invalid response");
  }

  const startTime = normalizeTimeOfDay(value.start_time);
  const endTime = normalizeTimeOfDay(value.end_time);
  if (startTime === null || endTime === null) {
    throw new Error("The availability API returned an invalid response");
  }

  return {
    id: readString(value, "id", "availability"),
    meeting_id: readString(value, "meeting_id", "availability"),
    participant_name: readString(value, "participant_name", "availability"),
    available_date: readString(value, "available_date", "availability"),
    start_time: startTime,
    end_time: endTime,
    created_at: readString(value, "created_at", "availability"),
  };
}

export function parseAvailabilityList(value: unknown): Availability[] {
  if (!Array.isArray(value)) {
    throw new Error("The availability API returned an invalid response");
  }

  return value.map(parseAvailability);
}
