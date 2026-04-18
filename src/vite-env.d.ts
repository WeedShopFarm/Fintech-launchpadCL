/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Stripe.js publishable key (pk_test_… / pk_live_…) for Financial Connections + ACH in the browser */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_GOCARDLESS_CLIENT_ID?: string;
  readonly VITE_GOCARDLESS_REDIRECT_URI?: string;
  /** `sandbox` (default) uses connect-sandbox + api-sandbox; `live` uses connect + api.gocardless.com */
  readonly VITE_GOCARDLESS_ENV?: "sandbox" | "live";
  /** Optional override for OAuth authorize page origin (no trailing slash) */
  readonly VITE_GOCARDLESS_OAUTH_BASE?: string;
}
