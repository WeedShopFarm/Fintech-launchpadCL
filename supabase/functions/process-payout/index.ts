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
    const { amount, method, destination } = body;

    if (!amount || !method || !destination) {
      return new Response(JSON.stringify({ error: "Missing required fields: amount, method, destination" }), {
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

    const { data: wallet } = await adminClient
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!wallet || wallet.available_balance < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("wallets")
      .update({ available_balance: wallet.available_balance - amount })
      .eq("id", wallet.id);

    let gocardlessPayoutId = null;
    let status = "processing";

    if (method === "ach") {
      if (!business.gocardless_access_token) {
        return new Response(JSON.stringify({ error: "GoCardless access token not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse destination for ACH: account_number|routing_number|name
      const parts = destination.split("|");
      if (parts.length < 3) {
        return new Response(JSON.stringify({ error: "Invalid ACH destination format. Use: account_number|routing_number|beneficiary_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [accountNumber, routingNumber, beneficiaryName] = parts;

      const payoutResponse = await fetch(`${Deno.env.get("GOCARDLESS_API_URL")}/payouts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${business.gocardless_access_token}`,
          "Content-Type": "application/json",
          "GoCardless-Version": "2015-07-06",
        },
        body: JSON.stringify({
          payouts: {
            amount: Math.round(amount * 100), // Convert to cents
            currency: "USD",
            reference: `Payout ${payout.id}`,
            beneficiary: {
              name: beneficiaryName,
              account_number: accountNumber,
              routing_number: routingNumber,
            },
          },
        }),
      });

      if (!payoutResponse.ok) {
        const errorData = await payoutResponse.text();
        console.error("GoCardless payout error:", errorData);
        return new Response(JSON.stringify({ error: "Failed to create ACH payout" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payoutData = await payoutResponse.json();
      gocardlessPayoutId = payoutData.payouts.id;
      status = "submitted";
    }

    const { data: payout, error: payoutErr } = await adminClient
      .from("payouts")
      .insert({
        user_id: userId,
        amount,
        method,
        destination,
        status,
        gocardless_id: gocardlessPayoutId,
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    await adminClient.from("ledger_entries").insert({
      wallet_id: wallet.id,
      type: "debit",
      amount,
      status: "confirmed",
      source: method === "crypto" ? "crypto" : method === "iban" ? "iban_payout" : method === "ach" ? "ach_payout" : "stripe",
      reference_id: payout.id,
      description: `${method.toUpperCase()} payout to ${destination.split("|")[2] || destination.slice(0, 20)}...`,
    });

    return new Response(JSON.stringify({ success: true, payout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payout error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
