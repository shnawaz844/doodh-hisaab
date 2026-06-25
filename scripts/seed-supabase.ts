import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Use Service Role Key if provided by user, fallback to Anon Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DB_FILE = path.join(process.cwd(), 'server', 'db.json');

// Map local string IDs to valid UUIDs to maintain relational integrity
const uuidMap: Record<string, string> = {
  'cust1': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'cust2': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'cust3': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  'admin1': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'staff1': 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'addr1': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
  'addr2': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a78',
  'addr3': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a79',
  'sub1': 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'sub2': 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'sub3': 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
};

function toUuid(id: string | undefined): string {
  if (!id) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (!uuidMap[id]) {
    // Generate a simple deterministic UUID-like string for standard mock IDs
    uuidMap[id] = 'f0eebc99-9c0b-4ef8-bb6d-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  }
  return uuidMap[id];
}

async function cleanAndInsert(tableName: string, rows: any[]) {
  if (rows.length === 0) return;
  console.log(`Seeding "${tableName}" (${rows.length} rows)...`);
  
  // Clean pre-existing entries in reverse dependency order or matching the primary keys
  const primaryKey = Object.keys(rows[0]).includes('slug') ? 'slug' : 'id';
  
  for (const row of rows) {
    const { error } = await supabase.from(tableName).upsert(row);
    if (error) {
      console.error(`❌ Error seeding table "${tableName}": ${error.message} (${error.code})`);
      if (error.details) console.error(`   Details: ${error.details}`);
    }
  }
  console.log(`✅ Finished seeding "${tableName}"`);
}

async function run() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`Local database file not found at ${DB_FILE}`);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  console.log('Starting Supabase Seeding / Migration...');
  console.log('Target URL:', supabaseUrl);
  console.log('Using Key:', supabaseKey.substring(0, 15) + '...');

  // 1. Settings
  const settingsRows = Object.keys(db.settings || {}).map(key => ({
    key,
    value: String(db.settings[key]),
    description: `Synced base setting for ${key}`
  }));
  await cleanAndInsert('settings', settingsRows);

  // 2. CMS Pages
  const cmsRows = (db.cmsPages || []).map((page: any) => ({
    slug: page.slug,
    title: page.title,
    content: page.content,
    updated_at: page.updatedAt || new Date().toISOString()
  }));
  await cleanAndInsert('cms_pages', cmsRows);

  // 3. Customer Profiles
  const customerRows = (db.customers || []).map((cust: any) => ({
    id: toUuid(cust.id),
    name: cust.name,
    mobile: cust.mobile,
    address: cust.address,
    status: cust.status || 'active',
    balance: Number(cust.balance) || 0,
    cow_rate: cust.milkType === 'cow' ? Number(cust.rate || 60) : 60,
    buffalo_rate: cust.milkType === 'buffalo' ? Number(cust.rate || 72) : 72,
    billing_type: cust.type || 'monthly',
    created_at: cust.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('customer_profiles', customerRows);

  // 4. Subscriptions
  const subscriptionRows = (db.subscriptions || []).map((sub: any) => ({
    id: toUuid(sub.id),
    customer_id: toUuid(sub.customerId),
    milk_type: sub.milkType,
    quantity: Number(sub.quantity) || 1,
    delivery_time: sub.deliveryTime,
    status: sub.status || 'active',
    paused_at: sub.pausedAt || null,
    resumed_at: sub.resumedAt || null,
    created_at: sub.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('subscriptions', subscriptionRows);

  // 5. Daily Milk Entries
  const entryRows = (db.entries || []).map((entry: any) => ({
    id: toUuid(entry.id),
    customer_id: toUuid(entry.customerId),
    date: entry.date,
    shift: entry.shift,
    milk_type: entry.milkType,
    quantity: Number(entry.quantity),
    rate: Number(entry.rate),
    // note: generated amount column is omitted
    note: entry.note || '',
    created_by: toUuid(entry.createdBy),
    created_at: entry.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('daily_milk_entries', entryRows);

  // 6. Orders
  const orderRows = (db.orders || []).map((ord: any) => ({
    id: toUuid(ord.id),
    customer_id: toUuid(ord.customerId),
    date: ord.date,
    shift: ord.shift,
    milk_type: ord.milkType,
    quantity: Number(ord.quantity),
    rate: Number(ord.rate),
    total_amount: Number(ord.totalAmount),
    status: ord.status || 'pending',
    payment_status: ord.paymentStatus || 'pending',
    address_id: toUuid(ord.addressId || 'addr1'),
    created_at: ord.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('orders', orderRows);

  // 7. Monthly Bills
  const billRows = (db.monthlyBills || []).map((bill: any) => ({
    id: toUuid(bill.id),
    customer_id: toUuid(bill.customerId),
    month: Number(bill.month),
    year: Number(bill.year),
    milk_qty_cow: Number(bill.milkQtyCow || 0),
    milk_qty_buffalo: Number(bill.milkQtyBuffalo || 0),
    total_amount: Number(bill.totalAmount),
    previous_due: Number(bill.previousDue || 0),
    extra_charges: Number(bill.extraCharges || 0),
    discount: Number(bill.discount || 0),
    grand_total: Number(bill.grandTotal),
    status: bill.status || 'pending',
    pdf_url: bill.pdfUrl || null,
    whatsapp_status: bill.whatsappStatus || 'unsent',
    whatsapp_sent_at: bill.whatsappSentAt || null,
    created_at: bill.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('monthly_bills', billRows);

  // 8. Payments
  const paymentRows = (db.payments || []).map((pay: any) => ({
    id: toUuid(pay.id),
    customer_id: toUuid(pay.customerId),
    amount: Number(pay.amount),
    date: pay.date,
    status: pay.status || 'paid',
    method: pay.method || 'upi',
    razorpay_payment_id: pay.razorpayPaymentId || null,
    note: pay.note || '',
    receipt_url: pay.receiptUrl || null,
    created_at: pay.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('payments', paymentRows);

  // 9. Animal Listings
  const listingRows = (db.animalListings || []).map((list: any) => ({
    id: toUuid(list.id),
    seller_id: toUuid(list.sellerId),
    animal_type: list.animalType,
    breed: list.breed,
    age_years: Number(list.ageYears),
    daily_milk_yield: Number(list.dailyMilkYield || 0),
    price: Number(list.price),
    description: list.description || '',
    contact_number: list.contactNumber,
    location: list.location,
    status: list.status || 'pending',
    images: list.images || [],
    created_at: list.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('animal_listings', listingRows);

  // 10. Gallery Images
  const galleryRows = (db.galleryImages || []).map((gal: any) => ({
    id: toUuid(gal.id),
    image_url: gal.imageUrl,
    category: gal.category,
    description: gal.description || '',
    created_at: gal.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('gallery_images', galleryRows);

  // 11. Delivery Staff
  const staffRows = (db.deliveryStaff || []).map((staff: any) => ({
    id: toUuid(staff.id),
    name: staff.name,
    mobile: staff.mobile,
    vehicle_no: staff.vehicleNo || '',
    status: staff.status || 'active'
  }));
  await cleanAndInsert('delivery_staff', staffRows);

  // 12. Delivery Assignments
  const assignmentRows = (db.deliveryAssignments || []).map((asg: any) => ({
    id: toUuid(asg.id),
    staff_id: toUuid(asg.staffId),
    date: asg.date,
    order_id: asg.orderId ? toUuid(asg.orderId) : null,
    subscription_id: asg.subscriptionId ? toUuid(asg.subscriptionId) : null,
    status: asg.status || 'assigned',
    delivered_at: asg.deliveredAt || null,
    notes: asg.notes || ''
  }));
  await cleanAndInsert('delivery_assignments', assignmentRows);

  // 13. Notifications
  const notificationRows = (db.notifications || []).map((notif: any) => ({
    id: toUuid(notif.id),
    user_id: toUuid(notif.userId),
    title: notif.title,
    message: notif.message,
    type: notif.type || 'bill',
    is_read: notif.isRead || false,
    sent_at: notif.sentAt || new Date().toISOString()
  }));
  await cleanAndInsert('notifications', notificationRows);

  // 14. Audit Logs
  const auditRows = (db.auditLogs || []).map((log: any) => ({
    id: toUuid(log.id),
    table_name: log.tableName,
    action_type: log.actionType,
    old_data: log.oldData || {},
    new_data: log.newData || {},
    performed_by: log.performedBy ? toUuid(log.performedBy) : null,
    created_at: log.createdAt || new Date().toISOString()
  }));
  await cleanAndInsert('audit_logs', auditRows);

  // 15. Daily Cash Sales
  const cashRows = (db.dailyCashSales || []).map((cash: any) => ({
    id: toUuid(cash.id),
    date: cash.date,
    amount: Number(cash.amount),
    note: cash.note || '',
    created_at: cash.createdAt || new Date().toISOString()
  }));
  if (cashRows.length > 0) {
    console.log('Checking if daily_cash_sales table exists...');
    const { error: checkError } = await supabase.from('daily_cash_sales').select('id').limit(1);
    if (checkError) {
      console.log('⚠️ daily_cash_sales table not found in Supabase. Skipping cash sales migration.');
    } else {
      await cleanAndInsert('daily_cash_sales', cashRows);
    }
  }

  console.log('\n🎉 Seeding operations completed!');
}

run();
