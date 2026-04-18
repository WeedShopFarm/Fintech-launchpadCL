import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, email, iban, us_account_number, us_routing_number, use_stripe_us_bank } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "name and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ibanClean = typeof iban === "string" ? iban.replace(/\s/g, "") : "";
    const usAcct = typeof us_account_number === "string" ? us_account_number.replace(/\s/g, "") : "";
    const usRoute = typeof us_routing_number === "string" ? us_routing_number.replace(/\s/g, "") : "";

    const hasSepa = ibanClean.length > 0;
    const hasUsAch = usAcct.length > 0 && usRoute.length > 0;
    const stripeUsOnly = use_stripe_us_bank === true;
    if (!hasSepa && !hasUsAch && !stripeUsOnly) {
      return new Response(JSON.stringify({
        error: "Provide an IBAN (SEPA), US routing + account (GoCardless ACH), or choose Stripe US bank linking.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (hasUsAch && !/^\d{9}$/.test(usRoute)) {
      return new Response(JSON.stringify({ error: "US routing number must be exactly 9 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: business } = await adminClient
      .from("businesses")
      .select("id, gocardless_access_token")
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found. Please complete your account setup first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let gocardlessCustomerId = null;

    if (business.gocardless_access_token) {
      try {
        const gcApiUrl = Deno.env.get("GOCARDLESS_API_URL") || "https://api-sandbox.gocardless.com";
        const customerResponse = await fetch(`${gcApiUrl}/customers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${business.gocardless_access_token}`,
            "Content-Type": "application/json",
            "GoCardless-Version": "2015-07-06",
          },
          body: JSON.stringify({
            customers: {
              email,
              given_name: name.split(' ')[0],
              family_name: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
            },
          }),
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          gocardlessCustomerId = customerData.customers.id;
        } else {
          const errText = await customerResponse.text();
          console.warn("GoCardless customer creation failed:", errText);
        }
      } catch (gcError) {
        console.warn("GoCardless customer creation failed:", gcError);
      }
    }

    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .insert({
        business_id: business.id,
        name,
        email,
        iban: ibanClean || "",
        us_account_number: hasUsAch ? usAcct : null,
        us_routing_number: hasUsAch ? usRoute : null,
        gocardless_id: gocardlessCustomerId,
      })
      .select()
      .single();

    if (customerError) {
      console.error("DB insert error:", customerError);
      return new Response(JSON.stringify({ error: customerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, customer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
