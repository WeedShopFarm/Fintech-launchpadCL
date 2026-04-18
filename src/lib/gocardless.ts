/**
 * GoCardless hostnames — aligned with official docs:
 * Sandbox: api-sandbox.gocardless.com, connect-sandbox.gocardless.com
 * Live: api.gocardless.com, connect.gocardless.com
 * @see https://developer.gocardless.com/getting-started/set-up
 */
export const GOCARDLESS_DEFAULTS = {
  oauthSandbox: "https://connect-sandbox.gocardless.com",
  oauthLive: "https://connect.gocardless.com",
  apiSandbox: "https://api-sandbox.gocardless.com",
  apiLive: "https://api.gocardless.com",
} as const;

/** OAuth authorize page base (no trailing slash). */
export function getGoCardlessOAuthBase(): string {
  const explicit = import.meta.env.VITE_GOCARDLESS_OAUTH_BASE as string | undefined;
  if (explicit?.trim()) return explicit.replace(/\/$/, "");
  const env = import.meta.env.VITE_GOCARDLESS_ENV as string | undefined;
  if (env === "live") return GOCARDLESS_DEFAULTS.oauthLive;
  return GOCARDLESS_DEFAULTS.oauthSandbox;
}

export function buildGoCardlessAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  responseType?: string;
}): string {
  const { clientId, redirectUri, scope = "read_write", responseType = "code" } = params;
  const base = getGoCardlessOAuthBase();
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    response_type: responseType,
  });
  return `${base}/oauth/authorize?${q.toString()}`;
}
