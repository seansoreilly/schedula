import { createClient } from '@vercel/kv';

if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
  throw new Error('Missing Redis environment variables: REDIS_URL and/or REDIS_TOKEN');
}

/**
 * A configured Redis client using Vercel KV.
 *
 * The connection details are provided via the following environment variables:
 *   - REDIS_URL   : The REST URL of your Vercel KV Redis instance
 *   - REDIS_TOKEN : The REST token for the instance
 *
 * In development, create a local .env file (or .env.local for Vercel CLI) with
 * these variables. In the Vercel dashboard, add the same variables to the
 * Development / Preview / Production environments.
 */
export const redis = createClient({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
}); 