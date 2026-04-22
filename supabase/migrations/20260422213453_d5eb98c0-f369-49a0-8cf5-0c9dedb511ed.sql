-- 1. Live/Sandbox mode per business
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'sandbox'
  CHECK (mode IN ('sandbox', 'live'));

-- 2. Enable Vault extension for secure token storage
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 3. Add vault secret reference column (stores the secret id, not the token)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS gocardless_token_secret_id uuid;

-- 4. SECURITY DEFINER function to store/update a GoCardless token in Vault
CREATE OR REPLACE FUNCTION public.set_gocardless_token(_business_id uuid, _token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_existing uuid;
  v_secret_name text;
BEGIN
  SELECT gocardless_token_secret_id INTO v_existing
  FROM public.businesses WHERE id = _business_id;

  v_secret_name := 'gc_token_' || _business_id::text;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _token, v_secret_name, 'GoCardless access token');
    v_secret_id := v_existing;
  ELSE
    v_secret_id := vault.create_secret(_token, v_secret_name, 'GoCardless access token');
    UPDATE public.businesses
      SET gocardless_token_secret_id = v_secret_id,
          gocardless_access_token = NULL,
          updated_at = now()
      WHERE id = _business_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_gocardless_token(uuid, text) FROM public, anon, authenticated;

-- 5. SECURITY DEFINER function to read the token (edge functions only via service role)
CREATE OR REPLACE FUNCTION public.get_gocardless_token(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_token text;
BEGIN
  SELECT gocardless_token_secret_id INTO v_secret_id
  FROM public.businesses WHERE id = _business_id;

  IF v_secret_id IS NULL THEN
    -- Fall back to legacy plaintext column during migration window
    SELECT gocardless_access_token INTO v_token
    FROM public.businesses WHERE id = _business_id;
    RETURN v_token;
  END IF;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_gocardless_token(uuid) FROM public, anon, authenticated;

-- 6. Webhook health view (last 24h stats per source)
CREATE OR REPLACE VIEW public.webhook_health AS
SELECT
  source,
  count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS events_24h,
  count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND processed = true) AS processed_24h,
  count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND processed = false) AS pending_24h,
  max(created_at) AS last_event_at
FROM public.webhook_events
GROUP BY source;

-- Allow authenticated users to read aggregated health (no PII, just counts)
GRANT SELECT ON public.webhook_health TO authenticated;