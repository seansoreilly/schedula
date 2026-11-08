import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

interface QueryResult {
  data: unknown;
  count?: number | null;
  error: { code?: string; message: string } | null;
}

interface RecordedQuery {
  table: string;
  calls: Array<[string, unknown[]]>;
}

const supabaseMock = vi.hoisted(() => {
  const state = {
    queries: [] as RecordedQuery[],
    result: { data: null, error: null } as QueryResult,
    queue: [] as QueryResult[],
  };

  function from(table: string): unknown {
    const query: RecordedQuery = { table, calls: [] };
    state.queries.push(query);

    const result = state.queue.shift() ?? state.result;
    const builder: Record<string, unknown> = {
      then: (resolve: (value: QueryResult) => unknown) => resolve(result),
    };
    for (const method of ["insert", "update", "select", "eq", "order", "single"]) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push([method, args]);
        return builder;
      };
    }
    return builder;
  }

  return { state, supabase: { from } };
});

vi.mock("../../api/_lib/supabase", () => ({ supabase: supabaseMock.supabase }));

const { resetRateLimitForTests } = await import("../../api/_lib/rateLimit");
const { default: meetingsHandler } = await import("../../api/meetings/index");
const { default: meetingByIdHandler } = await import("../../api/meetings/[id]");
const { default: availabilityHandler } = await import("../../api/availability/index");

const meetingId = "11111111-1111-4111-8111-111111111111";

interface CapturedResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

function invoke(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
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

beforeEach(() => {
  supabaseMock.state.queries = [];
  supabaseMock.state.result = { data: null, error: null };
  supabaseMock.state.queue = [];
  resetRateLimitForTests();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/meetings", () => {
  test("inserts trimmed input and returns 201", async () => {
    const meeting = { id: meetingId, title: "Planning", creator_name: "Sean" };
    supabaseMock.state.result = { data: meeting, error: null };

    const response = await invoke(meetingsHandler, {
      method: "POST",
      body: { title: " Planning ", creator_name: " Sean " },
    });

    expect(response.statusCode).toBe(201);
    const body = response.body as Record<string, unknown>;
    const ownerToken = body.owner_token as string;
    expect(ownerToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body).toEqual({ ...meeting, owner_token: ownerToken });
    expect(body).not.toHaveProperty("owner_token_hash");
    expect(supabaseMock.state.queries[0]).toEqual({
      table: "meetings",
      calls: [
        [
          "insert",
          [{ title: "Planning", creator_name: "Sean", owner_token_hash: createHash("sha256").update(ownerToken).digest("hex") }],
        ],
        ["select", ["id,title,creator_name,created_at,updated_at"]],
        ["single", []],
      ],
    });
  });

  test("generates a distinct token per meeting", async () => {
    supabaseMock.state.result = { data: { id: meetingId }, error: null };
    const first = (await invoke(meetingsHandler, { method: "POST", body: { title: "A", creator_name: "S" } })).body as { owner_token: string };
    const second = (await invoke(meetingsHandler, { method: "POST", body: { title: "A", creator_name: "S" } })).body as { owner_token: string };
    expect(first.owner_token).not.toBe(second.owner_token);
  });

  test("rejects invalid input without touching the database", async () => {
    const response = await invoke(meetingsHandler, { method: "POST", body: { title: "", creator_name: "Sean" } });

    expect(response.statusCode).toBe(400);
    expect(supabaseMock.state.queries).toHaveLength(0);
  });

  test("hides database error details from the client", async () => {
    supabaseMock.state.result = { data: null, error: { message: "relation does not exist" } };

    const response = await invoke(meetingsHandler, {
      method: "POST",
      body: { title: "Planning", creator_name: "Sean" },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Database error" });
  });

  test("rate limits POSTs per IP with 429", async () => {
    supabaseMock.state.result = { data: { id: meetingId }, error: null };
    const request = {
      method: "POST",
      body: { title: "Planning", creator_name: "Sean" },
      headers: { "x-forwarded-for": "198.51.100.7" },
    };

    for (let i = 0; i < 20; i++) {
      expect((await invoke(meetingsHandler, request)).statusCode).toBe(201);
    }
    const blocked = await invoke(meetingsHandler, request);
    expect(blocked.statusCode).toBe(429);
    expect(supabaseMock.state.queries).toHaveLength(20);
  });

  test("answers CORS preflight and rejects other methods", async () => {
    const preflight = await invoke(meetingsHandler, { method: "OPTIONS" });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.headers["access-control-allow-methods"]).toBe("POST, OPTIONS");

    const get = await invoke(meetingsHandler, { method: "GET" });
    expect(get.statusCode).toBe(405);
  });
});

describe("CORS origin allowlist", () => {
  const originHeader = (origin: string) => ({ method: "OPTIONS", headers: { origin } });

  test("echoes production and own-preview origins with Vary: Origin, keeping OPTIONS handling", async () => {
    for (const origin of [
      "https://www.schedula.xyz",
      "https://schedula.xyz",
      "https://schedula-abc123xyz-melbourne-computing.vercel.app",
      "https://schedula-git-security-weekly-melbourne-computing.vercel.app",
    ]) {
      const res = await invoke(meetingsHandler, originHeader(origin));
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
      expect(res.headers.vary).toBe("Origin");
    }
  });

  test("omits allow-origin for foreign and look-alike origins, never '*'", async () => {
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
      const res = await invoke(meetingsHandler, originHeader(origin));
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      expect(res.headers.vary).toBe("Origin");
    }
  });

  test("sets no allow-origin for requests without an Origin header", async () => {
    const res = await invoke(meetingsHandler, { method: "OPTIONS" });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers.vary).toBe("Origin");
  });
});

