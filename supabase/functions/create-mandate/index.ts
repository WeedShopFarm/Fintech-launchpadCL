import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gcApiBase, getGoCardlessToken } from "../_shared/gocardless.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const { customer_id, scheme } = body;

    if (!customer_id) {
      return new Response(JSON.stringify({ error: "customer_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: customer } = await adminClient
      .from("customers")
      .select("business_id, name, email, iban, gocardless_id, us_account_number, us_routing_number")
      .eq("id", customer_id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: business } = await adminClient
      .from("businesses")
      .select("id, mode")
      .eq("id", customer.business_id)
      .single();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mandateScheme = scheme || "sepa_core";
    let gocardlessId: string | null = null;
    let approvalUrl: string | null = null;

    const gcToken = await getGoCardlessToken(adminClient, business.id);
    if (gcToken) {
      const gcApiUrl = gcApiBase(business.mode);
      try {
        let customerBankAccountId: string | null = null;

        if (customer.gocardless_id) {
          const isAch = mandateScheme === "ach";
          const usAcct = (customer.us_account_number ?? "").replace(/\s/g, "");
          const usRoute = (customer.us_routing_number ?? "").replace(/\s/g, "");
          const ibanClean = (customer.iban ?? "").replace(/\s/g, "");

          let bankAccountPayload: Record<string, unknown>;

          if (isAch) {
            if (!usAcct || !/^\d{9}$/.test(usRoute)) {
              console.warn("ACH mandate requires us_account_number and 9-digit us_routing_number on the customer");
              bankAccountPayload = {};
            } else {
              bankAccountPayload = {
                account_holder_name: customer.name,
                account_number: usAcct,
                branch_code: usRoute,
                country_code: "US",
                currency: "USD",
                account_type: "checking",
                links: { customer: customer.gocardless_id },
              };
            }
          } else if (ibanClean.length > 0) {
            bankAccountPayload = {
              account_holder_name: customer.name,
              iban: ibanClean,
              country_code: ibanClean.slice(0, 2).toUpperCase(),
              currency: "EUR",
              links: { customer: customer.gocardless_id },
            };
          } else {
            bankAccountPayload = {};
          }

          if ("links" in bankAccountPayload) {
            const bankAccountResponse = await fetch(`${gcApiUrl}/customer_bank_accounts`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${business.gocardless_access_token}`,
                "Content-Type": "application/json",
                "GoCardless-Version": "2015-07-06",
              },
              body: JSON.stringify({ customer_bank_accounts: bankAccountPayload }),
            });

            if (bankAccountResponse.ok) {
              const bankAccountData = await bankAccountResponse.json();
              customerBankAccountId = bankAccountData.customer_bank_accounts.id;
            } else {
              const errText = await bankAccountResponse.text();
              console.warn("GoCardless bank account creation failed:", errText);
            }
          }
        }

        if (customerBankAccountId) {
          const mandateResponse = await fetch(`${gcApiUrl}/mandates`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${business.gocardless_access_token}`,
              "Content-Type": "application/json",
              "GoCardless-Version": "2015-07-06",
            },
            body: JSON.stringify({
              mandates: {
                scheme: mandateScheme,
                links: { customer_bank_account: customerBankAccountId },
              },
            }),
          });

          if (mandateResponse.ok) {
            const mandateData = await mandateResponse.json();
            gocardlessId = mandateData.mandates.id;
            approvalUrl = mandateData.mandates.links?.customer_approval?.href || null;
          } else {
            const errText = await mandateResponse.text();
            console.warn("GoCardless mandate creation failed:", errText);
          }
        }
      } catch (gcError) {
        console.error("GoCardless integration error:", gcError);
      }
    }

    const { data: mandate, error } = await adminClient.from("mandates").insert({
      customer_id,
      business_id: customer.business_id,
      status: "pending",
      gocardless_id: gocardlessId,
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      mandate,
      approval_url: approvalUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mandate creation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
