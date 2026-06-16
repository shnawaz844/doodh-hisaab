// Supabase Edge Function: generate-invoice-pdf
// Written for Deno environment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const { billId } = await req.json();
    if (!billId) {
      return new Response(JSON.stringify({ error: 'billId is required' }), { status: 400 });
    }

    // Fetch bill and customer details
    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, customer_profiles(*)')
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      return new Response(JSON.stringify({ error: 'Bill not found' }), { status: 404 });
    }

    const customer = bill.customer_profiles;

    // Simulate HTML to PDF creation
    const htmlInvoice = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 10px; }
            .title { font-size: 24px; color: #166534; font-weight: bold; }
            .details { margin: 20px 0; line-height: 1.6; }
            .details table { width: 100%; border-collapse: collapse; }
            .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .details th { background-color: #f2f2f2; }
            .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; text-align: right; border-radius: 8px; font-size: 18px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DOODH HISAAB DAIRY INVOICE</div>
            <p>Fresh & Pure Milk Delivered Daily</p>
          </div>
          
          <div class="details">
            <h3>Invoice For:</h3>
            <p><strong>Customer Name:</strong> ${customer.name}</p>
            <p><strong>Mobile:</strong> ${customer.mobile}</p>
            <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
            <p><strong>Billing Period:</strong> Month ${bill.month} / Year ${bill.year}</p>
          </div>

          <div class="details">
            <h3>Consumed Details:</h3>
            <table>
              <thead>
                <tr>
                  <th>Milk Type</th>
                  <th>Quantity (Litres)</th>
                  <th>Calculated Average Rate</th>
                </tr>
              </thead>
              <tbody>
                ${bill.milk_qty_cow > 0 ? `<tr><td>Cow Milk</td><td>${bill.milk_qty_cow} L</td><td>₹${customer.cow_rate}/L</td></tr>` : ''}
                ${bill.milk_qty_buffalo > 0 ? `<tr><td>Buffalo Milk</td><td>${bill.milk_qty_buffalo} L</td><td>₹${customer.buffalo_rate}/L</td></tr>` : ''}
              </tbody>
            </table>
          </div>

          <div class="details">
            <table>
              <tr><td>Milk Total</td><td>₹${bill.total_amount}</td></tr>
              <tr><td>Previous Due</td><td>₹${bill.previous_due}</td></tr>
              <tr><td>Extra Delivery/Service Charges</td><td>₹${bill.extra_charges}</td></tr>
              <tr><td>Discounts/Promo</td><td>-₹${bill.discount}</td></tr>
            </table>
          </div>

          <div class="total-box">
            Grand Total Due: ₹${bill.grand_total}
          </div>
        </body>
      </html>
    `;

    // In production, we'd use a serverless PDF generator library (like Puppeteer or pdf-lib).
    // Here we will simulate generating the PDF file, writing it to public Storage, and returning the link.
    const mockPdfContent = new TextEncoder().encode(htmlInvoice);
    const pdfPath = `invoices/bill_${bill.month}_${bill.year}_${billId}.html`; // Saving as html mock for visibility, in prod upload raw pdf

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(pdfPath, mockPdfContent, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(pdfPath);

    // Update monthly_bills with invoice link
    await supabase
      .from('monthly_bills')
      .update({ pdf_url: publicUrlData.publicUrl })
      .eq('id', billId);

    return new Response(
      JSON.stringify({ 
        message: 'Invoice PDF generated successfully', 
        pdfUrl: publicUrlData.publicUrl 
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
