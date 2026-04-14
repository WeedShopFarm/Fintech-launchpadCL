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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { events } = body;

    for (const event of events ?? [body]) {
      const eventType = event.action ?? event.event_type ?? "unknown";
      const resourceType = event.resource_type ?? "unknown";

      await supabase.from("webhook_events").insert({
        source: "gocardless",
        event_type: `${resourceType}.${eventType}`,
        payload: event,
      });

      if (resourceType === "mandates") {
        if (eventType === "created" || eventType === "activated") {
          const mandateId = event.links?.mandate;
          if (mandateId) {
            const newStatus = eventType === "activated" ? "active" : "pending";
            await supabase
              .from("mandates")
              .update({ status: newStatus })
              .eq("gocardless_id", mandateId);
          }
        } else if (eventType === "cancelled" || eventType === "expired") {
          const mandateId = event.links?.mandate;
          if (mandateId) {
            await supabase
              .from("mandates")
              .update({ status: eventType })
              .eq("gocardless_id", mandateId);
          }
        }
      }

      if (resourceType === "payments") {
        const paymentGcId = event.links?.payment;
        if (eventType === "confirmed" && paymentGcId) {
          await supabase
            .from("payments")
            .update({ status: "confirmed" })
            .eq("gocardless_payment_id", paymentGcId);
        }

        if (eventType === "failed" && paymentGcId) {
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("gocardless_payment_id", paymentGcId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
