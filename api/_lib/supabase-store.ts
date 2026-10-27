import { createClient } from '@supabase/supabase-js';
import { parseAvailability, parseAvailabilityList, parseMeeting } from '../../shared/contract.js';
import type { MeetingStore } from './store.js';

const NO_ROWS_CODE = 'PGRST116';
const FOREIGN_KEY_VIOLATION_CODE = '23503';

function createSchemaClient(url: string, key: string) {
  return createClient(url, key, { db: { schema: 'schedula' } });
}

let client: ReturnType<typeof createSchemaClient> | undefined;

function getClient(): ReturnType<typeof createSchemaClient> {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL
    ?? process.env.VITE_SUPABASE_URL
    ?? 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Supabase anonymous key is required. Set SUPABASE_ANON_KEY.');
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
