import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FieldErrors } from '../../shared/contract.js';

type EndpointMethod = 'GET' | 'POST' | 'PUT';

function allowedMethodsHeader(methods: readonly EndpointMethod[]): string {
  return [...methods, 'OPTIONS'].join(', ');
}

const ALLOWED_ORIGINS: readonly string[] = ['https://www.schedula.xyz', 'https://schedula.xyz'];

// This project's own Vercel previews only (team slug melbourne-computing):
// schedula-<hash>-melbourne-computing.vercel.app and schedula-git-<branch>-... .
// Never a bare *.vercel.app.
export const PREVIEW_ORIGIN_PATTERN = /^https:\/\/schedula-[a-z0-9-]+-melbourne-computing\.vercel\.app$/;

export function isAllowedOrigin(origin: unknown): origin is string {
  return typeof origin === 'string' && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_PATTERN.test(origin));
}

export function prepareEndpoint(
  req: VercelRequest,
  res: VercelResponse,
  methods: readonly EndpointMethod[],
): boolean {
  const allowedMethods = allowedMethodsHeader(methods);

  // The frontend is same-origin, which needs no CORS headers. Only echo
  // allowlisted origins; never '*'.
  const origin = req.headers?.origin;
  res.setHeader('Vary', 'Origin');
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Owner-Token');
  res.setHeader('Allow', allowedMethods);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

export function methodNotAllowed(res: VercelResponse): void {
  res.status(405).json({ error: 'Method not allowed' });
}

export function invalidDraft(res: VercelResponse, failure: { error: string; fields: FieldErrors }): void {
  res.status(400).json({ error: failure.error, fields: failure.fields });
}

export function meetingNotFound(res: VercelResponse): void {
  res.status(404).json({ error: 'Meeting not found' });
}

export function internalServerError(res: VercelResponse, error: unknown): void {
  console.error('Unhandled API error', error);
  res.status(500).json({ error: 'Internal server error' });
}
