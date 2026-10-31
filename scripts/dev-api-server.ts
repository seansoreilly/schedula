/**
 * Local stand-in for the Vercel runtime: serves the `api/` handlers on :3001
 * so `vite` (port 3000) can proxy `/api/*` to it. Used by local development
 * and the Playwright suite; production still runs the handlers on Vercel.
 *
 * It never reads `.env` files. Pass SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * explicitly; a non-local Supabase URL is refused unless
 * SCHEDULA_ALLOW_REMOTE_DB=1, so tests cannot write to production by accident.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

interface Route {
  pattern: RegExp;
  load: () => Promise<{ default: Handler }>;
  params: readonly string[];
}

const routes: readonly Route[] = [
  { pattern: /^\/api\/meetings\/?$/, load: () => import("../api/meetings/index"), params: [] },
  { pattern: /^\/api\/meetings\/([^/]+)\/?$/, load: () => import("../api/meetings/[id]"), params: ["id"] },
  { pattern: /^\/api\/availability\/?$/, load: () => import("../api/availability/index"), params: [] },
];

function assertSafeDatabase(): void {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see `supabase status -o env`).");
  }

  const { hostname } = new URL(supabaseUrl);
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (!isLocal && process.env.SCHEDULA_ALLOW_REMOTE_DB !== "1") {
    throw new Error(`Refusing to serve against non-local database ${hostname}; set SCHEDULA_ALLOW_REMOTE_DB=1 to override.`);
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return undefined;
  }

  if (req.headers["content-type"]?.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function toVercelResponse(res: ServerResponse): VercelResponse {
  const response = res as VercelResponse;
  response.status = (statusCode: number) => {
    res.statusCode = statusCode;
    return response;
  };
  response.json = (body: unknown) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
    return response;
  };
  response.send = (body: unknown) => {
    res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    return response;
  };
  return response;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = routes.find(({ pattern }) => pattern.test(url.pathname));
  const match = route ? url.pathname.match(route.pattern) : null;
  if (!route || !match) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const query: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }
  route.params.forEach((name, index) => {
    query[name] = decodeURIComponent(match[index + 1] ?? "");
  });

  const request = req as VercelRequest;
  request.query = query;
  request.cookies = {};
  request.body = await readBody(req);

  const { default: handler } = await route.load();
  await handler(request, toVercelResponse(res));
}

assertSafeDatabase();

const port = Number(process.env.API_PORT ?? 3001);
createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error("dev-api-server: unhandled error", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Schedula API listening on http://127.0.0.1:${port}`);
});
