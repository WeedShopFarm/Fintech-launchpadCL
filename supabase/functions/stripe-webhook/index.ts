import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secret || !whSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("stripe-webhook missing env");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(secret, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const externalId = event.id;

  const { data: dup } = await admin
    .from("webhook_events")
    .select("id")
    .eq("source", "stripe")
    .eq("external_id", externalId)
    .maybeSingle();

  if (dup) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: inserted, error: insErr } = await admin
    .from("webhook_events")
    .insert({
      source: "stripe",
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      external_id: externalId,
      processed: false,
    })
    .select("id")
    .single();

  if (insErr) {
    if (String(insErr.message ?? "").includes("duplicate") || (insErr as { code?: string }).code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("webhook_events insert:", insErr);
    return new Response(JSON.stringify({ error: "log failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const logId = inserted?.id;

  try {
    switch (event.type) {
      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;
        const cid = si.metadata?.supabase_customer_id;
        const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
        const sc = typeof si.customer === "string" ? si.customer : si.customer?.id;
        if (cid && pm) {
          await admin.from("customers").update({
            stripe_us_bank_payment_method_id: pm,
            ...(sc ? { stripe_customer_id: sc } : {}),
          }).eq("id", cid);
        }
        break;
      }
      case "setup_intent.setup_failed": {
        const si = event.data.object as Stripe.SetupIntent;
        const cid = si.metadata?.supabase_customer_id;
        if (cid) {
          console.warn("SetupIntent failed for customer", cid, si.last_setup_error?.message);
        }
        break;
      }
      case "payment_intent.succeeded":
      case "payment_intent.processing": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const payId = pi.metadata?.supabase_payment_id;
        if (payId) {
          await admin.from("payments").update({
            status: event.type === "payment_intent.succeeded" ? "confirmed" : "processing",
          }).eq("id", payId);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const payId = pi.metadata?.supabase_payment_id;
        if (payId) {
          await admin.from("payments").update({ status: "failed" }).eq("id", payId);
        }
        break;
      }
      default:
        break;
    }

    if (logId) {
      await admin.from("webhook_events").update({ processed: true }).eq("id", logId);
    }
  } catch (e) {
    console.error("stripe-webhook handler error:", e);
    return new Response(JSON.stringify({ received: true, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
