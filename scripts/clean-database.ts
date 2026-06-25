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

async function cleanAuthUsers() {
  console.log('--- STARTING SUPABASE AUTH USERS CLEAN-UP ---');
  let userIdsToDelete: { id: string; email?: string }[] = [];

  // Try to list users via Auth Admin API
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.warn(`⚠️ Warning: listing auth users failed (${error.message}). Will fallback to public.users table.`);
    } else if (data && data.users) {
      userIdsToDelete = data.users.map((u: any) => ({ id: u.id, email: u.email }));
    }
  } catch (e: any) {
    console.warn(`⚠️ Exception listing auth users: ${e.message}. Will fallback.`);
  }

  // Fallback / supplement: get users from public.users table
  try {
    console.log('Fetching users from public.users table...');
    const { data: dbUsers, error: dbUsersErr } = await supabase
      .from('users')
      .select('id, email');
    
    if (dbUsersErr) {
      console.error(`❌ Error fetching from public.users: ${dbUsersErr.message}`);
    } else if (dbUsers) {
      console.log(`Found ${dbUsers.length} users in public.users.`);
      for (const du of dbUsers) {
        if (!userIdsToDelete.some(u => u.id === du.id)) {
          userIdsToDelete.push({ id: du.id, email: du.email });
        }
      }
    }
  } catch (e: any) {
    console.error(`💥 Exception fetching public.users: ${e.message}`);
  }

  // Perform deletion
  console.log(`Determined ${userIdsToDelete.length} total users to check/delete.`);
  for (const user of userIdsToDelete) {
    if (user.email === 'admin@doodhhisaab.com' || user.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') {
      console.log(`Keeping admin user: ${user.email || 'Admin'} (ID: ${user.id})`);
      continue;
    }
    
    console.log(`Deleting auth user ID: ${user.id} (${user.email || 'no email'})...`);
    try {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`❌ Error deleting auth user ${user.id}: ${delErr.message}`);
      } else {
        console.log(`✅ Deleted auth user ${user.id} successfully.`);
      }
    } catch (e: any) {
      console.error(`💥 Exception deleting auth user ${user.id}: ${e.message}`);
    }
  }
  
  // Clean public.users table as well (except admin)
  try {
    console.log('Clearing public.users table (except admin)...');
    const adminId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const { error: usersErr } = await supabase
      .from('users')
      .delete()
      .neq('id', adminId);
    
    if (usersErr) {
      console.error(`❌ Error clearing public.users table: ${usersErr.message} (${usersErr.code})`);
    } else {
      console.log(`✅ Cleared public.users table successfully.`);
    }
  } catch (e: any) {
    console.error(`💥 Exception cleaning public.users table: ${e.message}`);
  }
  console.log('--- SUPABASE AUTH USERS CLEAN-UP COMPLETED ---\n');
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

    // Clear non-admin users
    if (db.users) {
      db.users = db.users.filter((u: any) => u.email === 'admin@doodhhisaab.com' || u.id === 'admin1');
    }

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
  await cleanAuthUsers();
  cleanLocalDb();
  console.log('🎉 Database clean-up successfully finished!');
}

run();
