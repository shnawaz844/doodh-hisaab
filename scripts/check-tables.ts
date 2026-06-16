import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const candidateTables = [
  'settings',
  'cms_pages',
  'customer_profiles',
  'subscriptions',
  'daily_milk_entries',
  'orders',
  'monthly_bills',
  'payments',
  'animal_listings',
  'gallery_images',
  'delivery_staff',
  'delivery_assignments',
  'notifications',
  'audit_logs',
  'daily_cash_sales',
  'daily_cash',
  'milk_rates',
  'milkRates',
  'users'
];

async function checkTables() {
  console.log('Checking which tables exist in the Supabase database...');
  for (const table of candidateTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" does not exist (or no permissions). Error: ${error.message}`);
        } else {
          console.log(`✅ Table "${table}" exists (returned error: ${error.message})`);
        }
      } else {
        console.log(`✅ Table "${table}" exists (returned ${data?.length || 0} rows)`);
      }
    } catch (e: any) {
      console.log(`❌ Table "${table}" threw exception: ${e.message}`);
    }
  }
}

checkTables();
