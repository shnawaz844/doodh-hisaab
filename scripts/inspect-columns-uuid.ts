import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DUMMY_UUID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'; // Sharma Ji UUID from seed
const NEW_UUID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
const NEW_UUID2 = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';

async function checkColumns(tableName: string, row: any) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(row)
      .select();

    if (error) {
      console.log(`Table "${tableName}": [${error.code}] ${error.message}`);
      if (error.details) console.log(`   Details: ${error.details}`);
    } else {
      console.log(`Table "${tableName}": ✅ Insert Succeeded! Columns:`, Object.keys(data[0]));
      // delete it
      const primaryKey = Object.keys(data[0]).includes('id') ? 'id' : 'slug';
      await supabase.from(tableName).delete().eq(primaryKey, data[0][primaryKey]);
    }
  } catch (err: any) {
    console.log(`Table "${tableName}" exception:`, err.message);
  }
}

async function run() {
  console.log('Testing column existence with valid UUIDs...');

  console.log('\n--- 1. CUSTOMER PROFILES ---');
  await checkColumns('customer_profiles', {
    id: NEW_UUID,
    name: 'Test Customer',
    mobile: '1234567890',
    address: 'Test Address',
    status: 'active',
    balance: 0,
    cow_rate: 60,
    buffalo_rate: 72,
    billing_type: 'monthly' // let's see if billing_type or type exists
  });

  console.log('\n--- 2. SUBSCRIPTIONS ---');
  await checkColumns('subscriptions', {
    id: NEW_UUID,
    customer_id: DUMMY_UUID,
    milk_type: 'cow',
    quantity: 2,
    delivery_time: 'morning',
    status: 'active'
  });

  console.log('\n--- 3. DAILY MILK ENTRIES ---');
  await checkColumns('daily_milk_entries', {
    id: NEW_UUID,
    customer_id: DUMMY_UUID,
    date: '2026-06-04',
    shift: 'morning',
    milk_type: 'cow',
    quantity: 2,
    rate: 60,
    // amount is generated
    note: 'Test entry',
    created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  });

  console.log('\n--- 4. ORDERS ---');
  await checkColumns('orders', {
    id: NEW_UUID,
    customer_id: DUMMY_UUID,
    date: '2026-06-04',
    shift: 'evening',
    milk_type: 'cow',
    quantity: 2,
    rate: 60,
    total_amount: 120,
    status: 'pending',
    payment_status: 'pending'
  });

  console.log('\n--- 5. MONTHLY BILLS ---');
  await checkColumns('monthly_bills', {
    id: NEW_UUID,
    customer_id: DUMMY_UUID,
    month: 6,
    year: 2026,
    milk_qty_cow: 10,
    milk_qty_buffalo: 0,
    total_amount: 600,
    previous_due: 0,
    extra_charges: 0,
    discount: 0,
    grand_total: 600,
    status: 'pending',
    whatsapp_status: 'unsent'
  });

  console.log('\n--- 6. PAYMENTS ---');
  await checkColumns('payments', {
    id: NEW_UUID,
    customer_id: DUMMY_UUID,
    amount: 100,
    date: '2026-06-04',
    status: 'paid',
    method: 'cash',
    note: 'test payment'
  });

  console.log('\n--- 7. ANIMAL LISTINGS ---');
  await checkColumns('animal_listings', {
    id: NEW_UUID,
    seller_id: DUMMY_UUID,
    animal_type: 'cow',
    breed: 'Gir',
    age_years: 4,
    daily_milk_yield: 10,
    price: 50000,
    contact_number: '1234567890',
    location: 'Delhi',
    status: 'pending'
  });

  console.log('\n--- 8. GALLERY IMAGES ---');
  await checkColumns('gallery_images', {
    id: NEW_UUID,
    image_url: 'https://example.com/cow.jpg',
    category: 'cows',
    description: 'test image'
  });

  console.log('\n--- 9. DELIVERY STAFF ---');
  await checkColumns('delivery_staff', {
    id: NEW_UUID,
    name: 'Driver Test',
    mobile: '9999988888',
    vehicle_no: 'DL1234',
    status: 'active'
  });

  console.log('\n--- 10. DELIVERY ASSIGNMENTS ---');
  await checkColumns('delivery_assignments', {
    id: NEW_UUID,
    staff_id: NEW_UUID2, // reference to a staff (might fail fk if staff doesn't exist, but tests column existence)
    date: '2026-06-04',
    status: 'assigned'
  });

  console.log('\n--- 11. AUDIT LOGS ---');
  await checkColumns('audit_logs', {
    id: NEW_UUID,
    table_name: 'settings',
    action_type: 'insert',
    old_data: {},
    new_data: {},
    performed_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  });
}

run();
