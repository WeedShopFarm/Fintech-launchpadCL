-- Align DB with edge functions and enable US ACH (routing + account) on customers.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS gocardless_id TEXT,
  ADD COLUMN IF NOT EXISTS us_account_number TEXT,
  ADD COLUMN IF NOT EXISTS us_routing_number TEXT;
