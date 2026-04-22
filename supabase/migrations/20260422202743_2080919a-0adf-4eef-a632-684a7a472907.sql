ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_us_bank_payment_method_id text,
  ADD COLUMN IF NOT EXISTS us_routing_number text,
  ADD COLUMN IF NOT EXISTS us_account_number text;