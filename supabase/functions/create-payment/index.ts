import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { gcApiBase, getGoCardlessToken } from "../_shared/gocardless.ts";

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

    const userId = user.id;
    const body = await req.json();
    const { customer_id, amount, scheme = "sepa", mandate_id } = body;

    if (!customer_id || amount == null || Number.isNaN(Number(amount))) {
      return new Response(JSON.stringify({ error: "Missing required fields: customer_id, amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: business } = await adminClient
      .from("businesses")
      .select("id, mode")
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
      .select("id, iban, stripe_customer_id, stripe_us_bank_payment_method_id")
      .eq("id", customer_id)
      .eq("business_id", business.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currency = scheme === "ach" || scheme === "ach_stripe" ? "USD" : "EUR";
    let gocardlessPaymentId: string | null = null;
    let status = "pending";
    let linkedMandateId: string | null = null;

    const apiBase = gcApiBase(business.mode);

    if (scheme === "ach_stripe") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured for Stripe ACH" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!customer.stripe_customer_id || !customer.stripe_us_bank_payment_method_id) {
        return new Response(JSON.stringify({
          error: "Customer must complete Stripe US bank linking (Financial Connections) before ACH Stripe payments.",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: paymentPlan, error: planErr } = await adminClient
        .from("payment_plans")
        .insert({
          customer_id,
          business_id: business.id,
          amount,
          currency,
          status: "active",
          mandate_id: null,
        })
        .select()
        .single();

      if (planErr || !paymentPlan) {
        console.error("payment_plans insert error:", planErr);
        return new Response(JSON.stringify({ error: planErr?.message ?? "Failed to create payment plan" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: payment, error: paymentErr } = await adminClient
        .from("payments")
        .insert({
          plan_id: paymentPlan.id,
          business_id: business.id,
          amount,
          currency,
          status: "pending",
          gocardless_payment_id: null,
        })
        .select()
        .single();

      if (paymentErr || !payment) throw paymentErr ?? new Error("payment insert failed");

      const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
      });

      const pi = await stripe.paymentIntents.create({
        amount: Math.round(Number(amount) * 100),
        currency: "usd",
        customer: customer.stripe_customer_id,
        payment_method: customer.stripe_us_bank_payment_method_id,
        payment_method_types: ["us_bank_account"],
        metadata: { supabase_payment_id: payment.id, customer_id: customer_id },
        confirm: false,
      });

      const piStatus = pi.status === "requires_payment_method" ? "pending" : (pi.status ?? "pending");

      await adminClient
        .from("payments")
        .update({
          stripe_payment_intent_id: pi.id,
          status: piStatus,
        })
        .eq("id", payment.id);

      const merged = { ...payment, status: piStatus, stripe_payment_intent_id: pi.id };

      return new Response(JSON.stringify({
        success: true,
        payment: merged,
        stripe_client_secret: pi.client_secret,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (scheme === "ach") {
      if (!mandate_id) {
        return new Response(JSON.stringify({ error: "mandate_id is required for ACH (USD) payments" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: mandate, error: mandateErr } = await adminClient
        .from("mandates")
        .select("id, gocardless_id, customer_id, business_id, status")
        .eq("id", mandate_id)
        .single();

      if (mandateErr || !mandate) {
        return new Response(JSON.stringify({ error: "Mandate not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (mandate.business_id !== business.id || mandate.customer_id !== customer_id) {
        return new Response(JSON.stringify({ error: "Mandate does not belong to this customer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!mandate.gocardless_id) {
        return new Response(JSON.stringify({
          error: "This mandate is not linked to GoCardless yet. Create the mandate while connected to GoCardless and complete customer approval.",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      linkedMandateId = mandate.id;

      const gcToken = await getGoCardlessToken(adminClient, business.id);
      if (gcToken) {
        const reference = `ach-${mandate.id.replace(/-/g, "").slice(0, 12)}`;
        const paymentResponse = await fetch(`${apiBase}/payments`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${gcToken}`,
            "Content-Type": "application/json",
            "GoCardless-Version": "2015-07-06",
          },
          body: JSON.stringify({
            payments: {
              amount: Math.round(Number(amount) * 100),
              currency: "USD",
              reference: reference.slice(0, 18),
              links: { mandate: mandate.gocardless_id },
            },
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.text();
          console.error("GoCardless ACH payment error:", errorData);
          return new Response(JSON.stringify({
            error: "GoCardless rejected the payment request",
            details: errorData.slice(0, 500),
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const paymentData = await paymentResponse.json();
        gocardlessPaymentId = paymentData.payments.id;
        status = paymentData.payments.status ?? "submitted";
      } else {
        return new Response(JSON.stringify({
          error: "Business is not connected to GoCardless (missing access token). Connect GoCardless before collecting ACH.",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: paymentPlan, error: planErr } = await adminClient
      .from("payment_plans")
      .insert({
        customer_id,
        business_id: business.id,
        amount,
        currency,
        status: "active",
        mandate_id: linkedMandateId,
      })
      .select()
      .single();

    if (planErr || !paymentPlan) {
      console.error("payment_plans insert error:", planErr);
      return new Response(JSON.stringify({ error: planErr?.message ?? "Failed to create payment plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentErr } = await adminClient
      .from("payments")
      .insert({
        plan_id: paymentPlan.id,
        business_id: business.id,
        amount,
        currency,
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
