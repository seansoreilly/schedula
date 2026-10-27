import assert from "node:assert/strict";
import test from "node:test";
import {
  NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  parseAvailability,
  parseAvailabilityDraft,
  parseAvailabilityList,
  parseMeeting,
  parseMeetingDraft,
  parseMeetingPatch,
} from "../../shared/contract.js";
import { END_OF_DAY, normalizeTimeOfDay, parseTimeOfDay } from "../../shared/time-of-day.js";

const meetingId = "11111111-1111-4111-8111-111111111111";
const availabilityDraft = {
  meeting_id: meetingId,
  participant_name: "Sean",
  available_date: "2026-08-10",
  start_time: "09:00",
  end_time: "10:00",
};

test("meeting drafts are trimmed and unknown fields are rejected with a reason", () => {
  assert.deepEqual(parseMeetingDraft({ title: " Planning ", creator_name: " Sean " }), {
    ok: true,
    value: { title: "Planning", creator_name: "Sean" },
  });

  const result = parseMeetingDraft({ title: "Planning", creator_name: "Sean", admin: true });
  assert.equal(result.ok, false);
  assert.equal(result.fields.admin, "admin is not an accepted field");
});

test("missing meeting fields report a 'required' reason (E2E asserts on it)", () => {
  const result = parseMeetingDraft({ title: "", creator_name: "Sean" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Title is required");
  assert.match(parseMeetingDraft(null).error, /required/);
});

test("over-long text reports the bound instead of 'required'", () => {
  const result = parseMeetingDraft({ title: "x".repeat(TITLE_MAX_LENGTH + 1), creator_name: "Sean" });
  assert.equal(result.ok, false);
  assert.equal(result.fields.title, `Title must be ${TITLE_MAX_LENGTH} characters or fewer`);

  const name = parseAvailabilityDraft({
    ...availabilityDraft,
    participant_name: "y".repeat(NAME_MAX_LENGTH + 1),
  });
  assert.match(name.fields.participant_name, /characters or fewer/);
});

test("meeting patches need at least one known field", () => {
  assert.deepEqual(parseMeetingPatch({ title: " New " }), { ok: true, value: { title: "New" } });
  assert.equal(parseMeetingPatch({}).error, "No fields to update");
  assert.equal(parseMeetingPatch({ title: " " }).fields.title, "Title is required");
});

test("availability drafts validate dates, ids and ranges", () => {
  assert.deepEqual(parseAvailabilityDraft(availabilityDraft), { ok: true, value: availabilityDraft });
  assert.ok(parseAvailabilityDraft({ ...availabilityDraft, available_date: "2026-02-30" }).fields.available_date);
  assert.ok(parseAvailabilityDraft({ ...availabilityDraft, meeting_id: "not-a-uuid" }).fields.meeting_id);
  assert.equal(
    parseAvailabilityDraft({ ...availabilityDraft, start_time: "17:00", end_time: "09:00" }).fields.end_time,
    "End time must be after start time"
  );
});

test("availability drafts normalise seconds and accept the end of day", () => {
  const result = parseAvailabilityDraft({ ...availabilityDraft, start_time: "23:30:00", end_time: END_OF_DAY });
  assert.deepEqual(result, {
    ok: true,
    value: { ...availabilityDraft, start_time: "23:30", end_time: "23:59" },
  });
});

test("response parsers reject incomplete payloads and normalise Postgres times", () => {
  const meeting = {
    id: meetingId,
    title: "Planning",
    creator_name: "Sean",
    created_at: "2026-08-09T00:00:00.000Z",
    updated_at: "2026-08-09T00:00:00.000Z",
  };
  assert.deepEqual(parseMeeting(meeting), meeting);
  assert.throws(() => parseMeeting({ ...meeting, updated_at: undefined }));
  assert.throws(() => parseAvailabilityList({}));

  const row = { ...availabilityDraft, id: "a", start_time: "09:00:00", end_time: "10:30:00", created_at: "x" };
  assert.equal(parseAvailability(row).end_time, "10:30");
});

test("time of day parsing", () => {
  assert.equal(parseTimeOfDay("00:00"), 0);
  assert.equal(parseTimeOfDay("23:59:59"), 23 * 60 + 59);
  assert.equal(parseTimeOfDay("24:00"), null);
  assert.equal(normalizeTimeOfDay("7:00"), null);
});
