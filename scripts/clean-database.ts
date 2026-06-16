import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Order of cleaning to satisfy foreign keys: dependent tables first
const tablesToClean = [
  'audit_logs',
  'delivery_assignments',
  'notifications',
  'payments',
  'monthly_bills',
  'daily_milk_entries',
  'orders',
  'subscriptions',
  'animal_listings',
  'customer_profiles',
  'daily_cash_sales'
];

const dummyUuid = '00000000-0000-0000-0000-000000000000';

async function cleanSupabase() {
  console.log('--- STARTING SUPABASE DATABASE CLEAN-UP ---');
  for (const table of tablesToClean) {
    try {
      console.log(`Clearing table "${table}"...`);
      // Delete rows matching neq id to dummyUuid (essentially all rows)
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', dummyUuid);
      
      if (error) {
        console.error(`❌ Error clearing table "${table}": ${error.message} (${error.code})`);
      } else {
        console.log(`✅ Cleared table "${table}" successfully.`);
      }
    } catch (e: any) {
      console.error(`💥 Exception clearing table "${table}": ${e.message}`);
    }
  }
  console.log('--- SUPABASE CLEAN-UP COMPLETED ---\n');
}

function cleanLocalDb() {
  console.log('--- STARTING LOCAL db.json CLEAN-UP ---');
  const dbPath = path.join(process.cwd(), 'server', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.log(`⚠️ Local database file not found at ${dbPath}. Skipping local database clean-up.`);
    return;
  }

  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // Clear operational lists
    db.entries = [];
    db.orders = [];
    db.monthlyBills = [];
    db.payments = [];
    db.animalListings = [];
    db.deliveryAssignments = [];
    db.notifications = [];
    db.auditLogs = [];
    db.dailyCashSales = [];
    db.customers = [];
    db.subscriptions = [];
    db.addresses = []; // Linked to customers

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`✅ Successfully cleared transactional data in local db.json at ${dbPath}`);
  } catch (e: any) {
    console.error(`❌ Error clearing local db.json: ${e.message}`);
  }
  console.log('--- LOCAL db.json CLEAN-UP COMPLETED ---\n');
}

async function run() {
  await cleanSupabase();
  cleanLocalDb();
  console.log('🎉 Database clean-up successfully finished!');
}

run();
