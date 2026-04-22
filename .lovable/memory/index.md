# Memory: index.md
Updated: today

# Project Memory

## Core
Dark fintech theme. Primary green #22c55e (HSL 162 72% 46%), bg near-black. Inter + JetBrains Mono.
Lovable Cloud backend. GoCardless SEPA + Wise payouts. Crypto as recommended payout method.
App name: AutoCollect (Pilot-Autocollect repo).
GoCardless tokens stored in Supabase Vault — never read `gocardless_access_token` column directly; use `get_gocardless_token` RPC.
Per-business `mode` (sandbox|live) on `businesses`; edge functions branch via `_shared/gocardless.ts` helpers.

## Memories
- [App architecture](mem://features/architecture) — Pages, routes, edge functions, DB schema overview
- [Payout config](mem://features/payout-config) — GoCardless→Wise EUR IBAN (SEPA) + USD (ACH), crypto recommended
- [Production hardening](mem://features/production-hardening) — Vault tokens, live/sandbox mode, idempotent webhooks, ledger UI, webhook health
