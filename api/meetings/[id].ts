import { createMeetingHandler } from '../_lib/meeting-route.js';
import { supabaseStore } from '../_lib/supabase-store.js';

export default createMeetingHandler(supabaseStore);
