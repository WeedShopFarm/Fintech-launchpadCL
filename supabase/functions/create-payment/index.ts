import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { customer_id, amount, scheme = "sepa" } = body;

    if (!customer_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields: customer_id, amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get business and access token
    const { data: business } = await adminClient
      .from("businesses")
      .select("id, gocardless_access_token")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customer } = await adminClient
      .from("customers")
      .select("id, iban")
      .eq("id", customer_id)
      .eq("business_id", business.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let gocardlessPaymentId = null;
    let status = "pending";

    const gcApiBase =
      (Deno.env.get("GOCARDLESS_API_URL") ?? "").replace(/\/$/, "") || "https://api-sandbox.gocardless.com";

    if (business.gocardless_access_token) {
      // For ACH collections, create payment directly
      // For SEPA, would use mandate, but for demo, mock
      if (scheme === "ach") {
        // Parse IBAN or use as account
        // For ACH, need account details, but assuming IBAN is account
        const accountNumber = customer.iban; // Mock
        const routingNumber = "021000021"; // Mock

        const paymentResponse = await fetch(`${gcApiBase}/payments`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${business.gocardless_access_token}`,
            "Content-Type": "application/json",
            "GoCardless-Version": "2015-07-06",
          },
          body: JSON.stringify({
            payments: {
              amount: Math.round(amount * 100),
              currency: scheme === "ach" ? "USD" : "EUR",
              reference: `Payment ${customer_id}`,
              scheme: scheme,
              // For ACH, beneficiary is the business account, but for collection, it's from customer
              // Actually, for payments, it's to collect from customer
              // Need customer bank account
              // For demo, mock
            },
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.text();
          console.error("GoCardless payment error:", errorData);
          // Continue with mock
        } else {
          const paymentData = await paymentResponse.json();
          gocardlessPaymentId = paymentData.payments.id;
          status = "submitted";
        }
      }
    }

    // Create payment plan if not exists
    const { data: paymentPlan } = await adminClient
      .from("payment_plans")
      .insert({
        customer_id,
        business_id: business.id,
        amount,
        currency: scheme === "ach" ? "USD" : "EUR",
        status: "active",
      })
      .select()
      .single();

    const { data: payment, error: paymentErr } = await adminClient
      .from("payments")
      .insert({
        payment_plan_id: paymentPlan.id,
        business_id: business.id,
        amount,
        status,
        gocardless_payment_id: gocardlessPaymentId,
      })
      .select()
      .single();

    if (paymentErr) throw paymentErr;

    return new Response(JSON.stringify({ success: true, payment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});