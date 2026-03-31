import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, email, iban } = body;

    if (!name || !email || !iban) {
      return new Response(JSON.stringify({ error: "name, email, and iban are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get business information
    const { data: business } = await adminClient
      .from("businesses")
      .select("id, gocardless_access_token")
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let gocardlessCustomerId = null;

    // If connected to GoCardless, create customer in GoCardless
    if (business.gocardless_access_token) {
      try {
        const customerResponse = await fetch(`${Deno.env.get("GOCARDLESS_API_URL")}/customers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${business.gocardless_access_token}`,
            "Content-Type": "application/json",
            "GoCardless-Version": "2015-07-06",
          },
          body: JSON.stringify({
            customers: {
              email: email,
              given_name: name.split(' ')[0],
              family_name: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
            },
          }),
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          gocardlessCustomerId = customerData.customers.id;
        } else {
          console.warn("Failed to create customer in GoCardless, continuing with local creation");
        }
      } catch (gcError) {
        console.warn("GoCardless customer creation failed:", gcError);
      }
    }

    // Create customer in our database
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .insert({
        business_id: business.id,
        name: name,
        email: email,
        iban: iban,
        gocardless_id: gocardlessCustomerId,
      })
      .select()
      .single();

    if (customerError) {
      return new Response(JSON.stringify({ error: customerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(customer), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create customer function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});