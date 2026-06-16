# API & Database Documentation

This document describes the API interface, Supabase database bindings, Edge Functions payloads, and WhatsApp / Razorpay integration setups for **Doodh Hisaab**.

---

## 1. Database PostgREST Endpoints

Since Doodh Hisaab uses **Supabase**, frontends (React Native mobile client and React Admin portal) query the PostgreSQL tables directly via the Supabase Client SDK using standard PostgREST endpoints.

### Customer Profiles
* **Endpoint**: `/rest/v1/customer_profiles`
* **Methods**: `GET`, `PATCH`, `POST`
* **Row Level Security (RLS)**: Users can read/write their own profile (`auth.uid() = id`). Admins have full CRUD read/write access.

### Subscriptions
* **Endpoint**: `/rest/v1/subscriptions`
* **Methods**: `GET`, `POST`, `PATCH`
* **Filter Options**: `status=eq.active`, `customer_id=eq.{id}`

### Daily Milk Entries
* **Endpoint**: `/rest/v1/daily_milk_entries`
* **Methods**: `GET` (Customers, Admins, Drivers), `POST`/`PATCH` (Admins, Drivers only)

---

## 2. Serverless Edge Functions

Edge Functions run on Deno serverless instances and execute logic requiring private credentials (Twilio tokens, Razorpay private keys).

### A. Send WhatsApp Invoice (`/functions/v1/send-whatsapp-bill`)
Triggered by the Admin panel when clicking "Send Bill" to dispatch monthly statements.

* **Method**: `POST`
* **Headers**:
  * `Authorization: Bearer <service_role_key>`
  * `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "billId": "bill_customer1_5_2026"
  }
  ```
* **Response**:
  ```json
  {
    "message": "WhatsApp invoice dispatch complete",
    "status": "sent",
    "details": "Sent to +919876543210"
  }
  ```

### B. Generate PDF Invoice (`/functions/v1/generate-invoice-pdf`)
Generates html-to-pdf statements and uploads them to the Supabase Storage public bucket.

* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "billId": "bill_customer1_5_2026"
  }
  ```
* **Response**:
  ```json
  {
    "message": "Invoice PDF generated successfully",
    "pdfUrl": "https://supabase.co/storage/v1/object/public/invoices/bill_5_2026_id.html"
  }
  ```

### C. Razorpay Webhook Listener (`/functions/v1/razorpay-webhook`)
Listener registered in the Razorpay Dashboard to capture checkout success events.

* **Method**: `POST`
* **Headers**:
  * `x-razorpay-signature`: `<webhook_signature_header>`
* **Request Body**:
  ```json
  {
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_Hksa891la",
          "amount": 422000,
          "method": "card",
          "notes": {
            "customer_id": "cust1",
            "bill_id": "bill1"
          }
        }
      }
    }
  }
  ```
* **Response**:
  ```json
  {
    "received": true
  }
  ```

---

## 3. Webhooks & WhatsApp Message Template

Twilio / WhatsApp Business API payload sends text formatted as:

```text
*DOODH HISAAB DAIRY INVOICE* 🥛

Hello *{customer_name}*,
Your daily milk subscription statement for *June 2026* has been generated.

🥛 *Milk Consumed:* {total_qty} Litres
💰 *Grand Total Amount:* ₹{amount_due}
📊 *Invoice PDF:* {pdf_url}

Please pay before the due date using this secure payment link:
🔗 *Razorpay Payment Link:* {payment_link}

Thank you for choosing Doodh Hisaab! Have a healthy day!
```
