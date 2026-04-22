import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-signature, webhooks-signature",
};

function mapMandateStatus(action: string | undefined): string | undefined {
  const a = (action ?? "").toLowerCase().replace(/-/g, "_");
  if (["active", "activated"].includes(a)) return "active";
  if (["cancelled", "canceled"].includes(a)) return "cancelled";
  if (a === "expired") return "expired";
  if (a === "failed") return "failed";
  if ([
    "created",
    "submitted",
    "pending_customer_approval",
    "pending_submission",
    "customer_approval_granted",
    "replaced",
    "consumed",
    "blocked",
  ].includes(a)) return "pending";
  return undefined;
}

function mapPaymentStatus(action: string | undefined): string | undefined {
  const a = (action ?? "").toLowerCase().replace(/-/g, "_");
  if (["confirmed", "paid_out", "chargeback_cancelled"].includes(a)) return "confirmed";
  if (["failed", "cancelled", "canceled", "customer_approval_denied", "charged_back"].includes(a)) return "failed";
  if (["pending_submission", "submitted", "pending_customer_approval"].includes(a)) return "pending";
  if (["processing"].includes(a)) return "processing";
  return undefined;
}

function mandateGcId(ev: Record<string, unknown>): string | undefined {
  const links = ev.links as Record<string, string> | undefined;
  if (links?.mandate) return links.mandate;
  const rid = typeof ev.resource_id === "string" ? ev.resource_id : undefined;
  if (ev.resource_type === "mandates" && rid?.startsWith("MD")) return rid;
  return undefined;
}

function paymentGcId(ev: Record<string, unknown>): string | undefined {
  const links = ev.links as Record<string, string> | undefined;
  if (links?.payment) return links.payment;
  const rid = typeof ev.resource_id === "string" ? ev.resource_id : undefined;
  if (ev.resource_type === "payments" && rid?.startsWith("PM")) return rid;
  return undefined;
}

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    // Verify GoCardless webhook signature (HMAC-SHA256 of raw body using webhook secret)
    const webhookSecret = Deno.env.get("GOCARDLESS_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Missing GOCARDLESS_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedSig =
      req.headers.get("Webhook-Signature") ||
      req.headers.get("webhook-signature") ||
      req.headers.get("Webhooks-Signature");

    if (!providedSig) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expectedSig = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    const a = new TextEncoder().encode(expectedSig);
    const b = new TextEncoder().encode(providedSig.trim().toLowerCase());
    let mismatch = a.length !== b.length ? 1 : 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) mismatch |= a[i] ^ b[i];
    if (mismatch !== 0) {
      console.warn("Invalid GoCardless webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody) as { events?: Record<string, unknown>[] };
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const events = body.events;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    for (const event of events) {
      const resourceType = String(event.resource_type ?? "unknown");
      const action = String(event.action ?? event.event_type ?? "unknown");
      const externalId = typeof event.id === "string" ? event.id : null;

      if (!externalId) {
        // Cannot dedupe without an id — skip
        continue;
      }

      // Idempotent insert: unique (source, external_id) constraint rejects duplicates atomically
      const { error: insErr } = await supabase.from("webhook_events").insert({
        source: "gocardless",
        event_type: `${resourceType}.${action}`,
        payload: event,
        external_id: externalId,
        processed: false,
      });

      if (insErr) {
        const code = (insErr as { code?: string }).code;
        if (code === "23505" || String(insErr.message ?? "").includes("duplicate")) {
          // Already processed
          continue;
        }
        console.error("webhook_events insert error:", insErr);
        continue;
      }

      if (resourceType === "mandates") {
        const mid = mandateGcId(event);
        const next = mapMandateStatus(action);
        if (mid && next) {
          await supabase.from("mandates").update({ status: next }).eq("gocardless_id", mid);
        }
      }

      if (resourceType === "payments") {
        const pid = paymentGcId(event);
        const next = mapPaymentStatus(action);
        if (pid && next) {
          await supabase.from("payments").update({ status: next }).eq("gocardless_payment_id", pid);
        }
      }

      await supabase
        .from("webhook_events")
        .update({ processed: true })
        .eq("source", "gocardless")
        .eq("external_id", externalId);
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
