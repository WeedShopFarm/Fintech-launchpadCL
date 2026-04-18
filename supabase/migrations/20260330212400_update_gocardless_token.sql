-- Previously this migration wrote a sandbox token into the repository (removed).
-- Configure `gocardless_access_token` per environment via Supabase secrets or the dashboard — never in SQL.
SELECT 1;
