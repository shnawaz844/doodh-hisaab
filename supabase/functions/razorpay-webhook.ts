// Supabase Edge Function: razorpay-webhook
// Recieves Razorpay payment events to update billing and payment records in real-time

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.json();

    // Verify webhook signature in production:
    // const expectedSignature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex');
    // if (signature !== expectedSignature) { return new Response('Unauthorized', { status: 401 }); }

    console.log('Razorpay webhook event received:', body.event);

    if (body.event === 'payment.captured') {
      const paymentPayload = body.payload.payment.entity;
      const paymentId = paymentPayload.id;
      const rawAmount = paymentPayload.amount; // In paise (e.g. 50000 paise = 500.00 INR)
      const amount = rawAmount / 100;
      const notes = paymentPayload.notes; // e.g. { customer_id: "...", bill_id: "..." }

      const customerId = notes?.customer_id;
      const billId = notes?.bill_id;

      if (!customerId) {
        return new Response('Customer context missing in notes', { status: 400 });
      }

      // 1. Insert entry into payments table
      const { data: newPayment, error: paymentErr } = await supabase
        .from('payments')
        .insert({
          customer_id: customerId,
          amount: amount,
          status: 'paid',
          method: 'razorpay',
          razorpay_payment_id: paymentId,
          note: `Auto-credited via Razorpay webhook. Event: ${body.event}`
        })
        .select()
        .single();

      if (paymentErr) throw paymentErr;

      // 2. If payment is linked to a monthly bill, update that bill to paid
      if (billId) {
        const { error: billErr } = await supabase
          .from('monthly_bills')
          .update({ status: 'paid' })
          .eq('id', billId);

        if (billErr) throw billErr;
      }

      // 3. Increment/Decrement customer balance if prepay
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('billing_type, balance')
        .eq('id', customerId)
        .single();

      if (profile && profile.billing_type === 'prepaid') {
        await supabase
          .from('customer_profiles')
          .update({ balance: parseFloat(profile.balance) + amount })
          .eq('id', customerId);
      }

      // 4. Send FCM Push Notification
      await supabase
        .from('notifications')
        .insert({
          user_id: customerId,
          title: 'Payment Successful 💳',
          message: `Your payment of ₹${amount} was received and credited successfully. ID: ${paymentId}`,
          type: 'bill'
        });
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    });
  } catch (error: any) {
    console.error('Webhook processing failure:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
