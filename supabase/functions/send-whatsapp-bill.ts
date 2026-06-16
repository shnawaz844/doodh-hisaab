// Supabase Edge Function: send-whatsapp-bill
// Triggers Twilio/WhatsApp APIs to dispatch generated invoices to customers

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || 'mock_sid';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || 'mock_token';
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const { billId } = await req.json();
    if (!billId) {
      return new Response(JSON.stringify({ error: 'billId is required' }), { status: 400 });
    }

    // Fetch bill details and customer profile details
    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, customer_profiles(*)')
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      return new Response(JSON.stringify({ error: 'Bill details not found' }), { status: 404 });
    }

    const customer = bill.customer_profiles;
    const recipientMobile = customer.mobile;
    const invoicePdfUrl = bill.pdf_url || `https://supabase.co/storage/v1/object/public/invoices/mock_bill_${bill.id}.html`;
    const amountDue = bill.grand_total;

    // Razorpay mock payment URL creation
    const paymentLink = `https://api.razorpay.com/v1/payment_links/mock_pay_${bill.id}`;

    // WhatsApp Message Content
    const messageBody = `*DOODH HISAAB DAIRY INVOICE* 🥛\n\n` +
      `Hello *${customer.name}*,\n` +
      `Your daily milk subscription statement for *June 2026* has been generated.\n\n` +
      `🥛 *Milk Consumed:* ${parseFloat(bill.milk_qty_cow) + parseFloat(bill.milk_qty_buffalo)} Litres\n` +
      `💰 *Grand Total Amount:* ₹${amountDue}\n` +
      `📊 *Invoice PDF:* ${invoicePdfUrl}\n\n` +
      `Please pay before the due date using this secure payment link:\n` +
      `🔗 *Razorpay Payment Link:* ${paymentLink}\n\n` +
      `Thank you for choosing Doodh Hisaab! Have a healthy day!`;

    console.log(`Sending WhatsApp message to: +91${recipientMobile}`);
    console.log(`Message: ${messageBody}`);

    // If real Twilio credentials exist, execute HTTP request
    let twilioStatus = 'sent';
    if (TWILIO_ACCOUNT_SID !== 'mock_sid') {
      const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', `whatsapp:+91${recipientMobile}`);
      params.append('From', TWILIO_WHATSAPP_NUMBER);
      params.append('Body', messageBody);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Twilio Send Error:', errorData);
        twilioStatus = 'failed';
      }
    }

    // Update monthly_bills status
    await supabase
      .from('monthly_bills')
      .update({
        whatsapp_status: twilioStatus === 'sent' ? 'sent' : 'failed',
        whatsapp_sent_at: new Date().toISOString()
      })
      .eq('id', billId);

    // Record delivery tracking/notification log
    await supabase
      .from('notifications')
      .insert({
        user_id: customer.id,
        title: 'Invoice Sent on WhatsApp',
        message: `Your monthly invoice has been sent to +91${recipientMobile} via WhatsApp.`,
        type: 'bill'
      });

    return new Response(
      JSON.stringify({ 
        message: 'WhatsApp invoice dispatch complete', 
        status: twilioStatus,
        details: `Sent to +91${recipientMobile}`
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
