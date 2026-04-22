-- Tighten payments RLS: SELECT only for owners, writes via service role only
DROP POLICY IF EXISTS "Business owners can manage payments" ON public.payments;

CREATE POLICY "Owners can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = payments.business_id AND b.owner_id = auth.uid()
));

-- Tighten mandates RLS: SELECT only for owners, writes via service role only
DROP POLICY IF EXISTS "Business owners can manage mandates" ON public.mandates;

CREATE POLICY "Owners can view mandates"
ON public.mandates
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = mandates.business_id AND b.owner_id = auth.uid()
));

-- Data integrity constraints
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS payments_gc_id_uniq
  ON public.payments(gocardless_payment_id)
  WHERE gocardless_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mandates_gc_id_uniq
  ON public.mandates(gocardless_id)
  WHERE gocardless_id IS NOT NULL;

-- Add external_id column to webhook_events if missing, plus uniqueness for idempotency
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_source_extid_uniq
  ON public.webhook_events(source, external_id)
  WHERE external_id IS NOT NULL;