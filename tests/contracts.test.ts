import assert from "node:assert/strict";
import { test } from "vitest";

import {
  validateAvailabilityCreate,
  validateMeetingCreate,
  validateMeetingUpdate,
} from "../api/_lib/validation";
import {
  parseAvailabilityList,
  parseMeeting,
} from "../src/integrations/api/types";

const meetingId = "11111111-1111-4111-8111-111111111111";

test("meeting validation trims bounded input and rejects unknown fields", () => {
  assert.deepEqual(validateMeetingCreate({ title: " Planning ", creator_name: " Sean " }), {
    ok: true,
    value: { title: "Planning", creator_name: "Sean" },
  });
  assert.equal(
    validateMeetingCreate({ title: "Planning", creator_name: "Sean", admin: true }).ok,
    false
  );
  assert.equal(validateMeetingUpdate({}).ok, false);
});

test("availability validation rejects malformed and reversed ranges", () => {
  const validInput = {
    meeting_id: meetingId,
    participant_name: "Sean",
    available_date: "2026-08-10",
    start_time: "09:00",
    end_time: "10:00",
  };

  assert.equal(validateAvailabilityCreate(validInput).ok, true);
  assert.equal(
    validateAvailabilityCreate({ ...validInput, available_date: "2026-02-30" }).ok,
    false
  );
  assert.equal(
    validateAvailabilityCreate({ ...validInput, start_time: "17:00", end_time: "09:00" }).ok,
    false
  );
  assert.equal(
    validateAvailabilityCreate({ ...validInput, meeting_id: "not-a-uuid" }).ok,
    false
  );
});

test("API response parsers reject incomplete contracts", () => {
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
});
