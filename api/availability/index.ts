import { createAvailabilityHandler } from '../_lib/availability-route.js';
import { supabaseStore } from '../_lib/supabase-store.js';

export default createAvailabilityHandler(supabaseStore);
