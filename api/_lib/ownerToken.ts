import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

// Columns safe to return to clients. Never include owner_token_hash.
export const MEETING_PUBLIC_COLUMNS = 'id,title,creator_name,created_at,updated_at';

export function generateOwnerToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOwnerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readOwnerToken(req: VercelRequest): string | null {
  const authorization = req.headers?.authorization;
  if (typeof authorization === 'string') {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (match) {
      return match[1];
    }
  }

  const headerToken = req.headers?.['x-owner-token'];
  return typeof headerToken === 'string' && headerToken.length > 0 ? headerToken : null;
}

// Constant-time comparison of SHA-256 digests (equal length by construction).
export function ownerTokenMatches(presentedToken: string, storedHash: string): boolean {
  const presented = Buffer.from(hashOwnerToken(presentedToken), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}
