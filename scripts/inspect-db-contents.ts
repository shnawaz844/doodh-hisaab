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

const tables = [
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
  'milk_rates',
  'users'
];

async function inspect() {
  console.log('Inspecting Supabase database row counts...');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
      
      if (error) {
        console.log(`❌ Table "${table}" error: ${error.message}`);
      } else {
        console.log(`Table "${table}": ${count} rows`);
        if (data && data.length > 0) {
          console.log(`   Sample row:`, JSON.stringify(data[0]).substring(0, 150));
        }
      }
    } catch (e: any) {
      console.log(`❌ Table "${table}" threw exception: ${e.message}`);
    }
  }
}

inspect();
