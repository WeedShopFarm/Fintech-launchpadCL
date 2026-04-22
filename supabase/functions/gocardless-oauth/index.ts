import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gcApiBase, gcOauthCreds } from "../_shared/gocardless.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Authorization code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: business, error: businessError } = await adminClient
      .from("businesses")
      .select("id, mode")
      .eq("owner_id", user.id)
      .single();

    if (businessError || !business) {
      return new Response(JSON.stringify({ error: "Business not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const creds = gcOauthCreds(business.mode);
    const tokenResponse = await fetch(`${gcApiBase(business.mode)}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: creds.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return new Response(JSON.stringify({ error: "Failed to exchange authorization code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tokenData = await tokenResponse.json();

    // Store token in Vault via SECURITY DEFINER function
    const { error: rpcErr } = await adminClient.rpc("set_gocardless_token", {
      _business_id: business.id,
      _token: tokenData.access_token,
    });

    if (rpcErr) {
      console.error("Failed to store access token in Vault:", rpcErr);
      return new Response(JSON.stringify({ error: "Failed to save access token" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: "GoCardless connected successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OAuth function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
