import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const userId = user.id;
    const body = await req.json();
    const { customer_id } = body;

    if (!customer_id) {
      return new Response(JSON.stringify({ error: "customer_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: customer } = await adminClient
      .from("customers")
      .select("business_id")
      .eq("id", customer_id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business and access token
    const { data: business } = await adminClient
      .from("businesses")
      .select("id, gocardless_access_token")
      .eq("id", customer.business_id)
      .single();

    let gocardlessId = `MD_${Date.now()}`;
    let approvalUrl = "https://pay.gocardless.com/obp/mock-redirect";

    if (business.gocardless_access_token) {
      // Call GoCardless API to create mandate
      // For demo, mock the call
      // In production, create customer bank account first, then mandate
      const mandateResponse = await fetch(`${Deno.env.get("GOCARDLESS_API_URL")}/mandates`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${business.gocardless_access_token}`,
          "Content-Type": "application/json",
          "GoCardless-Version": "2015-07-06",
        },
        body: JSON.stringify({
          mandates: {
            scheme: "sepa_core",
            // creditor: "CR123", // Need to set up creditor
            // customer_bank_account: customerBankAccountId,
            // For demo, mock
          },
        }),
      });

      if (mandateResponse.ok) {
        const mandateData = await mandateResponse.json();
        gocardlessId = mandateData.mandates.id;
        // approvalUrl = mandateData.mandates.links?.customer_approval?.href || approvalUrl;
      } else {
        console.error("GoCardless mandate creation failed, using mock");
      }
    }

    // Create mandate record
    const { data: mandate, error } = await adminClient.from("mandates").insert({
      customer_id,
      business_id: customer.business_id,
      status: "pending",
      gocardless_id: gocardlessId,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      mandate,
      approval_url: approvalUrl
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mandate creation error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
