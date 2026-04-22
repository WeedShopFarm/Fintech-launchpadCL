---
name: production-hardening
description: Live/sandbox mode flow, Vault-backed GoCardless tokens, idempotent webhooks, ledger UI, webhook health monitoring
type: feature
---
# Production hardening (Apr 2026)

## Live/Sandbox mode
- Per-business `mode` column on `businesses` (sandbox|live, default sandbox)
- `/settings` page toggles mode; edge functions use `gcApiBase(mode)` and `gcOauthCreds(mode)` from `supabase/functions/_shared/gocardless.ts`
- Live mode reads `GOCARDLESS_LIVE_*` secrets (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, API_URL); falls back to sandbox secrets if not set

## Token storage (Vault)
- Tokens stored in `vault.secrets`, referenced by `businesses.gocardless_token_secret_id`
- Plaintext `gocardless_access_token` column kept for migration fallback only — `get_gocardless_token` RPC reads vault first, falls back to column
- Write via `set_gocardless_token(_business_id, _token)` SECURITY DEFINER RPC (gocardless-oauth uses this)
- Read via `get_gocardless_token(_business_id)` RPC (create-payment, create-mandate, process-payout use `getGoCardlessToken()` helper)
- Both RPCs revoked from anon/authenticated; only callable by service role

## Idempotent webhooks
- Unique index `webhook_events(source, external_id)` from prior migration
- Both `stripe-webhook` and `gocardless-webhook` insert FIRST, treat 23505 (duplicate key) as silent no-op
- Eliminates check-then-insert race window

## Ledger UI (/ledger)
- Unified rows from `payments`, `payouts`, `ledger_entries`
- Filters: type (payment/payout/ledger), status, free-text search
- CSV export

## Webhook Health
- `get_webhook_health()` SECURITY DEFINER RPC returns 24h aggregate per source
- `useWebhookHealth()` hook polls every 30s
- Card on Dashboard shows events/processed/pending counts and rate
