import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable(tableName: string, dummyRow: any) {
  try {
    // Try to insert a row to see what columns it returns or what errors occur
    const { data, error } = await supabase
      .from(tableName)
      .insert(dummyRow)
      .select();

    if (error) {
      console.log(`❌ Table "${tableName}" insert error: ${error.message} (${error.code})`);
      // If it's a column error, it might print details
      if (error.details) console.log(`   Details: ${error.details}`);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Table "${tableName}" columns:`, columns);
      
      // Clean up the inserted dummy row
      const primaryKey = columns.includes('id') ? 'id' : columns.includes('slug') ? 'slug' : columns[0];
      const deleteVal = data[0][primaryKey];
      const { error: delError } = await supabase
        .from(tableName)
        .delete()
        .eq(primaryKey, deleteVal);
      if (delError) {
        console.log(`   ⚠️ Failed to delete dummy row from ${tableName}:`, delError.message);
      } else {
        console.log(`   🧹 Deleted dummy row from ${tableName}`);
      }
    } else {
      console.log(`✅ Table "${tableName}" insert succeeded but returned no data.`);
    }
  } catch (err: any) {
    console.log(`💥 Table "${tableName}" exception:`, err.message);
  }
}

async function run() {
  console.log('Inspecting Supabase schemas via temporary insertion...');

  // Inspect customer_profiles
  await inspectTable('customer_profiles', {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', // dummy uuid
    name: 'Dummy Customer',
    mobile: '1234567890',
    status: 'active'
  });
  console.log('---');

  // Inspect subscriptions
  await inspectTable('subscriptions', {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa',
    customer_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // existing Sharma Ji uuid in Supabase seed
    milk_type: 'cow',
    quantity: 1,
    delivery_time: 'morning',
    status: 'active'
  });
  console.log('---');

  // Inspect daily_milk_entries
  await inspectTable('daily_milk_entries', {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380aab',
    customer_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    date: '2026-06-04',
    shift: 'morning',
    milk_type: 'cow',
    quantity: 1,
    rate: 60,
    amount: 60,
    created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // Admin UUID
  });
  console.log('---');

  // Inspect orders
  await inspectTable('orders', {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380aac',
    customer_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    date: '2026-06-04',
    shift: 'evening',
    milk_type: 'cow',
    quantity: 1,
    rate: 60,
    total_amount: 60,
    status: 'pending',
    payment_status: 'pending'
  });
  console.log('---');

  // Inspect monthly_bills
  await inspectTable('monthly_bills', {
    id: 'bill_dummy_1',
    customer_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    month: 6,
    year: 2026,
    milk_qty_cow: 10,
    milk_qty_buffalo: 10,
    total_amount: 1200,
    previous_due: 0,
    extra_charges: 0,
    discount: 0,
    grand_total: 1200,
    status: 'pending',
    whatsapp_status: 'unsent'
  });
  console.log('---');

  // Inspect payments
  await inspectTable('payments', {
    id: 'pay_dummy_1',
    customer_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    amount: 100,
    date: '2026-06-04',
    status: 'paid',
    method: 'cash'
  });
  console.log('---');

  // Inspect animal_listings
  await inspectTable('animal_listings', {
    id: 'list_dummy_1',
    seller_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    animal_type: 'cow',
    breed: 'Gir',
    age_years: 4,
    price: 50000,
    contact_number: '1234567890',
    location: 'Delhi',
    status: 'pending'
  });
  console.log('---');

  // Inspect gallery_images
  await inspectTable('gallery_images', {
    id: 'gal_dummy_1',
    image_url: 'https://example.com/cow.jpg',
    category: 'cows'
  });
  console.log('---');

  // Inspect delivery_staff
  await inspectTable('delivery_staff', {
    id: 'staff_dummy_1',
    name: 'Dummy Staff',
    mobile: '1234567890',
    status: 'active'
  });
  console.log('---');

  // Inspect delivery_assignments
  await inspectTable('delivery_assignments', {
    id: 'asg_dummy_1',
    staff_id: 'staff_dummy_1',
    date: '2026-06-04',
    status: 'assigned'
  });
  console.log('---');

  // Inspect notifications
  await inspectTable('notifications', {
    user_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    title: 'Dummy Title',
    message: 'Dummy message',
    type: 'promo'
  });
  console.log('---');

  // Inspect daily_cash_sales / daily_cash
  await inspectTable('daily_cash', {
    id: 'dc_dummy_1',
    date: '2026-06-04',
    amount: 100
  });
}

run();
