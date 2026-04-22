

## Production Readiness Assessment — Not Yet Production Ready

The app is feature-complete and structurally sound, but **3 blocking issues** prevent a safe production launch. Here is the current status and the work required to ship.

### Status snapshot

| Area | Status |
|---|---|
| Auth (email/password, signup, protected routes) | Ready |
| Database schema + RLS on all tables | Ready |
| Stripe webhook signature verification | Ready (HMAC verified) |
| Stripe ACH + SEPA edge functions | Ready |
| GoCardless OAuth + edge functions | Ready (sandbox) |
| **GoCardless webhook signature verification** | **Missing — blocker** |
| **Payments table client-writable (fraud risk)** | **Blocker** |
| **Sandbox keys in use for GoCardless + Stripe** | **Blocker for live money** |
| Leaked password protection | Disabled (warning) |
| GoCardless token in plain DB column | Acknowledged risk, mitigated client-side |

### Blockers to fix before production

**1. GoCardless webhook has no signature verification**
`supabase/functions/gocardless-webhook/index.ts` accepts any POST and writes status updates to `mandates` and `payments`. Anyone who knows the URL can mark a payment as `confirmed`.
Fix: verify the `Webhook-Signature` header against `GOCARDLESS_WEBHOOK_SECRET` using HMAC-SHA256 over the raw body before processing events.

**2. `payments` table is fully writable by business owners**
RLS policy `Business owners can manage payments` grants INSERT/UPDATE/DELETE. An owner can self-insert `status='confirmed'` rows and (if wallet crediting is later wired to payment status) inflate balances.
Fix: drop the ALL policy, replace with SELECT-only for owners. All writes go through edge functions (service role) triggered by verified webhooks. Same hardening recommended for `mandates`.

**3. Switch from sandbox to live credentials**
`.env` and runtime secrets currently point to `api-sandbox.gocardless.com` and Stripe test keys. No real funds will move until production keys are swapped in and the GoCardless OAuth app is approved for live mode.

### Recommended (non-blocking) hardening

- **Enable Leaked Password Protection** in Cloud → Users → Auth Settings (HIBP check on signup/password change).
- **Move `gocardless_access_token`** out of the `businesses` table into Supabase Vault or per-business edge function secret. Currently mitigated by client queries explicitly selecting only safe columns, but the column is still readable via any `select('*')` regression.
- **Add DB constraints**: `amount > 0`, `status` enum, `unique(gocardless_payment_id)`, `unique(stripe_payment_intent_id)` — prevents duplicate/fabricated payment rows.
- **Idempotency on GoCardless webhook**: current dedupe uses `webhook_events` lookup but writes status updates before marking processed — wrap in a transaction or move the dedupe insert to be the first write with a unique index on `(source, external_id)`.
- **Rate limiting / abuse protection** on payment creation edge functions.
- **Monitoring**: add `edge_function_logs` review and an alerting path for webhook failures.

### Implementation plan (when approved)

1. **Add HMAC verification to `gocardless-webhook`** — read `Webhook-Signature` header, compute HMAC-SHA256 of raw body with `GOCARDLESS_WEBHOOK_SECRET`, constant-time compare, reject on mismatch.
2. **Migration: tighten payments + mandates RLS**
   ```sql
   DROP POLICY "Business owners can manage payments" ON public.payments;
   CREATE POLICY "Owners can view payments" ON public.payments
     FOR SELECT TO authenticated USING (EXISTS (
       SELECT 1 FROM businesses b WHERE b.id = payments.business_id AND b.owner_id = auth.uid()));
   -- same pattern for mandates; INSERT/UPDATE/DELETE only via service role
   ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
   CREATE UNIQUE INDEX IF NOT EXISTS payments_gc_id_uniq ON public.payments(gocardless_payment_id) WHERE gocardless_payment_id IS NOT NULL;
   ```
3. **Verify edge functions still work** — `create-payment`, `create-mandate` use service-role and continue functioning; client UI still reads via SELECT.
4. **Enable HIBP** via auth config tool.
5. **Document a "Go Live" checklist** in README: rotate to production GoCardless OAuth app, swap Stripe keys, update webhook URLs in both provider dashboards, smoke-test with €1 transaction.

### Out of scope for this pass

- Migrating `gocardless_access_token` to Vault (larger refactor — flagged for follow-up).
- Building a Go Live toggle UI.
- Production GoCardless app approval (external, user must do).

