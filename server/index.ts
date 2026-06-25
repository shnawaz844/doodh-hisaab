import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Use Service Role Key for backend administration (bypassing RLS), fallback to Anon Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[Express Backend] Supabase client initialized. Key mode: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon Key'}`);
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
  }
} else {
  console.warn('Supabase credentials missing in .env. Backend server operating with no DB bindings.');
}

// Log audit changes helper
const addAuditLog = async (tableName: string, actionType: 'insert' | 'update' | 'delete', oldData: any, newData: any) => {
  try {
    if (!supabase) return;
    await supabase.from('audit_logs').insert({
      table_name: tableName,
      action_type: actionType,
      old_data: oldData || {},
      new_data: newData || {},
      performed_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // Default admin UUID
    });
  } catch (err: any) {
    console.error('[Express Backend] Failed to write audit log:', err.message);
  }
};

// Dispatch a notification
async function sendNotification(userId: string, title: string, message: string, type: string) {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Express Backend] Notification insert failed:', error.message);
    }
    return data;
  } catch (err: any) {
    console.error('[Express Backend] Failed to sync notification to Supabase:', err.message);
    return null;
  }
}

const roleUuidMap: Record<string, string> = {
  'admin': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin1': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'staff1': 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
};

function toUuid(id: string | undefined): string {
  if (!id) return 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // default to admin UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return roleUuidMap[id] || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
}

// Helper to map DB customer profile + subscriptions to Frontend Customer representation
function formatCustomer(dbCust: any, subscriptions: any[]): any {
  const custSubs = (subscriptions || []).filter(s => s.customer_id === dbCust.id && s.status === 'active');
  const morningQty = custSubs.filter(s => s.delivery_time === 'morning' || s.delivery_time === 'both').reduce((sum, s) => sum + Number(s.quantity), 0);
  const eveningQty = custSubs.filter(s => s.delivery_time === 'evening' || s.delivery_time === 'both').reduce((sum, s) => sum + Number(s.quantity), 0);
  
  // Determine primary milk type
  const hasBuffalo = custSubs.some(s => s.milk_type === 'buffalo');
  const milkType = hasBuffalo ? 'buffalo' : 'cow';

  // Buffalo has two tiers: 'standard' (buffalo_rate) and 'premium' (buffalo_premium_rate)
  const buffaloTier: 'standard' | 'premium' = dbCust.buffalo_tier === 'premium' ? 'premium' : 'standard';
  let rate: number;
  if (milkType === 'buffalo') {
    rate = buffaloTier === 'premium'
      ? Number(dbCust.buffalo_premium_rate || 80)
      : Number(dbCust.buffalo_rate || 72);
  } else {
    rate = Number(dbCust.cow_rate || 60);
  }
  
  return {
    id: dbCust.id,
    name: dbCust.name,
    mobile: dbCust.mobile,
    address: dbCust.address,
    type: dbCust.billing_type, // 'monthly' | 'prepaid'
    milkType,
    buffaloTier,
    rate,
    morningQty,
    eveningQty,
    status: dbCust.status,
    balance: Number(dbCust.balance || 0),
    cowRate: Number(dbCust.cow_rate || 60),
    buffaloRate: Number(dbCust.buffalo_rate || 72),
    buffaloPremiumRate: Number(dbCust.buffalo_premium_rate || 80),
    createdAt: dbCust.created_at
  };
}

// --- API ENDPOINTS ---

