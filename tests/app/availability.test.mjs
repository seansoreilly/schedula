import assert from "node:assert/strict";
import test from "node:test";

import {
  createEndTimeOptions,
  createStartTimeOptions,
  defaultEndTime,
  findCommonAvailabilitySlots,
  formatDateLabel,
  formatTimeLabel,
  getAvailabilityDefaults,
  groupAvailabilityByDate,
} from "../../src/lib/availability.ts";

function availability(overrides) {
  return {
    id: crypto.randomUUID(),
    meeting_id: "11111111-1111-4111-8111-111111111111",
    participant_name: "Alice",
    available_date: "2026-01-02",
    start_time: "09:00",
    end_time: "10:00",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("defaultEndTime caps at the end of the day instead of wrapping to 00:00", () => {
  assert.equal(defaultEndTime("23:30"), "23:59");
  assert.equal(defaultEndTime("23:45"), "23:59");
});

test("defaultEndTime adds 30 minutes", () => {
  assert.equal(defaultEndTime("09:00"), "09:30");
  assert.equal(defaultEndTime("09:30"), "10:00");
});

test("defaultEndTime returns an empty string for an unusable start", () => {
  assert.equal(defaultEndTime(""), "");
});

test("availability defaults use the next local half-hour", () => {
  assert.deepEqual(
    getAvailabilityDefaults(new Date(2026, 0, 2, 9, 1)),
    {
      availableDate: "2026-01-02",
      startTime: "09:30",
      endTime: "10:00",
    }
  );
});

test("availability defaults advance the local date across midnight", () => {
  assert.deepEqual(
    getAvailabilityDefaults(new Date(2026, 0, 2, 23, 31)),
    {
      availableDate: "2026-01-03",
      startTime: "00:00",
      endTime: "00:30",
    }
  );
});

test("start time options cover every half-hour in a day", () => {
  const options = createStartTimeOptions();
  assert.equal(options.length, 48);
  assert.equal(options[0], "00:00");
  assert.equal(options.at(-1), "23:30");
});

test("end time options run from 00:30 to 23:30 and finish with 23:59", () => {
  const options = createEndTimeOptions();
  assert.equal(options.length, 48);
  assert.equal(options[0], "00:30");
  assert.equal(options.at(-2), "23:30");
  assert.equal(options.at(-1), "23:59");
});

test("formatTimeLabel renders 12-hour labels", () => {
  assert.equal(formatTimeLabel("00:00"), "12:00 AM");
  assert.equal(formatTimeLabel("12:00"), "12:00 PM");
  assert.equal(formatTimeLabel("13:30"), "1:30 PM");
  assert.equal(formatTimeLabel("23:59"), "11:59 PM");
});

test("formatDateLabel renders a long local date", () => {
  assert.equal(formatDateLabel("2026-01-02"), "Friday, January 2, 2026");
});

test("groupAvailabilityByDate sorts dates and sorts rows by start time", () => {
  const rows = [
    availability({ id: "c", available_date: "2026-01-03", start_time: "08:00", end_time: "09:00" }),
    availability({ id: "b", start_time: "13:00", end_time: "14:00" }),
    availability({ id: "a", start_time: "09:00", end_time: "10:00" }),
  ];
  const groups = groupAvailabilityByDate(rows);

  assert.deepEqual(groups.map((group) => group.date), ["2026-01-02", "2026-01-03"]);
  assert.deepEqual(groups[0].entries.map((entry) => entry.id), ["a", "b"]);
  assert.deepEqual(rows.map((row) => row.id), ["c", "b", "a"], "input is not mutated");
});

test("duplicate rows from one participant do not create an overlap", () => {
  const slots = findCommonAvailabilitySlots([
    availability({ id: "a", start_time: "09:00", end_time: "11:00" }),
    availability({ id: "b", start_time: "10:00", end_time: "12:00" }),
  ]);

  assert.deepEqual(slots, []);
});

test("overlap slots require and report distinct participants", () => {
  const slots = findCommonAvailabilitySlots([
    availability({ id: "a", start_time: "09:00", end_time: "11:00" }),
    availability({
      id: "b",
      participant_name: "Bob",
      start_time: "10:00",
      end_time: "12:00",
    }),
  ]);

  assert.deepEqual(slots, [
    {
      date: "2026-01-02",
      startTime: "10:00",
      endTime: "11:00",
      participants: ["Alice", "Bob"],
    },
  ]);
});
