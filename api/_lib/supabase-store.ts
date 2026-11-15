import { createClient } from '@supabase/supabase-js';
import { parseAvailability, parseAvailabilityList, parseMeeting } from '../../shared/contract.js';
import { MAX_AVAILABILITY_ROWS_PER_MEETING } from './store.js';
import type { MeetingStore } from './store.js';

// Server-only. This module lives under api/ (Vercel functions) and must never
// be imported from src/ (the browser bundle). The service-role key bypasses RLS.
const NO_ROWS_CODE = 'PGRST116';
// foreign_key_violation: availability.meeting_id does not reference an existing meeting.
const FOREIGN_KEY_VIOLATION_CODE = '23503';

function createSchemaClient(url: string, key: string) {
  return createClient(url, key, {
    db: {
      schema: 'schedula',
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let client: ReturnType<typeof createSchemaClient> | undefined;

// Created on first use so importing this module never throws.
function getClient(): ReturnType<typeof createSchemaClient> {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL
    ?? process.env.VITE_SUPABASE_URL
    ?? 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
  // Deliberately no VITE_* fallback: VITE_ variables are inlined into the browser bundle.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Supabase service-role key is required. Set SUPABASE_SERVICE_ROLE_KEY.');
  }

  client = createSchemaClient(url, key);
  return client;
}

export const supabaseStore: MeetingStore = {
  async createMeeting(draft) {
    const { data, error } = await getClient().from('meetings').insert(draft).select().single();
    if (error) {
      throw error;
    }
    return parseMeeting(data);
  },

  async getMeeting(id) {
    const { data, error } = await getClient().from('meetings').select('*').eq('id', id).single();
    if (error) {
      if (error.code === NO_ROWS_CODE) {
        return { kind: 'not-found' };
      }
      throw error;
    }
    return { kind: 'ok', value: parseMeeting(data) };
  },

  async updateMeeting(id, patch) {
    const { data, error } = await getClient()
      .from('meetings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === NO_ROWS_CODE) {
        return { kind: 'not-found' };
      }
      throw error;
    }
    return { kind: 'ok', value: parseMeeting(data) };
  },

  async listAvailability(meetingId) {
    const meeting = await supabaseStore.getMeeting(meetingId);
    if (meeting.kind === 'not-found') {
      return meeting;
    }

    const { data, error } = await getClient()
      .from('availability')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('available_date')
      .order('start_time');
    if (error) {
      throw error;
    }
    return { kind: 'ok', value: parseAvailabilityList(data ?? []) };
  },

  async addAvailability(draft) {
    // Check-then-insert is not atomic; concurrent requests can overshoot the cap slightly.
    const { count, error: countError } = await getClient()
      .from('availability')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', draft.meeting_id);
    if (countError) {
      throw countError;
    }
    if ((count ?? 0) >= MAX_AVAILABILITY_ROWS_PER_MEETING) {
      return { kind: 'limit-reached' };
    }

    const { data, error } = await getClient().from('availability').insert(draft).select().single();
    if (error) {
      if (error.code === FOREIGN_KEY_VIOLATION_CODE) {
        return { kind: 'not-found' };
      }
      throw error;
    }
    return { kind: 'ok', value: parseAvailability(data) };
  },
};