// 1. SETTINGS APIs
app.get('/api/settings/fetch', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Supabase settings fetch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/update', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and Value are required' });
  }

  try {
    // Check old value to see if rates changed (to dispatch promo alerts)
    const { data: oldRow } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    const oldVal = oldRow?.value || '';

    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select();
    if (error) throw error;

    await addAuditLog('settings', 'update', { [key]: oldVal }, { [key]: value });

    // Send price change notifications to ALL customers
    if ((key === 'cow_base_rate' || key === 'buffalo_base_rate' || key === 'buffalo_premium_rate') && oldVal !== String(value)) {
      const milkLabel = key === 'cow_base_rate' ? 'Cow Milk' : key === 'buffalo_premium_rate' ? 'Buffalo Premium Milk' : 'Buffalo Standard Milk';
      const oldPrice = parseFloat(oldVal || '0');
      const newPrice = parseFloat(String(value));
      const direction = newPrice > oldPrice ? 'increased' : 'decreased';
      const emoji = newPrice > oldPrice ? '📈' : '📉';

      const notifTitle = `${milkLabel} Rate ${emoji} Updated`;
      const notifMsg = `The rate of ${milkLabel} has ${direction} from ₹${oldPrice.toFixed(2)}/L to ₹${newPrice.toFixed(2)}/L. New rate is effective immediately.`;

      const { data: customers } = await supabase.from('customer_profiles').select('id');
      if (customers) {
        for (const cust of customers) {
          await sendNotification(cust.id, notifTitle, notifMsg, 'promo');
        }
      }
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Supabase settings update error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 2. CUSTOMERS APIs
app.get('/api/customers', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data: customerProfiles, error: custErr } = await supabase.from('customer_profiles').select('*');
    if (custErr) throw custErr;

    const { data: subscriptions, error: subErr } = await supabase.from('subscriptions').select('*');
    if (subErr) throw subErr;

    const formatted = (customerProfiles || []).map((dbCust: any) => 
      formatCustomer(dbCust, subscriptions || [])
    );
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get customers error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { 
    name, mobile, address, type, buffaloTier, status, balance,
    cowRate, cowMorningQty, cowEveningQty,
    buffaloRate, buffaloPremiumRate, buffaloMorningQty, buffaloEveningQty
  } = req.body;

  try {
    // Resolve default rates from settings
    let defaultCowRate = 60, defaultBuffStd = 72, defaultBuffPrem = 80;
    const { data: settingsRows } = await supabase.from('settings').select('key, value');
    if (settingsRows) {
      const cr = settingsRows.find((s: any) => s.key === 'cow_base_rate');
      const br = settingsRows.find((s: any) => s.key === 'buffalo_base_rate');
      const bp = settingsRows.find((s: any) => s.key === 'buffalo_premium_rate');
      if (cr) defaultCowRate = Number(cr.value);
      if (br) defaultBuffStd = Number(br.value);
      if (bp) defaultBuffPrem = Number(bp.value);
    }

    const tier = buffaloTier === 'premium' ? 'premium' : 'standard';

    // 1. Create a Supabase Auth user (automatically syncing to public users table)
    let customerId = randomUUID();
    const normalizedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    const userEmail = `${mobile.replace(/\D/g, '')}@doodhfarm.com`;

    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: 'Chotabhai@123',
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { role: 'customer', name }
      });

      if (authErr) {
        console.warn('[Express Backend] Auth user creation warning:', authErr.message);
        // Fallback: If user/phone already exists, search existing user in public users table to reuse ID
        const { data: existingUsers } = await supabase
          .from('users')
          .select('id')
          .or(`phone.eq."${mobile}",phone.eq."${normalizedPhone}",email.eq."${userEmail}"`)
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          customerId = existingUsers[0].id;
          console.log('[Express Backend] Found and reusing existing user ID:', customerId);
        }
      } else if (authData?.user) {
        customerId = authData.user.id;
        console.log('[Express Backend] Auth user created successfully with ID:', customerId);
      }
    } catch (err: any) {
      console.error('[Express Backend] Exception in auth user creation:', err.message);
    }

    // Sync raw_password to public.users table
    try {
      const { error: rawPassErr } = await supabase
        .from('users')
        .update({ raw_password: 'Chotabhai@123' })
        .eq('id', customerId);
      if (rawPassErr) {
        console.warn('[Express Backend] Failed to sync raw_password to public.users:', rawPassErr.message);
      }
    } catch (err: any) {
      console.warn('[Express Backend] Exception syncing raw_password:', err.message);
    }

    // Resolve rates
    let resolvedCowRate = Number(cowRate) || (req.body.milkType === 'cow' ? Number(req.body.rate) : 0) || defaultCowRate;
    let resolvedBuffaloRate = Number(buffaloRate) || (req.body.milkType === 'buffalo' && tier === 'standard' ? Number(req.body.rate) : 0) || defaultBuffStd;
    let resolvedBuffaloPremiumRate = Number(buffaloPremiumRate) || (req.body.milkType === 'buffalo' && tier === 'premium' ? Number(req.body.rate) : 0) || defaultBuffPrem;

    const newCust = {
      id: customerId,
      name,
      mobile,
      address,
      billing_type: type || 'monthly',
      status: status || 'active',
      balance: Number(balance) || 0,
      buffalo_tier: tier,
      cow_rate: resolvedCowRate,
      buffalo_rate: resolvedBuffaloRate,
      buffalo_premium_rate: resolvedBuffaloPremiumRate
    };

    const { data: customer, error: custErr } = await supabase.from('customer_profiles').upsert(newCust).select().single();
    if (custErr) throw custErr;

    const finalSubs: any[] = [];
    const billingType = type || 'monthly';
    if (billingType !== 'prepaid') {
      // Helper function to create active subscription
      const createSub = async (milkType: 'cow' | 'buffalo', qty: number, deliveryTime: 'morning' | 'evening') => {
        const { data, error } = await supabase.from('subscriptions').insert({
          id: randomUUID(),
          customer_id: customer.id,
          milk_type: milkType,
          quantity: qty,
          delivery_time: deliveryTime,
          status: 'active'
        }).select().single();
        if (error) console.error('[Express Backend] Subscription insert failed:', error.message);
        return data;
      };

      // 1. Cow Morning Subscription
      const cowMornQty = Number(cowMorningQty) || (req.body.milkType === 'cow' ? Number(req.body.morningQty) : 0);
      if (cowMornQty > 0) {
        const sub = await createSub('cow', cowMornQty, 'morning');
        if (sub) finalSubs.push(sub);
      }

      // 2. Cow Evening Subscription
      const cowEveQty = Number(cowEveningQty) || (req.body.milkType === 'cow' ? Number(req.body.eveningQty) : 0);
      if (cowEveQty > 0) {
        const sub = await createSub('cow', cowEveQty, 'evening');
        if (sub) finalSubs.push(sub);
      }

      // 3. Buffalo Morning Subscription
      const buffMornQty = Number(buffaloMorningQty) || (req.body.milkType === 'buffalo' ? Number(req.body.morningQty) : 0);
      if (buffMornQty > 0) {
        const sub = await createSub('buffalo', buffMornQty, 'morning');
        if (sub) finalSubs.push(sub);
      }

      // 4. Buffalo Evening Subscription
      const buffEveQty = Number(buffaloEveningQty) || (req.body.milkType === 'buffalo' ? Number(req.body.eveningQty) : 0);
      if (buffEveQty > 0) {
        const sub = await createSub('buffalo', buffEveQty, 'evening');
        if (sub) finalSubs.push(sub);
      }
    }

    await addAuditLog('customer_profiles', 'insert', null, customer);

    const formatted = formatCustomer(customer, finalSubs);
    return res.status(201).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Create customer error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { 
    name, mobile, address, type, status, balance, buffaloTier,
    cowRate, cowMorningQty, cowEveningQty,
    buffaloRate, buffaloPremiumRate, buffaloMorningQty, buffaloEveningQty,
    milkType, rate, morningQty, eveningQty
  } = req.body;

  try {
    const { data: oldCust, error: getErr } = await supabase.from('customer_profiles').select('*').eq('id', id).single();
    if (getErr || !oldCust) return res.status(404).json({ error: 'Customer not found' });

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) {
      updates.mobile = mobile;
      if (mobile !== oldCust.mobile) {
        try {
          const userEmail = `${mobile.replace(/\D/g, '')}@doodhfarm.com`;
          const normalizedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
          await supabase.auth.admin.updateUserById(id, {
            email: userEmail,
            phone: normalizedPhone
          });
          console.log('[Express Backend] Successfully synced updated phone and email to Supabase Auth.');
        } catch (authErr: any) {
          console.error('[Express Backend] Failed to sync update to Supabase Auth:', authErr.message);
        }
      }
    }
    if (address !== undefined) updates.address = address;
    if (type !== undefined) updates.billing_type = type;
    if (status !== undefined) updates.status = status;
    if (balance !== undefined) updates.balance = Number(balance);
    if (buffaloTier !== undefined) updates.buffalo_tier = buffaloTier;

    // Resolve rates updates
    if (cowRate !== undefined) updates.cow_rate = Number(cowRate);
    if (buffaloRate !== undefined) updates.buffalo_rate = Number(buffaloRate);
    if (buffaloPremiumRate !== undefined) updates.buffalo_premium_rate = Number(buffaloPremiumRate);

    // Fallback logic for legacy singular milk update
    if (rate !== undefined) {
      const activeMilkType = milkType || (oldCust.buffalo_rate ? 'buffalo' : 'cow');
      const activeTier = buffaloTier || oldCust.buffalo_tier || 'standard';
      if (activeMilkType === 'cow') {
        updates.cow_rate = Number(rate);
      } else if (activeTier === 'premium') {
        updates.buffalo_premium_rate = Number(rate);
      } else {
        updates.buffalo_rate = Number(rate);
      }
    }

    const { data: customer, error: updateErr } = await supabase.from('customer_profiles').update(updates).eq('id', id).select().single();
    if (updateErr) throw updateErr;

    // Load active subscriptions to sync quantities
    const { data: existingSubs } = await supabase.from('subscriptions').select('*').eq('customer_id', id).eq('status', 'active');
    const subs = existingSubs || [];

    // Sync helper
    const syncSub = async (mType: 'cow' | 'buffalo', deliveryTime: 'morning' | 'evening', targetQty: any) => {
      if (targetQty === undefined) return;
      const sub = subs.find(s => s.milk_type === mType && s.delivery_time === deliveryTime);
      const qty = Number(targetQty);
      if (sub) {
        if (qty === 0) {
          await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
        } else {
          await supabase.from('subscriptions').update({ quantity: qty, status: 'active' }).eq('id', sub.id);
        }
      } else if (qty > 0) {
        await supabase.from('subscriptions').insert({
          id: randomUUID(),
          customer_id: id,
          milk_type: mType,
          quantity: qty,
          delivery_time: deliveryTime,
          status: 'active'
        });
      }
    };

    // Determine target quantities resolving both new and legacy values
    let targetCowMorn = cowMorningQty;
    let targetCowEve = cowEveningQty;
    let targetBuffMorn = buffaloMorningQty;
    let targetBuffEve = buffaloEveningQty;

    // Fallback if old format parameter is provided
    const activeMilkType = milkType || (oldCust.buffalo_rate ? 'buffalo' : 'cow');
    if (activeMilkType === 'cow') {
      if (morningQty !== undefined) targetCowMorn = morningQty;
      if (eveningQty !== undefined) targetCowEve = eveningQty;
    } else if (activeMilkType === 'buffalo') {
      if (morningQty !== undefined) targetBuffMorn = morningQty;
      if (eveningQty !== undefined) targetBuffEve = eveningQty;
    }

    await syncSub('cow', 'morning', targetCowMorn);
    await syncSub('cow', 'evening', targetCowEve);
    await syncSub('buffalo', 'morning', targetBuffMorn);
    await syncSub('buffalo', 'evening', targetBuffEve);

    const { data: finalSubs } = await supabase.from('subscriptions').select('*').eq('customer_id', id);

    await addAuditLog('customer_profiles', 'update', oldCust, customer);

    const formatted = formatCustomer(customer, finalSubs || []);
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Update customer error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;

  try {
    const { data: oldData } = await supabase.from('customer_profiles').select('*').eq('id', id).single();
    if (!oldData) return res.status(404).json({ error: 'Customer not found' });

    const { error } = await supabase.from('customer_profiles').delete().eq('id', id);
    if (error) throw error;

    await addAuditLog('customer_profiles', 'delete', oldData, null);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Express Backend] Delete customer error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 3. SUBSCRIPTIONS APIs
