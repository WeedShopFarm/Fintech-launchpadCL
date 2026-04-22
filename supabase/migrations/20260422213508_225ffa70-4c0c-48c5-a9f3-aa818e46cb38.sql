DROP VIEW IF EXISTS public.webhook_health;

CREATE OR REPLACE FUNCTION public.get_webhook_health()
RETURNS TABLE (
  source text,
  events_24h bigint,
  processed_24h bigint,
  pending_24h bigint,
  last_event_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    source,
    count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS events_24h,
    count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND processed = true) AS processed_24h,
    count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND processed = false) AS pending_24h,
    max(created_at) AS last_event_at
  FROM public.webhook_events
  GROUP BY source;
$$;

GRANT EXECUTE ON FUNCTION public.get_webhook_health() TO authenticated;