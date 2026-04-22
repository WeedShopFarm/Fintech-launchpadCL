

## Fix Build Error + Complete Stripe ACH Schema + Remove Dead NestJS Code

### Problem

1. **Build error**: `src/pages/Payments.tsx:61` reads `cust.stripe_us_bank_payment_method_id`, but that column doesn't exist on `public.customers`. Generated Supabase types reflect only 6 columns: `id, business_id, name, email, iban, created_at`.
2. **Broken Stripe ACH flow**: Edge functions (`stripe-webhook`, `create-payment`) and `src/pages/Customers.tsx` already read/write `stripe_customer_id`, `stripe_us_bank_payment_method_id`, and `us_account_number` on customers — but these columns were never added to the table. Linking a US bank via Stripe Financial Connections silently no-ops.
3. **Dead code**: `fintech-backend/` and `fintech-backend-1/` are standalone NestJS projects, never imported by the React app, never deployed (Lovable runs Supabase Edge Functions). They confuse the file tree and inflate context.

### Plan

**1. Add missing columns to `public.customers` (migration)**

```sql
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_us_bank_payment_method_id text,
  ADD COLUMN IF NOT EXISTS us_routing_number text,
  ADD COLUMN IF NOT EXISTS us_account_number text;
```

- Nullable, no defaults — existing rows unaffected.
- Allows `iban` to remain required for SEPA, while ACH customers populate the new columns.
- After migration runs, generated `src/integrations/supabase/types.ts` auto-refreshes and the TS error on `Payments.tsx:61` resolves.

**2. Delete dead NestJS folders**

Remove entirely (no imports anywhere in `src/`, not deployed):
- `fintech-backend/` (full NestJS app, ~50 files)
- `fintech-backend-1/` (duplicate scaffold)

The real backend lives in `supabase/functions/*` and Postgres — unaffected.

**3. Verify**

- Run typecheck — `Payments.tsx` should compile.
- Confirm `Customers.tsx` "Link Stripe bank" flow still wires through (no code changes needed there; it was always writing to columns that now exist).

### Out of scope

- No changes to existing UI logic, edge functions, RLS policies, or other tables.
- No changes to GoCardless/SEPA flow.

