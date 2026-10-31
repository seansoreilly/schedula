import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, test, vi } from "vitest";

interface QueryResult {
  data: unknown;
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
  };

  function from(table: string): unknown {
    const query: RecordedQuery = { table, calls: [] };
    state.queries.push(query);

    const builder: Record<string, unknown> = {
      then: (resolve: (value: QueryResult) => unknown) => resolve(state.result),
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
  request: { method: string; body?: unknown; query?: Record<string, string> },
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
    expect(response.body).toEqual(meeting);
    expect(supabaseMock.state.queries[0]).toEqual({
      table: "meetings",
      calls: [
        ["insert", [{ title: "Planning", creator_name: "Sean" }]],
        ["select", []],
        ["single", []],
      ],
    });
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

  test("answers CORS preflight and rejects other methods", async () => {
    const preflight = await invoke(meetingsHandler, { method: "OPTIONS" });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.headers["access-control-allow-methods"]).toBe("POST, OPTIONS");

    const get = await invoke(meetingsHandler, { method: "GET" });
    expect(get.statusCode).toBe(405);
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

  test("updates only validated fields and stamps updated_at", async () => {
    supabaseMock.state.result = { data: { id: meetingId, title: "New" }, error: null };

    const response = await invoke(meetingByIdHandler, {
      method: "PUT",
      query: { id: meetingId },
      body: { title: " New " },
    });

    expect(response.statusCode).toBe(200);
    const [method, [update]] = supabaseMock.state.queries[0].calls[0] as [string, [Record<string, unknown>]];
    expect(method).toBe("update");
    expect(update).toMatchObject({ title: "New" });
    expect(typeof update.updated_at).toBe("string");
    expect(update).not.toHaveProperty("creator_name");
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
    expect(supabaseMock.state.queries[0].calls[0]).toEqual(["insert", [validAvailability]]);
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
