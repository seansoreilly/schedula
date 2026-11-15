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

const mock = vi.hoisted(() => {
  const state = {
    queries: [] as RecordedQuery[],
    queue: [] as QueryResult[],
    clientOptions: undefined as unknown,
  };

  function from(table: string): unknown {
    const query: RecordedQuery = { table, calls: [] };
    state.queries.push(query);
    const result = state.queue.shift() ?? { data: null, error: null };
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

  const createClient = vi.fn((_url: string, _key: string, options: unknown) => {
    state.clientOptions = options;
    return { from };
  });

  return { state, createClient };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));

const meetingId = "11111111-1111-4111-8111-111111111111";
const row = {
  id: "a",
  meeting_id: meetingId,
  participant_name: "Alice",
  available_date: "2026-11-02",
  start_time: "09:00:00",
  end_time: "09:30:00",
  created_at: "2026-11-01T00:00:00Z",
};
const draft = {
  meeting_id: meetingId,
  participant_name: "Alice",
  available_date: "2026-11-02",
  start_time: "09:00",
  end_time: "09:30",
};

beforeEach(() => {
  mock.state.queries = [];
  mock.state.queue = [];
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
});

describe("supabaseStore", () => {
  test("importing never throws without a key; the first use does", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { supabaseStore } = await import("../../api/_lib/supabase-store");

    await expect(supabaseStore.getMeeting(meetingId)).rejects.toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  test("configures the schedula schema with a non-persistent session", async () => {
    const { supabaseStore } = await import("../../api/_lib/supabase-store");
    mock.state.queue = [{ data: { id: meetingId, title: "T", creator_name: "C", created_at: "x", updated_at: "y" }, error: null }];

    await supabaseStore.getMeeting(meetingId);

    expect(mock.state.clientOptions).toEqual({
      db: { schema: "schedula" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  test("maps PGRST116 to not-found and rethrows other errors", async () => {
    const { supabaseStore } = await import("../../api/_lib/supabase-store");
    mock.state.queue = [{ data: null, error: { code: "PGRST116", message: "0 rows" } }];
    expect(await supabaseStore.getMeeting(meetingId)).toEqual({ kind: "not-found" });
    expect(mock.state.queries[0].calls).toContainEqual(["eq", ["id", meetingId]]);

    mock.state.queue = [{ data: null, error: { code: "PGRST116", message: "0 rows" } }];
    expect(await supabaseStore.updateMeeting(meetingId, { title: "x" })).toEqual({ kind: "not-found" });

    mock.state.queue = [{ data: null, error: { message: "relation does not exist" } }];
    await expect(supabaseStore.getMeeting(meetingId)).rejects.toMatchObject({ message: "relation does not exist" });
  });

  test("maps a 23503 foreign key violation to not-found", async () => {
    const { supabaseStore } = await import("../../api/_lib/supabase-store");
    mock.state.queue = [
      { data: null, count: 0, error: null },
      { data: null, error: { code: "23503", message: "violates foreign key constraint" } },
    ];

    expect(await supabaseStore.addAvailability(draft)).toEqual({ kind: "not-found" });
  });

  test("counts rows before inserting and reports limit-reached at 200 without inserting", async () => {
    const { supabaseStore } = await import("../../api/_lib/supabase-store");
    mock.state.queue = [{ data: null, count: 199, error: null }, { data: row, error: null }];
    const added = await supabaseStore.addAvailability(draft);

    expect(added).toMatchObject({ kind: "ok", value: { start_time: "09:00", end_time: "09:30" } });
    expect(mock.state.queries[0].calls).toEqual([
      ["select", ["*", { count: "exact", head: true }]],
      ["eq", ["meeting_id", meetingId]],
    ]);

    mock.state.queries = [];
    mock.state.queue = [{ data: null, count: 200, error: null }];
    expect(await supabaseStore.addAvailability(draft)).toEqual({ kind: "limit-reached" });
    expect(mock.state.queries).toHaveLength(1);
  });

  test("lists availability by date then start time after confirming the meeting exists", async () => {
    const { supabaseStore } = await import("../../api/_lib/supabase-store");
    mock.state.queue = [
      { data: { id: meetingId, title: "T", creator_name: "C", created_at: "x", updated_at: "y" }, error: null },
      { data: null, error: null },
    ];

    expect(await supabaseStore.listAvailability(meetingId)).toEqual({ kind: "ok", value: [] });
    expect(mock.state.queries[1].calls).toEqual([
      ["select", ["*"]],
      ["eq", ["meeting_id", meetingId]],
      ["order", ["available_date"]],
      ["order", ["start_time"]],
    ]);
  });
});
