-- Stripe US bank (Financial Connections) linkage + webhook idempotency + revoke leaked sandbox token
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_us_bank_payment_method_id TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_source_external_id_key
  ON public.webhook_events (source, external_id)
  WHERE external_id IS NOT NULL;

-- Remove sandbox token that was committed in an earlier migration (rotate keys in GoCardless dashboard if this was ever deployed).
UPDATE public.businesses
SET gocardless_access_token = NULL
WHERE gocardless_access_token = 'sandbox_gmDpWqCdix7foDRixM-tt18waksc6SGZAykQOwFn';
