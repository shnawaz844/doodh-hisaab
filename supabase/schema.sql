-- Reconstructed Database Schema for Doodh Hisaab
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  billing_type TEXT DEFAULT 'monthly' NOT NULL,
  cow_rate NUMERIC DEFAULT 60 NOT NULL,
  buffalo_rate NUMERIC DEFAULT 70 NOT NULL,
  balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  buffalo_tier TEXT DEFAULT 'standard',
  buffalo_premium_rate NUMERIC DEFAULT 80,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  address_line TEXT NOT NULL,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT,
  value TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.cms_pages (
  slug TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (slug)
);

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.milk_rates (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  effective_date DATE DEFAULT CURRENT_DATE NOT NULL,
  cow_rate NUMERIC NOT NULL,
  buffalo_rate NUMERIC NOT NULL,
  season_multiplier NUMERIC DEFAULT 1 NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.delivery_staff (
  id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  vehicle_no TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  milk_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  delivery_time TEXT DEFAULT 'morning' NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_milk_entries (
  id UUID DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  shift TEXT NOT NULL,
  milk_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  amount NUMERIC,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  shift TEXT NOT NULL,
  milk_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.monthly_bills (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  milk_qty_cow NUMERIC DEFAULT 0 NOT NULL,
  milk_qty_buffalo NUMERIC DEFAULT 0 NOT NULL,
  total_amount NUMERIC NOT NULL,
  previous_due NUMERIC DEFAULT 0 NOT NULL,
  extra_charges NUMERIC DEFAULT 0 NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  grand_total NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  pdf_url TEXT,
  whatsapp_status TEXT DEFAULT 'unsent' NOT NULL,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT DEFAULT 'paid' NOT NULL,
  method TEXT NOT NULL,
  razorpay_payment_id TEXT,
  note TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.animal_listings (
  id UUID DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  animal_type TEXT NOT NULL,
  breed TEXT NOT NULL,
  age_years NUMERIC NOT NULL,
  daily_milk_yield NUMERIC,
  price NUMERIC NOT NULL,
  description TEXT,
  contact_number TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.animal_images (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  listing_id UUID REFERENCES animal_listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  staff_id UUID REFERENCES delivery_staff(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  table_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_cash_sales (
  id UUID DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  milk_type TEXT DEFAULT 'cow',
  rate NUMERIC DEFAULT 60,
  liters NUMERIC DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  reply_message TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);


-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_milk_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
