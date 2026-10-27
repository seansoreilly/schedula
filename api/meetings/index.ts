import { createMeetingsHandler } from '../_lib/meetings-route.js';
import { supabaseStore } from '../_lib/supabase-store.js';

export default createMeetingsHandler(supabaseStore);
