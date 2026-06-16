import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://suqedehjabneiwirfyvf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_F2MON24Wpr074TElrhvGUg_rEQTVWNV';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
