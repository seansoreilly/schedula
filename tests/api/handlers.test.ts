import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AvailabilityDraft } from "../../shared/contract";
import { createAvailabilityHandler } from "../../api/_lib/availability-route";
import { createMeetingHandler } from "../../api/_lib/meeting-route";
import { createMeetingsHandler } from "../../api/_lib/meetings-route";
import { hashOwnerToken } from "../../api/_lib/ownerToken";
import { createMemoryStore } from "../../api/_lib/memory-store";
import { resetRateLimitForTests } from "../../api/_lib/rateLimit";
import { MAX_AVAILABILITY_ROWS_PER_MEETING } from "../../api/_lib/store";
import type { MeetingStore } from "../../api/_lib/store";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

interface CapturedResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

function invoke(
  handler: Handler,
  request: { method: string; body?: unknown; query?: Record<string, string>; headers?: Record<string, string> },
): Promise<CapturedResponse> {
  const captured: CapturedResponse = { statusCode: 200, body: undefined, headers: {} };
  const res = {
    setHeader(name: string, value: string) {
      captured.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
    end() {
      return res;
    },
  };
  const req = { query: {}, ...request };

  return handler(req as unknown as VercelRequest, res as unknown as VercelResponse).then(() => captured);
}

const unknownId = "22222222-2222-4222-8222-222222222222";

let store: MeetingStore;

beforeEach(() => {
  store = createMemoryStore();
  resetRateLimitForTests();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function seedMeeting(): Promise<string> {
  return (await store.createMeeting({ title: "Planning", creator_name: "Sean" })).id;
}

function slot(meetingId: string, overrides: Partial<AvailabilityDraft> = {}): AvailabilityDraft {
  return {
    meeting_id: meetingId,
    participant_name: "Alice",
    available_date: "2026-11-02",
    start_time: "09:00",
    end_time: "09:30",
    ...overrides,
  };
}

function throwingStore(): MeetingStore {
  const fail = (): never => {
    throw new Error("database exploded");
  };
  return {
    createMeeting: fail,
    getOwnerTokenHash: fail,
    getMeeting: fail,
    updateMeeting: fail,
    listAvailability: fail,
    addAvailability: fail,
  };
}

describe("POST /api/availability", () => {
  test("at the cap returns 409 via the memory store", async () => {
    const meetingId = await seedMeeting();
    for (let i = 0; i < MAX_AVAILABILITY_ROWS_PER_MEETING; i++) {
      await store.addAvailability(slot(meetingId));
    }

    const response = await invoke(createAvailabilityHandler(store), { method: "POST", body: slot(meetingId) });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({ error: "This meeting has reached its availability limit" });
    const listed = await store.listAvailability(meetingId);
    expect(listed.kind === "ok" && listed.value.length).toBe(MAX_AVAILABILITY_ROWS_PER_MEETING);
  });

  test("the cap is per meeting", async () => {
    const full = await seedMeeting();
    const other = await seedMeeting();
    for (let i = 0; i < MAX_AVAILABILITY_ROWS_PER_MEETING; i++) {
      await store.addAvailability(slot(full));
    }

    const response = await invoke(createAvailabilityHandler(store), { method: "POST", body: slot(other) });
    expect(response.statusCode).toBe(201);
  });

  test("creates availability and returns 201", async () => {
    const meetingId = await seedMeeting();
    const response = await invoke(createAvailabilityHandler(store), { method: "POST", body: slot(meetingId) });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject(slot(meetingId));
  });

  test("returns 404 when the meeting does not exist", async () => {
    const response = await invoke(createAvailabilityHandler(store), { method: "POST", body: slot(unknownId) });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Meeting not found" });
  });

  test("rejects a reversed time range with 400 and field errors, storing nothing", async () => {
    const meetingId = await seedMeeting();
    const response = await invoke(createAvailabilityHandler(store), {
      method: "POST",
      body: slot(meetingId, { start_time: "10:00", end_time: "09:00" }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ error: expect.any(String), fields: { end_time: expect.any(String) } });
    const listed = await store.listAvailability(meetingId);
    expect(listed.kind === "ok" && listed.value).toEqual([]);
  });

  test("rate limits POSTs per IP with 429 and Retry-After", async () => {
    const meetingId = await seedMeeting();
    const handler = createAvailabilityHandler(store);
    const request = { method: "POST", body: slot(meetingId), headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } };

    for (let i = 0; i < 20; i++) {
      expect((await invoke(handler, request)).statusCode).toBe(201);
    }
    const blocked = await invoke(handler, request);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("60");

    const other = await invoke(handler, { ...request, headers: { "x-forwarded-for": "203.0.113.10" } });
    expect(other.statusCode).toBe(201);
  });

  test("a thrown store failure is a 500 that hides details", async () => {
    const response = await invoke(createAvailabilityHandler(throwingStore()), {
      method: "POST",
      body: slot(unknownId),
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
});

describe("GET /api/availability", () => {
  test("lists availability ordered by date then start time", async () => {
    const meetingId = await seedMeeting();
    const handler = createAvailabilityHandler(store);
    await store.addAvailability(slot(meetingId, { available_date: "2026-11-03", start_time: "08:00", end_time: "09:00" }));
    await store.addAvailability(slot(meetingId, { start_time: "10:00", end_time: "11:00" }));
    await store.addAvailability(slot(meetingId));

    const response = await invoke(handler, { method: "GET", query: { meeting_id: meetingId } });

    expect(response.statusCode).toBe(200);
    const rows = response.body as Array<{ available_date: string; start_time: string }>;
    expect(rows.map((row) => `${row.available_date} ${row.start_time}`)).toEqual([
      "2026-11-02 09:00",
      "2026-11-02 10:00",
      "2026-11-03 08:00",
    ]);
  });

  test("returns an empty list for a meeting without availability", async () => {
    const meetingId = await seedMeeting();
    const response = await invoke(createAvailabilityHandler(store), { method: "GET", query: { meeting_id: meetingId } });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("returns 404 for an unknown meeting", async () => {
    const response = await invoke(createAvailabilityHandler(store), { method: "GET", query: { meeting_id: unknownId } });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Meeting not found" });
  });

  test("requires a UUID meeting_id", async () => {
    const response = await invoke(createAvailabilityHandler(store), { method: "GET", query: { meeting_id: "x" } });

    expect(response.statusCode).toBe(400);
  });

  test("answers OPTIONS and rejects other methods with 405", async () => {
    const handler = createAvailabilityHandler(store);
    const preflight = await invoke(handler, { method: "OPTIONS" });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.headers["access-control-allow-methods"]).toBe("GET, POST, OPTIONS");

    expect((await invoke(handler, { method: "DELETE" })).statusCode).toBe(405);
  });

  test("a thrown store failure is a 500", async () => {
    const response = await invoke(createAvailabilityHandler(throwingStore()), {
      method: "GET",
      query: { meeting_id: unknownId },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
});

describe("POST /api/meetings", () => {
  test("stores trimmed input and returns 201", async () => {
    const response = await invoke(createMeetingsHandler(store), {
      method: "POST",
      body: { title: " Planning ", creator_name: " Sean " },
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({ title: "Planning", creator_name: "Sean" });
    const created = response.body as { id: string };
    expect(await store.getMeeting(created.id)).toMatchObject({ kind: "ok", value: { title: "Planning" } });
  });

  test("rejects invalid input with 400, a 'required' error and field errors, storing nothing", async () => {
    const spy = vi.spyOn(store, "createMeeting");
    const response = await invoke(createMeetingsHandler(store), {
      method: "POST",
      body: { title: "", creator_name: "Sean" },
    });

    expect(response.statusCode).toBe(400);
    expect((response.body as { error: string }).error).toContain("required");
    expect(response.body).toMatchObject({ fields: { title: expect.any(String) } });
    expect(spy).not.toHaveBeenCalled();
  });

  test("a thrown store failure is a 500 that hides details", async () => {
    const response = await invoke(createMeetingsHandler(throwingStore()), {
      method: "POST",
      body: { title: "Planning", creator_name: "Sean" },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });

  test("rate limits POSTs per IP with 429 before reaching the store", async () => {
    const spy = vi.spyOn(store, "createMeeting");
    const handler = createMeetingsHandler(store);
    const request = {
      method: "POST",
      body: { title: "Planning", creator_name: "Sean" },
      headers: { "x-forwarded-for": "198.51.100.7" },
    };

    for (let i = 0; i < 20; i++) {
      expect((await invoke(handler, request)).statusCode).toBe(201);
    }
    expect((await invoke(handler, request)).statusCode).toBe(429);
    expect(spy).toHaveBeenCalledTimes(20);
  });

  test("answers CORS preflight and rejects other methods", async () => {
    const handler = createMeetingsHandler(store);
    const preflight = await invoke(handler, { method: "OPTIONS" });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.headers["access-control-allow-methods"]).toBe("POST, OPTIONS");

    expect((await invoke(handler, { method: "GET" })).statusCode).toBe(405);
  });
});

describe("CORS origin allowlist", () => {
  const preflight = (origin: string) => ({ method: "OPTIONS", headers: { origin } });

  test("echoes production and own-preview origins with Vary: Origin, keeping OPTIONS handling", async () => {
    const handler = createMeetingsHandler(store);
    for (const origin of [
      "https://www.schedula.xyz",
      "https://schedula.xyz",
      "https://schedula-abc123xyz-melbourne-computing.vercel.app",
      "https://schedula-git-security-weekly-melbourne-computing.vercel.app",
    ]) {
      const res = await invoke(handler, preflight(origin));
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
      expect(res.headers.vary).toBe("Origin");
    }
  });

  test("omits allow-origin for foreign and look-alike origins, never '*'", async () => {
    const handler = createMeetingsHandler(store);
    for (const origin of [
      "https://evil.example",
      "https://evil.vercel.app",
      "https://other-abc-melbourne-computing.vercel.app",
      "https://schedula-abc-other-team.vercel.app",
      "https://schedula-abc-melbourne-computing.vercel.app.evil.com",
      "http://schedula-abc-melbourne-computing.vercel.app",
      "https://schedula.xyz.evil.com",
      "https://evil-schedula.xyz",
    ]) {
      const res = await invoke(handler, preflight(origin));
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      expect(res.headers.vary).toBe("Origin");
    }
  });

  test("sets no allow-origin for requests without an Origin header", async () => {
    const res = await invoke(createMeetingsHandler(store), { method: "OPTIONS" });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers.vary).toBe("Origin");
  });

  test("applies to the other route factories too", async () => {
    for (const handler of [createMeetingHandler(store), createAvailabilityHandler(store)]) {
      const res = await invoke(handler, preflight("https://schedula.xyz"));
      expect(res.headers["access-control-allow-origin"]).toBe("https://schedula.xyz");
    }
  });
});

describe("/api/meetings/[id]", () => {
  test("GET returns the meeting", async () => {
    const id = await seedMeeting();
    const response = await invoke(createMeetingHandler(store), { method: "GET", query: { id } });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ id, title: "Planning" });
  });

  test("GET non-UUID id is 404 without touching the store", async () => {
    const spy = vi.spyOn(store, "getMeeting");
    const response = await invoke(createMeetingHandler(store), { method: "GET", query: { id: "nope" } });

    expect(response.statusCode).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });

  test("GET unknown meeting is 404 'Meeting not found'", async () => {
    const response = await invoke(createMeetingHandler(store), { method: "GET", query: { id: unknownId } });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Meeting not found" });
  });

  test("PUT non-UUID id is 400", async () => {
    const response = await invoke(createMeetingHandler(store), {
      method: "PUT",
      query: { id: "nope" },
      body: { title: "x" },
    });

    expect(response.statusCode).toBe(400);
  });

  test("PUT updates only validated fields and stamps updated_at", async () => {
    const id = await seedMeeting();
    const before = await store.getMeeting(id);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const response = await invoke(createMeetingHandler(store), {
      method: "PUT",
      query: { id },
      body: { title: " New " },
    });

    expect(response.statusCode).toBe(200);
    const updated = response.body as { title: string; creator_name: string; updated_at: string };
    expect(updated.title).toBe("New");
    expect(updated.creator_name).toBe("Sean");
    expect(before.kind === "ok" && updated.updated_at > before.value.updated_at).toBe(true);
  });

  test("PUT on an unknown meeting is 404", async () => {
    const response = await invoke(createMeetingHandler(store), {
      method: "PUT",
      query: { id: unknownId },
      body: { title: "New" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Meeting not found" });
  });

  test("POST /api/meetings returns the owner token once and stores only its hash", async () => {
    const response = await invoke(createMeetingsHandler(store), {
      method: "POST",
      body: { title: "Planning", creator_name: "Sean" },
    });

    expect(response.statusCode).toBe(201);
    const created = response.body as { id: string; owner_token: string };
    expect(created.owner_token.length).toBeGreaterThanOrEqual(40);
    const stored = await store.getOwnerTokenHash(created.id);
    expect(stored).toEqual({ kind: "ok", value: hashOwnerToken(created.owner_token) });

    const fetched = await invoke(createMeetingHandler(store), { method: "GET", query: { id: created.id } });
    expect(JSON.stringify(fetched.body)).not.toContain(created.owner_token);
    expect(fetched.body).not.toHaveProperty("owner_token");
  });

  describe("PUT owner token", () => {
    const token = "test-owner-token-not-a-real-secret";
    let id: string;

    beforeEach(async () => {
      id = (await store.createMeeting({ title: "Planning", creator_name: "Sean" }, hashOwnerToken(token))).id;
    });

    function put(headers?: Record<string, string>) {
      return invoke(createMeetingHandler(store), { method: "PUT", query: { id }, body: { title: "Changed" }, headers });
    }

    test("accepts Authorization: Bearer and X-Owner-Token", async () => {
      expect((await put({ authorization: `Bearer ${token}` })).statusCode).toBe(200);
      expect((await put({ "x-owner-token": token })).statusCode).toBe(200);
    });

    test("rejects missing, wrong and non-Bearer tokens with 403 and changes nothing", async () => {
      const spy = vi.spyOn(store, "updateMeeting");
      expect((await put()).statusCode).toBe(403);
      expect((await put({ authorization: "Bearer wrong" })).statusCode).toBe(403);
      expect((await put({ authorization: `Basic ${token}` })).statusCode).toBe(403);
      expect(spy).not.toHaveBeenCalled();
    });

    test("legacy meetings without a token stay editable and are logged", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const legacyId = await seedMeeting();
      const response = await invoke(createMeetingHandler(store), {
        method: "PUT",
        query: { id: legacyId },
        body: { title: "Changed" },
      });
      expect(response.statusCode).toBe(200);
      expect(warn).toHaveBeenCalled();
    });
  });

  test("PUT rejects an empty update with 400", async () => {
    const id = await seedMeeting();
    const spy = vi.spyOn(store, "updateMeeting");
    const response = await invoke(createMeetingHandler(store), { method: "PUT", query: { id }, body: {} });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ error: expect.any(String), fields: expect.any(Object) });
    expect(spy).not.toHaveBeenCalled();
  });

  test("answers OPTIONS, rejects other methods with 405, and maps a thrown failure to 500", async () => {
    const handler = createMeetingHandler(store);
    expect((await invoke(handler, { method: "OPTIONS" })).headers["access-control-allow-methods"]).toBe("GET, PUT, OPTIONS");
    expect((await invoke(handler, { method: "POST" })).statusCode).toBe(405);

    const failing = await invoke(createMeetingHandler(throwingStore()), { method: "GET", query: { id: unknownId } });
    expect(failing.statusCode).toBe(500);
    expect(failing.body).toEqual({ error: "Internal server error" });
  });
});
