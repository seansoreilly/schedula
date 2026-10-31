import assert from "node:assert/strict";
import test from "node:test";

import {
  createTimeOptions,
  findCommonAvailabilitySlots,
  getAvailabilityDefaults,
} from "../src/lib/availability.ts";

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

test("time options cover every half-hour in a day", () => {
  const options = createTimeOptions();
  assert.equal(options.length, 48);
  assert.equal(options[0], "00:00");
  assert.equal(options.at(-1), "23:30");
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
