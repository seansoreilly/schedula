import assert from "node:assert/strict";
import test from "node:test";
import { createAvailabilityHandler } from "../../api/_lib/availability-route.js";
import { createMeetingHandler } from "../../api/_lib/meeting-route.js";
import { createMeetingsHandler } from "../../api/_lib/meetings-route.js";
import { createMemoryStore } from "../../api/_lib/memory-store.js";

const unknownId = "99999999-9999-4999-8999-999999999999";

function fakeRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    headers: {},
    ended: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
    setHeader(name, value) {
      res.headers[name] = value;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

async function call(handler, req) {
  const res = fakeRes();
  await handler({ method: "GET", query: {}, body: undefined, ...req }, res);
  return res;
}

function setup() {
  const store = createMemoryStore();
  return {
    store,
    meetings: createMeetingsHandler(store),
    meeting: createMeetingHandler(store),
    availability: createAvailabilityHandler(store),
  };
}

async function createMeeting(app) {
  const res = await call(app.meetings, {
    method: "POST",
    body: { title: "Planning", creator_name: "Sean" },
  });
  return res.body;
}

test("POST /availability for an unknown meeting → 404 via the in-memory store", async () => {
  const app = setup();
  const res = await call(app.availability, {
    method: "POST",
    body: {
      meeting_id: unknownId,
      participant_name: "Sean",
      available_date: "2026-08-10",
      start_time: "09:00",
      end_time: "10:00",
    },
  });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Meeting not found" });
});

test("POST /meetings creates a meeting with 201", async () => {
  const app = setup();
  const res = await call(app.meetings, {
    method: "POST",
    body: { title: " Planning ", creator_name: "Sean" },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.title, "Planning");
  assert.equal(res.body.creator_name, "Sean");
  assert.match(res.body.id, /^[0-9a-f-]{36}$/);
});

test("POST /meetings with missing fields → 400 with fields", async () => {
  const app = setup();
  const res = await call(app.meetings, { method: "POST", body: { title: "" } });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /required/);
  assert.ok(res.body.fields.title);
  assert.ok(res.body.fields.creator_name);
});

test("GET /meetings/:id → 200, 404 for unknown and non-UUID ids", async () => {
  const app = setup();
  const created = await createMeeting(app);

  const found = await call(app.meeting, { query: { id: created.id } });
  assert.equal(found.statusCode, 200);
  assert.deepEqual(found.body, created);

  const missing = await call(app.meeting, { query: { id: unknownId } });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { error: "Meeting not found" });

  const malformed = await call(app.meeting, { query: { id: "nope" } });
  assert.equal(malformed.statusCode, 404);
});

test("PUT /meetings/:id renames; 404 unknown; 400 non-UUID and empty patch", async () => {
  const app = setup();
  const created = await createMeeting(app);

  const renamed = await call(app.meeting, {
    method: "PUT",
    query: { id: created.id },
    body: { title: "Retro" },
  });
  assert.equal(renamed.statusCode, 200);
  assert.equal(renamed.body.title, "Retro");
  assert.equal(renamed.body.creator_name, "Sean");

  const unknown = await call(app.meeting, {
    method: "PUT",
    query: { id: unknownId },
    body: { title: "Retro" },
  });
  assert.equal(unknown.statusCode, 404);

  const malformed = await call(app.meeting, {
    method: "PUT",
    query: { id: "nope" },
    body: { title: "Retro" },
  });
  assert.equal(malformed.statusCode, 400);

  const empty = await call(app.meeting, { method: "PUT", query: { id: created.id }, body: {} });
  assert.equal(empty.statusCode, 400);
  assert.equal(empty.body.error, "No fields to update");
});

test("availability: add normalises times, list orders by date then start", async () => {
  const app = setup();
  const meeting = await createMeeting(app);
  const draft = (available_date, start_time, end_time) => ({
    meeting_id: meeting.id,
    participant_name: "Sean",
    available_date,
    start_time,
    end_time,
  });

  const first = await call(app.availability, {
    method: "POST",
    body: draft("2026-08-11", "09:00:00", "10:00:00"),
  });
  assert.equal(first.statusCode, 201);
  assert.equal(first.body.start_time, "09:00");
  assert.equal(first.body.end_time, "10:00");

  await call(app.availability, { method: "POST", body: draft("2026-08-10", "13:00", "14:00") });
  await call(app.availability, { method: "POST", body: draft("2026-08-10", "08:00", "09:00") });

  const list = await call(app.availability, { query: { meeting_id: meeting.id } });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(
    list.body.map((slot) => [slot.available_date, slot.start_time]),
    [["2026-08-10", "08:00"], ["2026-08-10", "13:00"], ["2026-08-11", "09:00"]],
  );
});

test("availability: invalid draft → 400, bad meeting_id query → 400, unknown meeting list → 404", async () => {
  const app = setup();

  const invalid = await call(app.availability, { method: "POST", body: { meeting_id: "x" } });
  assert.equal(invalid.statusCode, 400);
  assert.ok(invalid.body.fields.meeting_id);

  const badQuery = await call(app.availability, { query: { meeting_id: "x" } });
  assert.equal(badQuery.statusCode, 400);

  const unknown = await call(app.availability, { query: { meeting_id: unknownId } });
  assert.equal(unknown.statusCode, 404);
  assert.deepEqual(unknown.body, { error: "Meeting not found" });
});

test("OPTIONS → 200 with CORS and Allow headers; other verbs → 405", async () => {
  const app = setup();

  const options = await call(app.meetings, { method: "OPTIONS" });
  assert.equal(options.statusCode, 200);
  assert.ok(options.ended);
  assert.equal(options.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(options.headers.Allow, "POST, OPTIONS");

  const meetingsGet = await call(app.meetings, { method: "GET" });
  assert.equal(meetingsGet.statusCode, 405);
  assert.deepEqual(meetingsGet.body, { error: "Method not allowed" });

  const meetingDelete = await call(app.meeting, { method: "DELETE", query: { id: unknownId } });
  assert.equal(meetingDelete.statusCode, 405);

  const availabilityPut = await call(app.availability, { method: "PUT" });
  assert.equal(availabilityPut.statusCode, 405);
});

test("a throwing store maps to a 500 'Internal server error'", async () => {
  const store = createMemoryStore();
  store.getMeeting = async () => {
    throw new Error("boom");
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = await call(createMeetingHandler(store), { query: { id: unknownId } });
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Internal server error" });
  } finally {
    console.error = originalError;
  }
});
