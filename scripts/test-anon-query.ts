import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://suqedehjabneiwirfyvf.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_F2MON24Wpr074TElrhvGUg_rEQTVWNV';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Querying users table using Anon Key...');
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching with Anon Key:', error.message);
  } else {
    console.log('Data returned with Anon Key:', data);
  }
}

test();