describe("/api/meetings/[id]", () => {
  test("returns 404 for a non-UUID id without querying", async () => {
    const response = await invoke(meetingByIdHandler, { method: "GET", query: { id: "nope" } });

    expect(response.statusCode).toBe(404);
    expect(supabaseMock.state.queries).toHaveLength(0);
  });

  test("maps PostgREST no-rows to 404", async () => {
    supabaseMock.state.result = { data: null, error: { code: "PGRST116", message: "0 rows" } };

    const response = await invoke(meetingByIdHandler, { method: "GET", query: { id: meetingId } });

    expect(response.statusCode).toBe(404);
    expect(supabaseMock.state.queries[0].calls).toContainEqual(["eq", ["id", meetingId]]);
  });

  const ownerToken = "owner-token-for-tests";
  const ownerHash = createHash("sha256").update(ownerToken).digest("hex");
  const lookupOwned = { data: { owner_token_hash: ownerHash }, error: null };

  test("updates only validated fields and stamps updated_at with a valid owner token", async () => {
    supabaseMock.state.queue = [lookupOwned];
    supabaseMock.state.result = { data: { id: meetingId, title: "New" }, error: null };

    const response = await invoke(meetingByIdHandler, {
      method: "PUT",
      query: { id: meetingId },
      body: { title: " New " },
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(supabaseMock.state.queries[0].calls).toContainEqual(["select", ["owner_token_hash"]]);
    const [method, [update]] = supabaseMock.state.queries[1].calls[0] as [string, [Record<string, unknown>]];
    expect(method).toBe("update");
    expect(update).toMatchObject({ title: "New" });
    expect(typeof update.updated_at).toBe("string");
    expect(update).not.toHaveProperty("creator_name");
    expect(supabaseMock.state.queries[1].calls).toContainEqual(["select", ["id,title,creator_name,created_at,updated_at"]]);
  });

  test("accepts the X-Owner-Token header", async () => {
    supabaseMock.state.queue = [lookupOwned];
    supabaseMock.state.result = { data: { id: meetingId }, error: null };

    const response = await invoke(meetingByIdHandler, {
      method: "PUT",
      query: { id: meetingId },
      body: { title: "New" },
      headers: { "x-owner-token": ownerToken },
    });

    expect(response.statusCode).toBe(200);
  });

  test("returns 403 and does not update with a missing or wrong owner token", async () => {
    for (const headers of [{} as Record<string, string>, { authorization: "Bearer wrong" }, { "x-owner-token": "wrong" }, { authorization: "Basic abc" }]) {
      supabaseMock.state.queries = [];
      supabaseMock.state.queue = [lookupOwned];
      const response = await invoke(meetingByIdHandler, {
        method: "PUT",
        query: { id: meetingId },
        body: { title: "Hijacked" },
        headers,
      });

      expect(response.statusCode).toBe(403);
      expect(supabaseMock.state.queries).toHaveLength(1);
    }
  });

  test("allows editing a legacy meeting with a NULL hash and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.state.queue = [{ data: { owner_token_hash: null }, error: null }];
    supabaseMock.state.result = { data: { id: meetingId, title: "New" }, error: null };

    const response = await invoke(meetingByIdHandler, { method: "PUT", query: { id: meetingId }, body: { title: "New" } });

    expect(response.statusCode).toBe(200);
    expect(warn).toHaveBeenCalled();
  });

  test("returns 404 on PUT for an unknown meeting", async () => {
    supabaseMock.state.result = { data: null, error: { code: "PGRST116", message: "0 rows" } };

    const response = await invoke(meetingByIdHandler, {
      method: "PUT",
      query: { id: meetingId },
      body: { title: "New" },
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET selects only public columns, never the token hash", async () => {
    supabaseMock.state.result = { data: { id: meetingId, title: "T" }, error: null };

    await invoke(meetingByIdHandler, { method: "GET", query: { id: meetingId } });

    const select = supabaseMock.state.queries[0].calls.find(([m]) => m === "select");
    expect(select?.[1]).toEqual(["id,title,creator_name,created_at,updated_at"]);
    expect(JSON.stringify(select)).not.toContain("owner_token_hash");
  });

  test("rejects an empty update", async () => {
    const response = await invoke(meetingByIdHandler, { method: "PUT", query: { id: meetingId }, body: {} });

    expect(response.statusCode).toBe(400);
    expect(supabaseMock.state.queries).toHaveLength(0);
  });
});

describe("/api/availability", () => {
  const validAvailability = {
    meeting_id: meetingId,
    participant_name: "Alice",
    available_date: "2026-11-02",
    start_time: "09:00",
    end_time: "09:30",
  };

  test("creates availability and returns 201", async () => {
    supabaseMock.state.result = { data: { id: "a", ...validAvailability }, error: null };

    const response = await invoke(availabilityHandler, { method: "POST", body: validAvailability });

    expect(response.statusCode).toBe(201);
    expect(supabaseMock.state.queries[1].calls[0]).toEqual(["insert", [validAvailability]]);
  });

  test("returns 404 when the meeting does not exist (foreign key violation)", async () => {
    supabaseMock.state.queue = [{ data: null, count: 0, error: null }];
    supabaseMock.state.result = {
      data: null,
      error: { code: "23503", message: 'violates foreign key constraint "availability_meeting_id_fkey"' },
    };

    const response = await invoke(availabilityHandler, { method: "POST", body: validAvailability });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Meeting not found" });
  });

  test("counts existing rows for the meeting before inserting", async () => {
    supabaseMock.state.queue = [{ data: null, count: 199, error: null }];
    supabaseMock.state.result = { data: { id: "a", ...validAvailability }, error: null };

    const response = await invoke(availabilityHandler, { method: "POST", body: validAvailability });

    expect(response.statusCode).toBe(201);
    expect(supabaseMock.state.queries[0].calls).toEqual([
      ["select", ["*", { count: "exact", head: true }]],
      ["eq", ["meeting_id", meetingId]],
    ]);
  });

  test("returns 409 and does not insert once a meeting has 200 rows", async () => {
    supabaseMock.state.queue = [{ data: null, count: 200, error: null }];

    const response = await invoke(availabilityHandler, { method: "POST", body: validAvailability });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({ error: "This meeting has reached its availability limit" });
    expect(supabaseMock.state.queries).toHaveLength(1);
  });

  test("rate limits POSTs per IP with 429 and Retry-After", async () => {
    supabaseMock.state.result = { data: { id: "a" }, error: null };
    const request = { method: "POST", body: validAvailability, headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } };

    for (let i = 0; i < 20; i++) {
      expect((await invoke(availabilityHandler, request)).statusCode).toBe(201);
    }
    const blocked = await invoke(availabilityHandler, request);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("60");

    const other = await invoke(availabilityHandler, { ...request, headers: { "x-forwarded-for": "203.0.113.10" } });
    expect(other.statusCode).toBe(201);
  });

  test("rejects a reversed time range", async () => {
    const response = await invoke(availabilityHandler, {
      method: "POST",
      body: { ...validAvailability, start_time: "10:00", end_time: "09:00" },
    });

    expect(response.statusCode).toBe(400);
    expect(supabaseMock.state.queries).toHaveLength(0);
  });

  test("lists availability for a meeting ordered by date and time", async () => {
    supabaseMock.state.result = { data: null, error: null };

    const response = await invoke(availabilityHandler, { method: "GET", query: { meeting_id: meetingId } });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
    expect(supabaseMock.state.queries[0].calls).toEqual([
      ["select", ["*"]],
      ["eq", ["meeting_id", meetingId]],
      ["order", ["available_date"]],
      ["order", ["start_time"]],
    ]);
  });

  test("requires a UUID meeting_id when listing", async () => {
    const response = await invoke(availabilityHandler, { method: "GET", query: { meeting_id: "x" } });

    expect(response.statusCode).toBe(400);
  });
});
