import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../../src/integrations/api/client.ts";
import { availabilityQueries, meetingQueries } from "../../src/integrations/api/queries.ts";

const MEETING_ID = "11111111-1111-4111-8111-111111111111";

function respondWith(status, body) {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new Response(body === undefined ? "" : JSON.stringify(body), { status });
  };
  return requests;
}

const meetingRow = {
  id: MEETING_ID,
  title: "Planning",
  creator_name: "Alice",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

test("ApiError exposes the server's field errors from a 400", async () => {
  respondWith(400, { error: "Title is required", fields: { title: "Title is required" } });
  await assert.rejects(
    meetingQueries.create({ title: "", creator_name: "Alice" }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.message, "Title is required");
      assert.deepEqual(error.fields, { title: "Title is required" });
      return true;
    }
  );
});

test("ApiError has no fields when the body does not carry them", async () => {
  respondWith(500, { error: "Server error" });
  await assert.rejects(meetingQueries.findById(MEETING_ID), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.fields, undefined);
    return true;
  });
});

test("findById returns null on 404 and parses the meeting otherwise", async () => {
  respondWith(404, { error: "Meeting not found" });
  assert.equal(await meetingQueries.findById(MEETING_ID), null);

  const requests = respondWith(200, meetingRow);
  assert.deepEqual(await meetingQueries.findById(MEETING_ID), meetingRow);
  assert.equal(requests[0].url, `/api/meetings/${MEETING_ID}`);
});

test("update sends a PUT and maps 404 to null", async () => {
  const requests = respondWith(200, meetingRow);
  await meetingQueries.update(MEETING_ID, { title: "Planning" });
  assert.equal(requests[0].init.method, "PUT");
  assert.equal(requests[0].init.body, JSON.stringify({ title: "Planning" }));

  respondWith(404, { error: "Meeting not found" });
  assert.equal(await meetingQueries.update(MEETING_ID, { title: "x" }), null);
});

test("availability responses are parsed through the contract (HH:MM:SS is normalised)", async () => {
  respondWith(200, [
    {
      id: "a",
      meeting_id: MEETING_ID,
      participant_name: "Alice",
      available_date: "2026-01-02",
      start_time: "09:00:00",
      end_time: "10:00:00",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ]);
  const rows = await availabilityQueries.findByMeetingId(MEETING_ID);
  assert.equal(rows[0].start_time, "09:00");

  respondWith(200, { not: "a list" });
  await assert.rejects(availabilityQueries.findByMeetingId(MEETING_ID));
});
