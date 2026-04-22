// Shared helpers for GoCardless edge functions

export function gcApiBase(mode: string | null | undefined): string {
  const explicit = (Deno.env.get("GOCARDLESS_API_URL") ?? "").replace(/\/$/, "");
  if (mode === "live") {
    return (Deno.env.get("GOCARDLESS_LIVE_API_URL") ?? "").replace(/\/$/, "")
      || "https://api.gocardless.com";
  }
  return explicit || "https://api-sandbox.gocardless.com";
}

export function gcOauthCreds(mode: string | null | undefined) {
  if (mode === "live") {
    return {
      clientId: Deno.env.get("GOCARDLESS_LIVE_CLIENT_ID") ?? Deno.env.get("GOCARDLESS_CLIENT_ID"),
      clientSecret: Deno.env.get("GOCARDLESS_LIVE_CLIENT_SECRET") ?? Deno.env.get("GOCARDLESS_CLIENT_SECRET"),
      redirectUri: Deno.env.get("GOCARDLESS_LIVE_REDIRECT_URI") ?? Deno.env.get("GOCARDLESS_REDIRECT_URI"),
    };
  }
  return {
    clientId: Deno.env.get("GOCARDLESS_CLIENT_ID"),
    clientSecret: Deno.env.get("GOCARDLESS_CLIENT_SECRET"),
    redirectUri: Deno.env.get("GOCARDLESS_REDIRECT_URI"),
  };
}

export async function getGoCardlessToken(adminClient: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }, businessId: string): Promise<string | null> {
  const { data, error } = await adminClient.rpc("get_gocardless_token", { _business_id: businessId });
  if (error) {
    console.error("get_gocardless_token rpc error:", error);
    return null;
  }
  return (data as string) ?? null;
}
