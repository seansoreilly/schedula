import type { VercelRequest, VercelResponse } from '@vercel/node';

type EndpointMethod = 'GET' | 'POST' | 'PUT';

function allowedMethodsHeader(methods: readonly EndpointMethod[]): string {
  return [...methods, 'OPTIONS'].join(', ');
}

export function prepareEndpoint(
  req: VercelRequest,
  res: VercelResponse,
  methods: readonly EndpointMethod[],
): boolean {
  const allowedMethods = allowedMethodsHeader(methods);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

export function databaseError(res: VercelResponse, error: unknown): void {
  console.error('Supabase request failed', error);
  res.status(500).json({ error: 'Database error' });
}

export function internalServerError(res: VercelResponse, error: unknown): void {
  console.error('Unhandled API error', error);
  res.status(500).json({ error: 'Internal server error' });
}
