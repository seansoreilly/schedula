const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const TITLE_MAX_LENGTH = 200;
const NAME_MAX_LENGTH = 100;

export interface MeetingCreateInput {
  title: string;
  creator_name: string;
}

export interface MeetingUpdateInput {
  title?: string;
  creator_name?: string;
}

export interface AvailabilityCreateInput {
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false };

function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function invalid<T>(): ValidationResult<T> {
  return { ok: false };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function readBoundedText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0 || trimmedValue.length > maximumLength) {
    return null;
  }

  return trimmedValue;
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function comparableTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function validateMeetingCreate(body: unknown): ValidationResult<MeetingCreateInput> {
  if (!isPlainObject(body) || !hasOnlyKeys(body, ['title', 'creator_name'])) {
    return invalid();
  }

  const title = readBoundedText(body.title, TITLE_MAX_LENGTH);
  const creatorName = readBoundedText(body.creator_name, NAME_MAX_LENGTH);

  return title === null || creatorName === null
    ? invalid()
    : valid({ title, creator_name: creatorName });
}

export function validateMeetingUpdate(body: unknown): ValidationResult<MeetingUpdateInput> {
  if (!isPlainObject(body) || !hasOnlyKeys(body, ['title', 'creator_name'])) {
    return invalid();
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
  const hasCreatorName = Object.prototype.hasOwnProperty.call(body, 'creator_name');
  if (!hasTitle && !hasCreatorName) {
    return invalid();
  }

  const title = hasTitle ? readBoundedText(body.title, TITLE_MAX_LENGTH) : undefined;
  const creatorName = hasCreatorName ? readBoundedText(body.creator_name, NAME_MAX_LENGTH) : undefined;
  if ((hasTitle && title === null) || (hasCreatorName && creatorName === null)) {
    return invalid();
  }

  const meetingUpdate: MeetingUpdateInput = {};
  if (typeof title === 'string') {
    meetingUpdate.title = title;
  }
  if (typeof creatorName === 'string') {
    meetingUpdate.creator_name = creatorName;
  }

  return valid(meetingUpdate);
}

export function validateAvailabilityCreate(body: unknown): ValidationResult<AvailabilityCreateInput> {
  if (!isPlainObject(body) || !hasOnlyKeys(body, [
    'meeting_id',
    'participant_name',
    'available_date',
    'start_time',
    'end_time',
  ])) {
    return invalid();
  }

  const meetingId = body.meeting_id;
  const participantName = readBoundedText(body.participant_name, NAME_MAX_LENGTH);
  const availableDate = body.available_date;
  const startTime = body.start_time;
  const endTime = body.end_time;

  if (!isUuid(meetingId)
    || participantName === null
    || typeof availableDate !== 'string'
    || !isValidDate(availableDate)
    || typeof startTime !== 'string'
    || !TIME_PATTERN.test(startTime)
    || typeof endTime !== 'string'
    || !TIME_PATTERN.test(endTime)
    || comparableTime(startTime) >= comparableTime(endTime)) {
    return invalid();
  }

  return valid({
    meeting_id: meetingId,
    participant_name: participantName,
    available_date: availableDate,
    start_time: startTime,
    end_time: endTime,
  });
}
