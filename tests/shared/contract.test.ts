import { describe, expect, test } from "vitest";
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
import type { DraftResult, FieldErrors } from "../../shared/contract.js";
import { END_OF_DAY, normalizeTimeOfDay, parseTimeOfDay } from "../../shared/time-of-day.js";

const meetingId = "11111111-1111-4111-8111-111111111111";
const availabilityDraft = {
  meeting_id: meetingId,
  participant_name: "Sean",
  available_date: "2026-08-10",
  start_time: "09:00",
  end_time: "10:00",
};

function rejection<T>(result: DraftResult<T>): { error: string; fields: FieldErrors } {
  if (result.ok) {
    throw new Error("expected the draft to be rejected");
  }
  return result;
}

describe("meeting drafts", () => {
  test("are trimmed, and unknown fields are rejected with a reason", () => {
    expect(parseMeetingDraft({ title: " Planning ", creator_name: " Sean " })).toEqual({
      ok: true,
      value: { title: "Planning", creator_name: "Sean" },
    });

    const result = rejection(parseMeetingDraft({ title: "Planning", creator_name: "Sean", admin: true }));
    expect(result.fields.admin).toBe("admin is not an accepted field");
  });

  test("missing fields report a 'required' reason (E2E asserts on it)", () => {
    expect(rejection(parseMeetingDraft({ title: "", creator_name: "Sean" })).error).toBe("Title is required");
    expect(rejection(parseMeetingDraft(null)).error).toMatch(/required/);
  });

  test("over-long text reports the bound instead of 'required'", () => {
    const title = rejection(parseMeetingDraft({ title: "x".repeat(TITLE_MAX_LENGTH + 1), creator_name: "Sean" }));
    expect(title.fields.title).toBe(`Title must be ${TITLE_MAX_LENGTH} characters or fewer`);

    const name = rejection(
      parseAvailabilityDraft({ ...availabilityDraft, participant_name: "y".repeat(NAME_MAX_LENGTH + 1) })
    );
    expect(name.fields.participant_name).toMatch(/characters or fewer/);
  });

  test("patches need at least one known field", () => {
    expect(parseMeetingPatch({ title: " New " })).toEqual({ ok: true, value: { title: "New" } });
    expect(rejection(parseMeetingPatch({})).error).toBe("No fields to update");
    expect(rejection(parseMeetingPatch({ title: " " })).fields.title).toBe("Title is required");
  });
});

describe("availability drafts", () => {
  test("validate dates, ids and ranges", () => {
    expect(parseAvailabilityDraft(availabilityDraft)).toEqual({ ok: true, value: availabilityDraft });
    expect(rejection(parseAvailabilityDraft({ ...availabilityDraft, available_date: "2026-02-30" })).fields)
      .toHaveProperty("available_date");
    expect(rejection(parseAvailabilityDraft({ ...availabilityDraft, meeting_id: "not-a-uuid" })).fields)
      .toHaveProperty("meeting_id");
    expect(
      rejection(parseAvailabilityDraft({ ...availabilityDraft, start_time: "17:00", end_time: "09:00" })).fields.end_time
    ).toBe("End time must be after start time");
  });

  test("normalise seconds and accept the end of day", () => {
    expect(parseAvailabilityDraft({ ...availabilityDraft, start_time: "23:30:00", end_time: END_OF_DAY })).toEqual({
      ok: true,
      value: { ...availabilityDraft, start_time: "23:30", end_time: "23:59" },
    });
  });
});

describe("response parsers", () => {
  const meeting = {
    id: meetingId,
    title: "Planning",
    creator_name: "Sean",
    created_at: "2026-08-09T00:00:00.000Z",
    updated_at: "2026-08-09T00:00:00.000Z",
  };

  test("reject incomplete payloads", () => {
    expect(parseMeeting(meeting)).toEqual(meeting);
    expect(() => parseMeeting({ ...meeting, updated_at: undefined })).toThrow();
    expect(() => parseAvailabilityList({})).toThrow();
  });

  test("normalise Postgres times to HH:MM", () => {
    const row = { ...availabilityDraft, id: "a", start_time: "09:00:00", end_time: "10:30:00", created_at: "x" };
    expect(parseAvailability(row)).toMatchObject({ start_time: "09:00", end_time: "10:30" });
  });
});

test("time of day parsing", () => {
  expect(parseTimeOfDay("00:00")).toBe(0);
  expect(parseTimeOfDay("23:59:59")).toBe(23 * 60 + 59);
  expect(parseTimeOfDay("24:00")).toBeNull();
  expect(normalizeTimeOfDay("7:00")).toBeNull();
});
