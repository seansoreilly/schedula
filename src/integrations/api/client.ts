import type { FieldErrors } from "./types";

const API_BASE_PATH = "/api";

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  /** The server's per-field validation reasons, when a 400 body carries them. */
  public readonly fields: FieldErrors | undefined;

  public constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.fields = readFields(body);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFields(body: unknown): FieldErrors | undefined {
  if (!isRecord(body) || !isRecord(body.fields)) {
    return undefined;
  }

  const fields: FieldErrors = {};
  for (const [key, reason] of Object.entries(body.fields)) {
    if (typeof reason === "string") {
      fields[key] = reason;
    }
  }
  return fields;
}

function buildApiUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_PATH}${path}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  if (isRecord(body)) {
    if (typeof body.error === "string") {
      return body.error;
    }

    if (typeof body.message === "string") {
      return body.message;
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return `HTTP ${status}`;
}

/** Calls `/api{endpoint}` and returns the unparsed JSON body; callers parse it with the contract. */
export async function request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.status), response.status, body);
  }

  return body;
}
