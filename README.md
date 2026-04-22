# AutoCollect

Fintech app for SEPA + ACH direct debit collection (GoCardless) with Stripe FinancialConnections fallback and crypto/Wise payouts. Built on Lovable Cloud (Supabase).

## Architecture

- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno) + Postgres with RLS
- **Auth**: Supabase Auth (email/password)
- **Providers**: GoCardless (SEPA/ACH), Stripe (US ACH via Financial Connections)

## Security model

- All `payments` and `mandates` writes happen **only** via edge functions using the service role, triggered by verified provider webhooks.
- Client RLS is **SELECT-only** for business owners on these tables.
- Webhooks verify provider signatures (Stripe: `stripe-signature`; GoCardless: HMAC-SHA256 of raw body with `GOCARDLESS_WEBHOOK_SECRET`).
- Roles stored in `user_roles` table (never on profile).

## Go Live checklist

Before switching from sandbox to live money:

1. **GoCardless**
   - [ ] Submit production OAuth app for approval in GoCardless dashboard
   - [ ] Rotate `GOCARDLESS_CLIENT_ID`, `GOCARDLESS_CLIENT_SECRET`, `GOCARDLESS_ACCESS_TOKEN` to live values
   - [ ] Set `GOCARDLESS_API_URL=https://api.gocardless.com`
   - [ ] Update redirect URI in GoCardless dashboard to production domain
   - [ ] Configure live webhook endpoint pointing to `/functions/v1/gocardless-webhook` with `GOCARDLESS_WEBHOOK_SECRET`

2. **Stripe**
   - [ ] Rotate `STRIPE_SECRET_KEY` to live `sk_live_…`
   - [ ] Configure live webhook endpoint pointing to `/functions/v1/stripe-webhook`; rotate `STRIPE_WEBHOOK_SECRET`
   - [ ] Verify Financial Connections enabled on the live account

3. **Auth & DB**
   - [x] Leaked password protection (HIBP) enabled
   - [ ] Review RLS policies one more time in production project
   - [ ] Backups + PITR enabled in Cloud settings

4. **Smoke test**
   - [ ] Create a real customer, link bank, run a €1 / $1 transaction end-to-end
   - [ ] Confirm webhook updates status to `confirmed` and ledger entry posts

## Known follow-ups (non-blocking)

- Move `gocardless_access_token` from `businesses` table into Supabase Vault.
- Add per-IP rate limiting to payment-creation edge functions.
- Add monitoring/alerting on edge function failures.
