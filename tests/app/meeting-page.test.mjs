import assert from "node:assert/strict";
import test from "node:test";

import {
  initialMeetingPageState,
  loadMeetingPage,
  meetingPageReducer,
  renameMeeting,
  submitAvailability,
} from "../../src/lib/meeting-page.ts";

const MEETING_ID = "11111111-1111-4111-8111-111111111111";

function meeting(overrides) {
  return {
    id: MEETING_ID,
    title: "Planning",
    creator_name: "Alice",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function row(overrides) {
  return {
    id: crypto.randomUUID(),
    meeting_id: MEETING_ID,
    participant_name: "Alice",
    available_date: "2026-01-02",
    start_time: "09:00",
    end_time: "10:00",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function ready(availability = []) {
  return meetingPageReducer(initialMeetingPageState, {
    type: "loaded",
    meeting: meeting(),
    availability,
  });
}

test("the page starts in the loading state", () => {
  assert.equal(initialMeetingPageState.status, "loading");
  assert.equal(initialMeetingPageState.meeting, null);
  assert.deepEqual(initialMeetingPageState.availability, []);
});

test("loaded makes the page ready with the data", () => {
  const state = ready([row({ id: "a" })]);
  assert.equal(state.status, "ready");
  assert.equal(state.meeting?.title, "Planning");
  assert.equal(state.availability.length, 1);
});

test("not-found and failed clear the data", () => {
  assert.deepEqual(meetingPageReducer(ready([row({})]), { type: "not-found" }), {
    status: "not-found",
    meeting: null,
    availability: [],
  });
  assert.equal(meetingPageReducer(ready([row({})]), { type: "failed" }).status, "error");
});

test("loading resets a ready page", () => {
  assert.deepEqual(
    meetingPageReducer(ready([row({})]), { type: "loading" }),
    initialMeetingPageState
  );
});

test("renamed replaces the meeting and keeps the availability", () => {
  const state = meetingPageReducer(ready([row({ id: "a" })]), {
    type: "renamed",
    meeting: meeting({ title: "New title" }),
  });
  assert.equal(state.meeting?.title, "New title");
  assert.equal(state.availability.length, 1);
});

test("availability-added appends in date then start-time order", () => {
  let state = ready([
    row({ id: "late", start_time: "13:00", end_time: "14:00" }),
    row({ id: "next-day", available_date: "2026-01-03" }),
  ]);
  state = meetingPageReducer(state, {
    type: "availability-added",
    availability: row({ id: "early", start_time: "08:00", end_time: "09:00" }),
  });
  assert.deepEqual(state.availability.map((entry) => entry.id), ["early", "late", "next-day"]);
});

test("availability-added ignores a row for another meeting or a repeated row", () => {
  const first = row({ id: "a" });
  let state = ready([first]);
  state = meetingPageReducer(state, { type: "availability-added", availability: first });
  state = meetingPageReducer(state, {
    type: "availability-added",
    availability: row({ id: "x", meeting_id: "22222222-2222-4222-8222-222222222222" }),
  });
  assert.equal(state.availability.length, 1);
});

function fakeQueries() {
  const calls = [];
  return {
    calls,
    meetings: {
      findById: async (id) => {
        calls.push(["findById", id]);
        return meeting();
      },
      update: async (id, patch) => {
        calls.push(["update", id, patch]);
        return meeting({ title: patch.title });
      },
    },
    availability: {
      findByMeetingId: async (id) => {
        calls.push(["findByMeetingId", id]);
        return [row({ id: "a" })];
      },
      create: async (draft) => {
        calls.push(["create", draft]);
        return row({ id: "new", ...draft });
      },
    },
  };
}

test("loadMeetingPage returns a loaded event", async () => {
  const event = await loadMeetingPage(fakeQueries(), MEETING_ID);
  assert.equal(event.type, "loaded");
  assert.equal(event.availability.length, 1);
});

test("loadMeetingPage reports not-found for a missing id or a missing meeting", async () => {
  const queries = fakeQueries();
  assert.deepEqual(await loadMeetingPage(queries, undefined), { type: "not-found" });
  assert.equal(queries.calls.length, 0);

  queries.meetings.findById = async () => null;
  assert.deepEqual(await loadMeetingPage(queries, MEETING_ID), { type: "not-found" });
});

test("loadMeetingPage reports failed when a query throws", async () => {
  const queries = fakeQueries();
  queries.availability.findByMeetingId = async () => {
    throw new Error("boom");
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await loadMeetingPage(queries, MEETING_ID), { type: "failed" });
  } finally {
    console.error = originalError;
  }
});

test("renameMeeting returns renamed, or not-found when the meeting is gone", async () => {
  const queries = fakeQueries();
  const event = await renameMeeting(queries, MEETING_ID, "Offsite");
  assert.equal(event.type, "renamed");
  assert.equal(event.meeting.title, "Offsite");

  queries.meetings.update = async () => null;
  assert.deepEqual(await renameMeeting(queries, MEETING_ID, "Offsite"), { type: "not-found" });
});

test("submitAvailability creates the row without re-fetching the meeting", async () => {
  const queries = fakeQueries();
  const draft = {
    meeting_id: MEETING_ID,
    participant_name: "Bob",
    available_date: "2026-01-02",
    start_time: "10:00",
    end_time: "11:00",
  };
  const event = await submitAvailability(queries, draft);

  assert.equal(event.type, "availability-added");
  assert.equal(event.availability.participant_name, "Bob");
  assert.deepEqual(queries.calls.map((call) => call[0]), ["create"]);
});
