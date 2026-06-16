# Production Deployment Guide

This guide outlines step-by-step deployment steps to ship the **Doodh Hisaab** Dairy Management Platform to production.

---

## Step 1: Database Setup (Supabase)

1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** tab.
3. Copy the contents of the schema file: [schema.sql](file:///d:/projects/doodh-hisaab/supabase/schema.sql) and paste it into the query editor, then click **Run**.
4. To populate the environment with mock values for staging or pre-launch checks, run the seed file: [seed.sql](file:///d:/projects/doodh-hisaab/supabase/seed.sql).
5. Ensure **Storage** is configured:
   * Create a new public bucket called `invoices` for PDF invoices.
   * Create a new public bucket called `cattle` for animal listings photos.
   * Create a new public bucket called `gallery` for farm gallery photos.

---

## Step 2: Serverless Edge Functions Deployment

1. Install the Supabase CLI locally:
   ```bash
   npm install -g supabase
   ```
2. Login to your account:
   ```bash
   supabase login
   ```
3. Initialize Supabase in your project:
   ```bash
   supabase init
   ```
4. Link your project:
   ```bash
   supabase link --project-ref <your-project-id>
   ```
5. Set environment variables on your Supabase production workspace:
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID="your_twilio_sid"
   supabase secrets set TWILIO_AUTH_TOKEN="your_twilio_auth_token"
   supabase secrets set TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
   supabase secrets set RAZORPAY_KEY_ID="your_razorpay_key_id"
   supabase secrets set RAZORPAY_KEY_SECRET="your_razorpay_secret"
   ```
6. Deploy the functions:
   ```bash
   supabase functions deploy generate-invoice-pdf
   supabase functions deploy send-whatsapp-bill
   supabase functions deploy razorpay-webhook
   ```

---

## Step 3: Admin Portal Deployment (Vercel)

1. Place your Admin web code on GitHub.
2. Link your repository in [Vercel](https://vercel.com).
3. Set environment variables:
   * `VITE_SUPABASE_URL` = Your production Supabase project URL.
   * `VITE_SUPABASE_ANON_KEY` = Your production anonymous API key.
4. Click **Deploy**. Vercel will build the Vite React build and host it.

---

## Step 4: React Native Mobile App Build (Expo EAS)

1. Navigate to the mobile app directory:
   ```bash
   cd mobile-app
   ```
2. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
3. Login to your Expo account:
   ```bash
   eas login
   ```
4. Initialize the build settings:
   ```bash
   eas build:configure
   ```
5. Build for Android (generates production APK/AAB):
   ```bash
   eas build --platform android --profile production
   ```
6. Build for iOS (generates production IPA):
   ```bash
   eas build --platform ios --profile production
   ```