app.get('/api/subscriptions', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error) throw error;

    const formatted = (data || []).map((sub: any) => ({
      id: sub.id,
      customerId: sub.customer_id,
      milkType: sub.milk_type,
      quantity: Number(sub.quantity),
      deliveryTime: sub.delivery_time,
      status: sub.status,
      pausedAt: sub.paused_at,
      resumedAt: sub.resumed_at,
      createdAt: sub.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get subscriptions error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { customerId, newCustomer, milkType, quantity, deliveryTime, status } = req.body;

  try {
    let finalCustomerId = customerId;
    let createdCustomerProfile: any = null;

    // Handle inline new customer creation if requested
    if (newCustomer) {
      // Fetch default rates from settings
      let cowRate = 60;
      let buffaloRate = 72;
      const { data: settings } = await supabase.from('settings').select('key, value');
      if (settings) {
        const cowRow = settings.find((s: any) => s.key === 'cow_base_rate');
        const buffRow = settings.find((s: any) => s.key === 'buffalo_base_rate');
        if (cowRow) cowRate = Number(cowRow.value);
        if (buffRow) buffaloRate = Number(buffRow.value);
      }

      let customerId = randomUUID();
      const normalizedPhone = newCustomer.mobile.startsWith('+') ? newCustomer.mobile : `+91${newCustomer.mobile}`;
      const userEmail = `${newCustomer.mobile.replace(/\D/g, '')}@doodhfarm.com`;

      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: userEmail,
          password: 'Chotabhai@123',
          phone: normalizedPhone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { role: 'customer', name: newCustomer.name }
        });

        if (authErr) {
          console.warn('[Express Backend] Inline Auth user creation warning:', authErr.message);
          const { data: existingUsers } = await supabase
            .from('users')
            .select('id')
            .or(`phone.eq."${newCustomer.mobile}",phone.eq."${normalizedPhone}",email.eq."${userEmail}"`)
            .limit(1);

          if (existingUsers && existingUsers.length > 0) {
            customerId = existingUsers[0].id;
          }
        } else if (authData?.user) {
          customerId = authData.user.id;
        }
      } catch (err: any) {
        console.error('[Express Backend] Exception in inline auth user creation:', err.message);
      }

      // Sync raw_password to public.users table
      try {
        const { error: rawPassErr } = await supabase
          .from('users')
          .update({ raw_password: 'Chotabhai@123' })
          .eq('id', customerId);
        if (rawPassErr) {
          console.warn('[Express Backend] Failed to sync raw_password to public.users:', rawPassErr.message);
        }
      } catch (err: any) {
        console.warn('[Express Backend] Exception syncing raw_password:', err.message);
      }

      const newCustPayload = {
        id: customerId,
        name: newCustomer.name,
        mobile: newCustomer.mobile,
        address: newCustomer.address || '',
        billing_type: newCustomer.type || 'monthly',
        status: 'active',
        balance: 0,
        cow_rate: cowRate,
        buffalo_rate: buffaloRate
      };

      const { data: profile, error: profErr } = await supabase
        .from('customer_profiles')
        .upsert(newCustPayload)
        .select()
        .single();
      
      if (profErr) throw profErr;
      
      createdCustomerProfile = profile;
      finalCustomerId = profile.id;
      
      await addAuditLog('customer_profiles', 'insert', null, profile);
    }

    const newSub = {
      id: randomUUID(),
      customer_id: finalCustomerId,
      milk_type: milkType,
      quantity: Number(quantity) || 1,
      delivery_time: deliveryTime,
      status: status || 'active'
    };

    const { data: subData, error: subErr } = await supabase.from('subscriptions').insert(newSub).select().single();
    if (subErr) throw subErr;

    const customerName = createdCustomerProfile?.name || 'Customer';
    if (!createdCustomerProfile) {
      const { data: customer } = await supabase.from('customer_profiles').select('name').eq('id', finalCustomerId).single();
      if (customer) {
        await sendNotification(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Admin UUID
          'New Subscription scheduled 📅',
          `${customer.name} subscribed to ${quantity}L of ${milkType} milk (${deliveryTime}).`,
          'reminder'
        );
      }
    } else {
      await sendNotification(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Admin UUID
        'New Customer & Subscription scheduled 📅',
        `${customerName} registered & subscribed to ${quantity}L of ${milkType} milk (${deliveryTime}).`,
        'reminder'
      );
    }

    const formattedSub = {
      id: subData.id,
      customerId: subData.customer_id,
      milkType: subData.milk_type,
      quantity: Number(subData.quantity),
      deliveryTime: subData.delivery_time,
      status: subData.status,
      pausedAt: subData.paused_at,
      resumedAt: subData.resumed_at,
      createdAt: subData.created_at
    };

    if (createdCustomerProfile) {
      // Format customer profile incorporating the active subscription
      const formattedCust = formatCustomer(createdCustomerProfile, [subData]);
      return res.status(201).json({
        customer: formattedCust,
        subscription: formattedSub
      });
    }

    return res.status(201).json(formattedSub);
  } catch (err: any) {
    console.error('[Express Backend] Create subscription error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { status, quantity, deliveryTime, milkType } = req.body;

  try {
    const updates: any = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'paused') updates.paused_at = new Date().toISOString();
      if (status === 'active') updates.resumed_at = new Date().toISOString();
    }
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (deliveryTime !== undefined) updates.delivery_time = deliveryTime;
    if (milkType !== undefined) updates.milk_type = milkType;

    const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', id).select().single();
    if (error) throw error;

    return res.status(200).json({
      id: data.id,
      customerId: data.customer_id,
      milkType: data.milk_type,
      quantity: Number(data.quantity),
      deliveryTime: data.delivery_time,
      status: data.status,
      pausedAt: data.paused_at,
      resumedAt: data.resumed_at,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Update subscription error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 4. DAILY MILK ENTRIES APIs
app.get('/api/entries', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  const { date, customerId } = req.query;

  try {
    let query = supabase.from('daily_milk_entries').select('*');
    if (date) query = query.eq('date', date);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((e: any) => ({
      id: e.id,
      customerId: e.customer_id,
      date: e.date,
      shift: e.shift,
      milkType: e.milk_type,
      quantity: Number(e.quantity),
      rate: Number(e.rate),
      amount: Number(e.amount),
      note: e.note,
      createdBy: e.created_by,
      createdAt: e.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get entries error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/entries', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { customerId, date, shift, milkType, quantity, rate, note, createdBy } = req.body;

  try {
    const newEntry = {
      id: randomUUID(),
      customer_id: customerId,
      date,
      shift,
      milk_type: milkType,
      quantity: Number(quantity),
      rate: Number(rate),
      note: note || '',
      created_by: toUuid(createdBy)
    };

    const { data, error } = await supabase.from('daily_milk_entries').insert(newEntry).select().single();
    if (error) throw error;

    // Deduct from customer balance
    const amount = Number(quantity) * Number(rate);
    const { data: customer } = await supabase.from('customer_profiles').select('balance').eq('id', customerId).single();
    if (customer) {
      const newBalance = Number(customer.balance || 0) - amount;
      await supabase.from('customer_profiles').update({ balance: newBalance }).eq('id', customerId);
    }

    return res.status(201).json({
      id: data.id,
      customerId: data.customer_id,
      date: data.date,
      shift: data.shift,
      milkType: data.milk_type,
      quantity: Number(data.quantity),
      rate: Number(data.rate),
      amount: Number(data.amount),
      note: data.note,
      createdBy: data.created_by
    });
  } catch (err: any) {
    console.error('[Express Backend] Log entry error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { quantity, rate, note } = req.body;

  try {
    const { data: oldEntry } = await supabase.from('daily_milk_entries').select('*').eq('id', id).single();
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    const updates: any = {};
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (rate !== undefined) updates.rate = Number(rate);
    if (note !== undefined) updates.note = note;

    const { data: updatedEntry, error } = await supabase.from('daily_milk_entries').update(updates).eq('id', id).select().single();
    if (error) throw error;

    // Adjust customer balance
    const oldAmount = Number(oldEntry.amount);
    const newAmount = Number(updatedEntry.amount);
    const difference = newAmount - oldAmount;

    const { data: customer } = await supabase.from('customer_profiles').select('balance').eq('id', oldEntry.customer_id).single();
    if (customer) {
      const newBalance = Number(customer.balance || 0) - difference;
      await supabase.from('customer_profiles').update({ balance: newBalance }).eq('id', oldEntry.customer_id);
    }

    return res.status(200).json({
      id: updatedEntry.id,
      customerId: updatedEntry.customer_id,
      date: updatedEntry.date,
      shift: updatedEntry.shift,
      milkType: updatedEntry.milk_type,
      quantity: Number(updatedEntry.quantity),
      rate: Number(updatedEntry.rate),
      amount: Number(updatedEntry.amount),
      note: updatedEntry.note,
      createdBy: updatedEntry.created_by
    });
  } catch (err: any) {
    console.error('[Express Backend] Update entry error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;

  try {
    const { data: entry } = await supabase.from('daily_milk_entries').select('*').eq('id', id).single();
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const { error } = await supabase.from('daily_milk_entries').delete().eq('id', id);
    if (error) throw error;

    const { data: customer } = await supabase.from('customer_profiles').select('balance').eq('id', entry.customer_id).single();
    if (customer) {
      const newBalance = Number(customer.balance || 0) + Number(entry.amount);
      await supabase.from('customer_profiles').update({ balance: newBalance }).eq('id', entry.customer_id);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Express Backend] Delete entry error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 4b. BULK DAILY ENTRIES (Quick Fill for all monthly customers at once)
app.post('/api/entries/bulk', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { entries } = req.body; // array of { customerId, date, shift, milkType, quantity, rate, note }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array is required' });
  }

  try {
    const results: any[] = [];
    const errors: any[] = [];

    for (const e of entries) {
      const { customerId, date, shift, milkType, quantity, rate, note } = e;
      if (!customerId || !date || !shift || quantity === undefined || quantity === null || isNaN(Number(quantity)) || !rate) {
        errors.push({ customerId, error: 'Missing required fields' });
        continue;
      }

      // Skip if entry already exists for this customer/date/shift
      const { data: existing } = await supabase
        .from('daily_milk_entries')
        .select('id')
        .eq('customer_id', customerId)
        .eq('date', date)
        .eq('shift', shift)
        .maybeSingle();

      if (existing) {
        results.push({ customerId, skipped: true, reason: 'Entry already exists for this date/shift' });
        continue;
      }

      const newEntry = {
        id: randomUUID(),
        customer_id: customerId,
        date,
        shift,
        milk_type: milkType || 'buffalo',
        quantity: Number(quantity),
        rate: Number(rate),
        note: note || '',
        created_by: toUuid('admin')
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('daily_milk_entries')
        .insert(newEntry)
        .select()
        .single();

      if (insertErr) {
        errors.push({ customerId, error: insertErr.message });
        continue;
      }

      // Deduct from customer balance
      const amount = Number(quantity) * Number(rate);
      const { data: cust } = await supabase.from('customer_profiles').select('balance').eq('id', customerId).single();
      if (cust) {
        await supabase.from('customer_profiles').update({ balance: Number(cust.balance || 0) - amount }).eq('id', customerId);
      }

      results.push({ customerId, id: inserted.id, logged: true });
    }

    return res.status(200).json({ results, errors, total: entries.length, logged: results.filter(r => r.logged).length, skipped: results.filter(r => r.skipped).length });
  } catch (err: any) {
    console.error('[Express Backend] Bulk entries error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 5. ONE-TIME ORDERS APIs
app.get('/api/orders', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw error;

    const formatted = (data || []).map((o: any) => ({
      id: o.id,
      customerId: o.customer_id,
      date: o.date,
      shift: o.shift,
      milkType: o.milk_type,
      quantity: Number(o.quantity),
      rate: Number(o.rate),
      totalAmount: Number(o.total_amount),
      status: o.status,
      paymentStatus: o.payment_status,
      addressId: o.address_id,
      createdAt: o.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get orders error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { customerId, date, shift, milkType, quantity, rate, status, paymentStatus, addressId } = req.body;

  try {
    const totalAmount = Number(quantity) * Number(rate);
    const newOrder = {
      id: randomUUID(),
      customer_id: customerId,
      date,
      shift,
      milk_type: milkType,
      quantity: Number(quantity),
      rate: Number(rate),
      total_amount: totalAmount,
      status: status || 'pending',
      payment_status: paymentStatus || 'pending',
      address_id: addressId
    };

    const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
    if (error) throw error;

    const { data: customer } = await supabase.from('customer_profiles').select('name').eq('id', customerId).single();
    const customerName = customer?.name || 'Customer';

    await sendNotification(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Admin UUID
      'New Order Received ⚡',
      `${customerName} booked ${quantity}L of ${milkType} milk.`,
      'order'
    );

    return res.status(201).json({
      id: data.id,
      customerId: data.customer_id,
      date: data.date,
      shift: data.shift,
      milkType: data.milk_type,
      quantity: Number(data.quantity),
      rate: Number(data.rate),
      totalAmount: Number(data.total_amount),
      status: data.status,
      paymentStatus: data.payment_status,
      addressId: data.address_id,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Create order error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { status, paymentStatus, quantity, rate } = req.body;

  try {
    const { data: oldOrder } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!oldOrder) return res.status(404).json({ error: 'Order not found' });

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (paymentStatus !== undefined) updates.payment_status = paymentStatus;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (rate !== undefined) updates.rate = Number(rate);
    if (quantity !== undefined || rate !== undefined) {
      const q = quantity !== undefined ? Number(quantity) : Number(oldOrder.quantity);
      const r = rate !== undefined ? Number(rate) : Number(oldOrder.rate);
      updates.total_amount = q * r;
    }

    const { data: updatedOrder, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;

    if (status && status !== oldOrder.status) {
      let statusText = status.replace(/_/g, ' ');
      statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
      await sendNotification(
        updatedOrder.customer_id,
        `Order Status Update: ${statusText} 🥛`,
        `Your order for ${updatedOrder.quantity}L of ${updatedOrder.milk_type} milk has been ${statusText.toLowerCase()}.`,
        'order'
      );

      if (status === 'delivered') {
        // Auto-create delivery log in daily_milk_entries
        const { error: entryErr } = await supabase.from('daily_milk_entries').insert({
          id: randomUUID(),
          customer_id: updatedOrder.customer_id,
          date: updatedOrder.date,
          shift: updatedOrder.shift,
          milk_type: updatedOrder.milk_type,
          quantity: Number(updatedOrder.quantity),
          rate: Number(updatedOrder.rate),
          note: `Instant order delivery confirmation`,
          created_by: toUuid('admin')
        });
        if (entryErr) {
          console.error('[Express Backend] Failed to auto-create delivery log for order:', entryErr.message);
        }

        // Deduct from customer balance
        const amount = Number(updatedOrder.quantity) * Number(updatedOrder.rate);
        const { data: customer } = await supabase.from('customer_profiles').select('balance').eq('id', updatedOrder.customer_id).single();
        if (customer) {
          const newBalance = Number(customer.balance || 0) - amount;
          await supabase.from('customer_profiles').update({ balance: newBalance }).eq('id', updatedOrder.customer_id);
        }
      }
    }

    return res.status(200).json({
      id: updatedOrder.id,
      customerId: updatedOrder.customer_id,
      date: updatedOrder.date,
      shift: updatedOrder.shift,
      milkType: updatedOrder.milk_type,
      quantity: Number(updatedOrder.quantity),
      rate: Number(updatedOrder.rate),
      totalAmount: Number(updatedOrder.total_amount),
      status: updatedOrder.status,
      paymentStatus: updatedOrder.payment_status,
      addressId: updatedOrder.address_id,
      createdAt: updatedOrder.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Update order error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 6. MONTHLY BILLS APIs
app.get('/api/bills', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('monthly_bills').select('*');
    if (error) throw error;

    const formatted = (data || []).map((b: any) => ({
      id: b.id,
      customerId: b.customer_id,
      month: Number(b.month),
      year: Number(b.year),
      milkQtyCow: Number(b.milk_qty_cow),
      milkQtyBuffalo: Number(b.milk_qty_buffalo),
      totalAmount: Number(b.total_amount),
      previousDue: Number(b.previous_due),
      extraCharges: Number(b.extra_charges),
      discount: Number(b.discount),
      grandTotal: Number(b.grand_total),
      status: b.status,
      pdfUrl: b.pdf_url,
      whatsappStatus: b.whatsapp_status,
      whatsappSentAt: b.whatsapp_sent_at,
      createdAt: b.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get bills error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/generate', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { month, year } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and Year are required' });
  }

  try {
    const { data: customers } = await supabase.from('customer_profiles').select('*');
    const { data: entries } = await supabase.from('daily_milk_entries').select('*');
    const { data: existingBills } = await supabase.from('monthly_bills').select('*');

    const generatedBills: any[] = [];
    for (const customer of (customers || [])) {
      const customerEntries = (entries || []).filter(e => {
        const entryDate = new Date(e.date);
        return e.customer_id === customer.id &&
               (entryDate.getMonth() + 1) === Number(month) &&
               entryDate.getFullYear() === Number(year);
      });

      if (customerEntries.length === 0) continue;

      const qtyCow = customerEntries.filter(e => e.milk_type === 'cow').reduce((sum, e) => sum + Number(e.quantity), 0);
      const qtyBuffalo = customerEntries.filter(e => e.milk_type === 'buffalo').reduce((sum, e) => sum + Number(e.quantity), 0);
      const totalMilkAmount = customerEntries.reduce((sum, e) => sum + (Number(e.quantity) * Number(e.rate)), 0);

      const prevUnpaidBills = (existingBills || []).filter(b => 
        b.customer_id === customer.id &&
        b.status === 'pending' &&
        (b.year < Number(year) || (b.year === Number(year) && b.month < Number(month)))
      );
      let prevDue = prevUnpaidBills.reduce((sum, b) => sum + Number(b.grand_total), 0);
      const extraCharges = 0;
      const discount = 0;
      let grandTotal = totalMilkAmount + prevDue + extraCharges - discount;
      let status = 'pending';

      if (customer.billing_type === 'prepaid') {
        prevDue = 0;
        if (Number(customer.balance || 0) >= totalMilkAmount) {
          const newBal = Number(customer.balance || 0) - totalMilkAmount;
          await supabase.from('customer_profiles').update({ balance: newBal }).eq('id', customer.id);
          status = 'paid';
          grandTotal = totalMilkAmount;
        } else {
          const covered = Number(customer.balance || 0);
          await supabase.from('customer_profiles').update({ balance: 0 }).eq('id', customer.id);
          status = 'partial';
          grandTotal = totalMilkAmount - covered;
        }
      }

      const existingBill = (existingBills || []).find(b => 
        b.customer_id === customer.id &&
        Number(b.month) === Number(month) &&
        Number(b.year) === Number(year)
      );
      const billId = existingBill ? existingBill.id : randomUUID();

      const newBill = {
        id: billId,
        customer_id: customer.id,
        month: Number(month),
        year: Number(year),
        milk_qty_cow: qtyCow,
        milk_qty_buffalo: qtyBuffalo,
        total_amount: totalMilkAmount,
        previous_due: prevDue,
        extra_charges: extraCharges,
        discount,
        grand_total: grandTotal,
        status,
        whatsapp_status: 'unsent'
      };

      const { error: upsertErr } = await supabase.from('monthly_bills').upsert(newBill, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      generatedBills.push(newBill);
    }

    const { data: allBills } = await supabase.from('monthly_bills').select('*');
    const formatted = (allBills || []).map((b: any) => ({
      id: b.id,
      customerId: b.customer_id,
      month: Number(b.month),
      year: Number(b.year),
      milkQtyCow: Number(b.milk_qty_cow),
      milkQtyBuffalo: Number(b.milk_qty_buffalo),
      totalAmount: Number(b.total_amount),
      previousDue: Number(b.previous_due),
      extraCharges: Number(b.extra_charges),
      discount: Number(b.discount),
      grandTotal: Number(b.grand_total),
      status: b.status,
      pdfUrl: b.pdf_url,
      whatsappStatus: b.whatsapp_status,
      whatsappSentAt: b.whatsapp_sent_at,
      createdAt: b.created_at
    }));

    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Generate bills error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/:id/send-whatsapp', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;

  try {
    const { data: bill, error } = await supabase.from('monthly_bills').select('*, customer_profiles(*)').eq('id', id).single();
    if (error || !bill) return res.status(404).json({ error: 'Bill not found' });

    const customer = bill.customer_profiles;
    const updatedBill = {
      whatsapp_status: 'sent',
      whatsapp_sent_at: new Date().toISOString(),
      pdf_url: bill.pdf_url || `https://supabase.co/storage/v1/object/public/invoices/bill_${bill.month}_${bill.year}_${id}.html`
    };

    await supabase.from('monthly_bills').update(updatedBill).eq('id', id);

    if (customer) {
      await sendNotification(
        customer.id,
        'Bill Sent on WhatsApp 🥛',
        `Your monthly invoice for ${bill.month}/${bill.year} was sent to +91${customer.mobile} with PDF bill.`,
        'bill'
      );
    }

    const { data: refreshedBill } = await supabase.from('monthly_bills').select('*').eq('id', id).single();
    return res.status(200).json({
      id: refreshedBill.id,
      customerId: refreshedBill.customer_id,
      month: Number(refreshedBill.month),
      year: Number(refreshedBill.year),
      milkQtyCow: Number(refreshedBill.milk_qty_cow),
      milkQtyBuffalo: Number(refreshedBill.milk_qty_buffalo),
      totalAmount: Number(refreshedBill.total_amount),
      previousDue: Number(refreshedBill.previous_due),
      extraCharges: Number(refreshedBill.extra_charges),
      discount: Number(refreshedBill.discount),
      grandTotal: Number(refreshedBill.grand_total),
      status: refreshedBill.status,
      pdfUrl: refreshedBill.pdf_url,
      whatsappStatus: refreshedBill.whatsapp_status,
      whatsappSentAt: refreshedBill.whatsapp_sent_at,
      createdAt: refreshedBill.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Send WhatsApp bill error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 7. PAYMENTS APIs
app.get('/api/payments', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) throw error;

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      customerId: p.customer_id,
      amount: Number(p.amount),
      date: p.date,
      status: p.status,
      method: p.method,
      razorpayPaymentId: p.razorpay_payment_id,
      note: p.note,
      receiptUrl: p.receipt_url,
      createdAt: p.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get payments error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { customerId, amount, date, method, note } = req.body;

  try {
    const newPayment = {
      id: randomUUID(),
      customer_id: customerId,
      amount: Number(amount) || 0,
      date,
      status: 'paid',
      method,
      note
    };

    const { data, error } = await supabase.from('payments').insert(newPayment).select().single();
    if (error) throw error;

    const { data: customer } = await supabase.from('customer_profiles').select('balance').eq('id', customerId).single();
    if (customer) {
      const newBalance = Number(customer.balance || 0) + Number(amount);
      await supabase.from('customer_profiles').update({ balance: newBalance }).eq('id', customerId);
    }

    await supabase.from('monthly_bills').update({ status: 'paid' }).eq('customer_id', customerId).eq('status', 'pending');

    return res.status(201).json({
      id: data.id,
      customerId: data.customer_id,
      amount: Number(data.amount),
      date: data.date,
      status: data.status,
      method: data.method,
      note: data.note,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Post payment error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 8. CATTLE MARKETPLACE APIs
app.get('/api/animal-listings', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('animal_listings').select('*');
    if (error) throw error;

    const formatted = (data || []).map((l: any) => ({
      id: l.id,
      sellerId: l.seller_id,
      animalType: l.animal_type,
      breed: l.breed,
      ageYears: Number(l.age_years),
      dailyMilkYield: Number(l.daily_milk_yield),
      price: Number(l.price),
      description: l.description,
      contactNumber: l.contact_number,
      location: l.location,
      status: l.status,
      images: l.images,
      createdAt: l.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get animal listings error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/animal-listings', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { sellerId, animalType, breed, ageYears, dailyMilkYield, price, description, contactNumber, location, status, images } = req.body;

  try {
    const newListing = {
      id: randomUUID(),
      seller_id: sellerId,
      animal_type: animalType,
      breed,
      age_years: Number(ageYears) || 3,
      daily_milk_yield: Number(dailyMilkYield) || 0,
      price: Number(price) || 0,
      description,
      contact_number: contactNumber,
      location,
      status: status || 'pending',
      images
    };

    const { data, error } = await supabase.from('animal_listings').insert(newListing).select().single();
    if (error) throw error;

    const { data: customer } = await supabase.from('customer_profiles').select('name').eq('id', sellerId).single();
    const customerName = customer?.name || 'Customer';

    await sendNotification(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'New Cattle Listing Pending 🐄',
      `${customerName} listed a ${breed} ${animalType} for approval.`,
      'reminder'
    );

    return res.status(201).json({
      id: data.id,
      sellerId: data.seller_id,
      animalType: data.animal_type,
      breed: data.breed,
      ageYears: Number(data.age_years),
      dailyMilkYield: Number(data.daily_milk_yield),
      price: Number(data.price),
      description: data.description,
      contactNumber: data.contact_number,
      location: data.location,
      status: data.status,
      images: data.images,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Create animal listing error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/animal-listings/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { status, price, description } = req.body;

  try {
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (price !== undefined) updates.price = Number(price);
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabase.from('animal_listings').update(updates).eq('id', id).select().single();
    if (error) throw error;

    return res.status(200).json({
      id: data.id,
      sellerId: data.seller_id,
      animalType: data.animal_type,
      breed: data.breed,
      ageYears: Number(data.age_years),
      dailyMilkYield: Number(data.daily_milk_yield),
      price: Number(data.price),
      description: data.description,
      contactNumber: data.contact_number,
      location: data.location,
      status: data.status,
      images: data.images,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Update animal listing error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 9. GALLERY APIs
app.get('/api/gallery', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('gallery_images').select('*');
    if (error) throw error;

    const formatted = (data || []).map((g: any) => ({
      id: g.id,
      imageUrl: g.image_url,
      category: g.category,
      description: g.description,
      createdAt: g.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get gallery error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/gallery', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { imageUrl, category, description } = req.body;

  try {
    const newImage = {
      id: randomUUID(),
      image_url: imageUrl,
      category,
      description
    };

    const { data, error } = await supabase.from('gallery_images').insert(newImage).select().single();
    if (error) throw error;

    return res.status(201).json({
      id: data.id,
      imageUrl: data.image_url,
      category: data.category,
      description: data.description,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Post gallery image error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;

  try {
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Express Backend] Delete gallery image error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 10. CMS PAGES APIs
app.get('/api/cms', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('cms_pages').select('*');
    if (error) throw error;

    const formatted = (data || []).map((p: any) => ({
      slug: p.slug,
      title: p.title,
      content: p.content,
      updatedAt: p.updated_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get CMS pages error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/cms/:slug', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { slug } = req.params;
  const { title, content } = req.body;

  try {
    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const { data, error } = await supabase.from('cms_pages').update(updates).eq('slug', slug).select().single();
    if (error) throw error;

    return res.status(200).json({
      slug: data.slug,
      title: data.title,
      content: data.content,
      updatedAt: data.updated_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Update CMS page error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 11. NOTIFICATIONS APIs
app.get('/api/notifications', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) throw error;

    const formatted = (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      sentAt: n.sent_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get notifications error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const { userId, title, message, type } = req.body;
  const newNotif = await sendNotification(userId, title, message, type);
  if (!newNotif) return res.status(500).json({ error: 'Notification failed' });
  return res.status(201).json(newNotif);
});

app.post('/api/notifications/broadcast', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const broadcastNotif = {
      id: randomUUID(),
      user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // admin UUID to satisfy FK and NOT NULL constraint
      title,
      message,
      type: 'broadcast',
      is_read: false,
      sent_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('notifications').insert(broadcastNotif).select().single();
    if (error) throw error;

    return res.status(201).json(data);
  } catch (err: any) {
    console.error('[Express Backend] Broadcast notification error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});


app.put('/api/notifications/:id/read', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;

  try {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).select().single();
    if (error) throw error;

    return res.status(200).json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: data.is_read,
      sentAt: data.sent_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Mark notification read error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 12. AUDIT LOGS APIs
app.get('/api/audit-logs', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('audit_logs').select('*');
    if (error) throw error;

    const formatted = (data || []).map((l: any) => ({
      id: l.id,
      tableName: l.table_name,
      actionType: l.action_type,
      oldData: l.old_data,
      newData: l.new_data,
      performedBy: l.performed_by,
      createdAt: l.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get audit logs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 13. DAILY CASH SALES APIs (anonymous walk-in ₹-based sales)
app.get('/api/daily-cash', async (req, res) => {
  if (!supabase) return res.status(200).json([]);
  try {
    const { data, error } = await supabase.from('daily_cash_sales').select('*').order('date', { ascending: false });
    if (error) {
      if (error.code === 'PGRST205') return res.status(200).json([]);
      throw error;
    }
    const formatted = (data || []).map((dc: any) => ({
      id: dc.id,
      date: dc.date,
      amount: Number(dc.amount),
      milkType: dc.milk_type || 'cow',
      rate: Number(dc.rate || 0),
      liters: Number(dc.liters || 0),
      note: dc.note,
      createdAt: dc.created_at
    }));
    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('[Express Backend] Get daily cash error:', err.message);
    return res.status(200).json([]);
  }
});

app.post('/api/daily-cash', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { date, amount, milkType, rate, note } = req.body;
  if (!date || amount === undefined) {
    return res.status(400).json({ error: 'Date and Amount are required' });
  }

  try {
    // Auto-calculate liters from rupee amount and rate
    const resolvedRate = Number(rate) || 0;
    const resolvedLiters = resolvedRate > 0 ? parseFloat((Number(amount) / resolvedRate).toFixed(3)) : 0;

    const payload: any = {
      date,
      amount: Number(amount),
      milk_type: milkType || 'cow',
      rate: resolvedRate,
      liters: resolvedLiters,
      note: note || ''
    };

    // Insert a new record for each sale (multiple walk-ins per day allowed)
    const { data, error } = await supabase.from('daily_cash_sales').insert(payload).select().single();
    if (error) throw error;

    return res.status(201).json({
      id: data.id,
      date: data.date,
      amount: Number(data.amount),
      milkType: data.milk_type || 'cow',
      rate: Number(data.rate || 0),
      liters: Number(data.liters || 0),
      note: data.note,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Save daily cash error:', err.message);
    return res.status(500).json({ error: err.message || 'daily_cash_sales table error.' });
  }
});

app.put('/api/daily-cash/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  const { date, amount, milkType, rate, note } = req.body;

  try {
    const resolvedRate = Number(rate) || 0;
    const resolvedLiters = resolvedRate > 0 ? parseFloat((Number(amount) / resolvedRate).toFixed(3)) : 0;

    const updates: any = {};
    if (date !== undefined) updates.date = date;
    if (amount !== undefined) updates.amount = Number(amount);
    if (milkType !== undefined) updates.milk_type = milkType;
    if (rate !== undefined) updates.rate = resolvedRate;
    updates.liters = resolvedLiters;
    if (note !== undefined) updates.note = note;

    const { data, error } = await supabase.from('daily_cash_sales').update(updates).eq('id', id).select().single();
    if (error) throw error;

    return res.status(200).json({
      id: data.id,
      date: data.date,
      amount: Number(data.amount),
      milkType: data.milk_type || 'cow',
      rate: Number(data.rate || 0),
      liters: Number(data.liters || 0),
      note: data.note,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('[Express Backend] Update daily cash error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/daily-cash/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('daily_cash_sales').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Express Backend] Delete daily cash error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/change-password', async (req, res) => {
  if (!supabase) {
    return res.status(200).json({ success: true, message: '[Mock] Password changed successfully.' });
  }

  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'User ID, current password, and new password are required.' });
  }

  try {
    // 1. Get user details (mainly email)
    const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
    if (getUserErr || !userData?.user) {
      return res.status(404).json({ error: 'User not found in authentication directory.' });
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found.' });
    }

    // 2. Verify current password by signing in with Supabase Auth
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword
    });

    if (authErr) {
      return res.status(400).json({ error: 'Invalid current password. Please try again.' });
    }

    // 3. Update the password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateErr) {
      return res.status(500).json({ error: `Failed to update password: ${updateErr.message}` });
    }

    // 4. Update raw_password field in public.users table
    try {
      const { error: dbErr } = await supabase
        .from('users')
        .update({ raw_password: newPassword })
        .eq('id', userId);
      if (dbErr) {
        console.warn('[Express Backend] Failed to update raw_password in users table:', dbErr.message);
      }
    } catch (dbEx: any) {
      console.warn('[Express Backend] Exception updating users table:', dbEx.message);
    }

    // 5. Send a confirmation notification
    await sendNotification(
      userId,
      'Password Updated 🔒',
      'Your account password has been changed successfully.',
      'alert'
    );

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[Express Backend] Change password error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[Express Backend] Server running on http://localhost:${PORT}`);
});
